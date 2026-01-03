import type { Express } from "express";
import type { Server } from "http";
import { addDays } from "date-fns";

import { storage } from "./storage";
import { api } from "@shared/routes";

import {
  aiRecoveryPrediction,
  testAIConnection,
} from "./aiService.js";
import { i } from "node_modules/vite/dist/node/chunks/moduleRunnerTransport.js";

/**
 * Register all API routes
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ===============================
  // ADMIN – AI STATUS
  // ===============================
  app.get("/api/admin/ai-status", async (_req, res) => {
    const status = await testAIConnection();
    res.json(status);
  });

  // ===============================
  // DASHBOARD
  // ===============================
  app.get(api.dashboard.stats.path, async (req, res) => {
    const dcaId = req.query.dcaId ? Number(req.query.dcaId) : undefined;
    const stats = await storage.getDashboardStats(dcaId);
    res.json(stats);
  });

  // ===============================
  // DCAs
  // ===============================
  app.get(api.dcas.list.path, async (_req, res) => {
    res.json(await storage.getDcas());
  });

  app.get(api.dcas.get.path, async (req, res) => {
    const dca = await storage.getDca(Number(req.params.id));
    if (!dca) return res.status(404).json({ message: "DCA not found" });
    res.json(dca);
  });

  app.post(api.dcas.create.path, async (req, res) => {
    try {
      const dca = await storage.createDca(req.body);
      res.status(201).json(dca);
    } catch {
      res.status(400).json({ message: "Invalid DCA data" });
    }
  });

  // ===============================
  // CASES
  // ===============================
  app.get(api.cases.list.path, async (req, res) => {
    const { search, status, dcaId } = req.query;

    const cases = await storage.getCases({
      search: search as string,
      status: status as string,
      dcaId: dcaId ? Number(dcaId) : undefined,
    });

    res.json(cases);
  });

  app.get(api.cases.get.path, async (req, res) => {
    const caseId = Number(req.params.id);
    const c = await storage.getCase(caseId);
    if (!c) return res.status(404).json({ message: "Case not found" });

    const dca =
      c.assignedDcaId !== null && c.assignedDcaId !== undefined
        ? await storage.getDca(c.assignedDcaId)
        : undefined;

    const notes = await storage.getCaseNotes(caseId);
    res.json({ ...c, dca, notes });
  });

  app.put(api.cases.update.path, async (req, res) => {
    const updated = await storage.updateCase(Number(req.params.id), req.body);

    if (req.body.status) {
      await storage.createCaseNote({
        caseId: updated.id,
        note: `Status updated to ${req.body.status}`,
        isSystemGenerated: true,
      });
    }

    res.json(updated);
  });

  // ===============================
  // EXCEL IMPORT (WITH AI)
  // ===============================
  app.post(api.cases.import.path, async (req, res) => {
    try {
      const { filename, cases } = req.body;
      let processed = 0;
      let errors = 0;

      await storage.createUploadLog({
        filename,
        status: "Processing",
        recordsProcessed: 0,
        errorCount: 0,
      });

      for (const row of cases) {
        try {
          const amount = Number(row.Amount);
          const daysOverdue = Number(row.Days_Overdue);

          let priority = "Low";
          if (amount > 50000 || daysOverdue > 60) priority = "High";
          else if (amount > 20000) priority = "Medium";

          const regionDcas = await storage.getDcaByRegion(row.Region);
          const assignedDcaId = regionDcas.length
            ? regionDcas[0].id
            : undefined;

          let slaDays = 30;
          if (priority === "High") slaDays = 7;
          else if (priority === "Medium") slaDays = 14;

          const newCase = await storage.createCase({
            caseIdentifier: String(row.Case_ID),
            customerName: row.Customer_Name,
            amount: String(amount),
            daysOverdue,
            region: row.Region,
            status: row.Status || "Assigned",
            priority,
            assignedDcaId,
            slaDeadline: addDays(new Date(), slaDays),
          });

          // ===============================
          // AI ENRICHMENT
          // ===============================
          const aiScore = await aiRecoveryPrediction({
            amount,
            daysOverdue,
            status: newCase.status,
          });

          await storage.updateCase(newCase.id, {
            aiRecoveryScore: aiScore,
            aiLastUpdatedAt: new Date(),
          });

          if (assignedDcaId) {
            await storage.createCaseNote({
              caseId: newCase.id,
              note: `System: Auto-assigned to DCA ${assignedDcaId} (Region ${row.Region})`,
              isSystemGenerated: true,
            });
          }

          processed++;
        } catch (err) {
          console.error("Import error:", err);
          errors++;
        }
      }

      await storage.createUploadLog({
        filename,
        status: errors === 0 ? "Success" : "Partial",
        recordsProcessed: processed,
        errorCount: errors,
      });

      res.json({
        success: true,
        processed,
        message: `Processed ${processed} cases (${errors} errors)`,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Import failed" });
    }
  });

  // ===============================
  // NOTES
  // ===============================
  app.post(api.notes.create.path, async (req, res) => {
    const note = await storage.createCaseNote({
      caseId: Number(req.params.id),
      note: req.body.note,
      isSystemGenerated: false,
    });
    res.status(201).json(note);
  });

  app.get(api.uploadLogs.list.path, async (_req, res) => {
    res.json(await storage.getUploadLogs());
  });

  // ===============================
  // SEED DATA
  // ===============================
  await seedDatabase();

  return httpServer;
}

/**
 * Seed initial data (memory only)
 */
async function seedDatabase() {
  if ((await storage.getDcas()).length > 0) return;

  console.log("Seeding memory storage...");

  const north = await storage.createDca({ name: "Alpha Collections", region: "North" });
  const south = await storage.createDca({ name: "Omega Recovery", region: "South" });
  const east = await storage.createDca({ name: "Global Debt Solvers", region: "East" });

  await storage.createCase({
    caseIdentifier: "CASE-1001",
    customerName: "Acme Corp",
    amount: "55000",
    daysOverdue: 65,
    region: "North",
    status: "In Progress",
    priority: "High",
    assignedDcaId: north.id,
    slaDeadline: addDays(new Date(), 5),
  });

  await storage.createCase({
    caseIdentifier: "CASE-1002",
    customerName: "John Doe",
    amount: "1500",
    daysOverdue: 10,
    region: "South",
    status: "New",
    priority: "Low",
    assignedDcaId: south.id,
    slaDeadline: addDays(new Date(), 25),
  });
}
