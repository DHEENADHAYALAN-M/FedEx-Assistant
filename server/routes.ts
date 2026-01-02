
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { addDays } from "date-fns";
import { db } from "./db";
import { uploadLogs } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === DASHBOARD ===
  app.get(api.dashboard.stats.path, async (req, res) => {
    const dcaId = req.query.dcaId ? Number(req.query.dcaId) : undefined;
    const stats = await storage.getDashboardStats(dcaId);
    res.json(stats);
  });

  // === DCAS ===
  app.get(api.dcas.list.path, async (req, res) => {
    const list = await storage.getDcas();
    res.json(list);
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
    } catch (e) {
      res.status(400).json({ message: "Invalid DCA data" });
    }
  });

  // === CASES ===
  app.get(api.cases.list.path, async (req, res) => {
    const { search, status, dcaId } = req.query;
    const list = await storage.getCases({
      search: search as string,
      status: status as string,
      dcaId: dcaId ? Number(dcaId) : undefined
    });
    res.json(list);
  });

  app.get(api.cases.get.path, async (req, res) => {
    const caseId = Number(req.params.id);
    const c = await storage.getCase(caseId);
    if (!c) return res.status(404).json({ message: "Case not found" });
    
    const dca = c.assignedDcaId ? await storage.getDca(c.assignedDcaId) : undefined;
    const notes = await storage.getCaseNotes(caseId);
    
    res.json({ ...c, dca, notes });
  });

  app.put(api.cases.update.path, async (req, res) => {
    const updated = await storage.updateCase(Number(req.params.id), req.body);
    
    // Auto-log status change
    if (req.body.status) {
      await storage.createCaseNote({
        caseId: updated.id,
        note: `Status updated to ${req.body.status}`,
        isSystemGenerated: true
      });
    }

    res.json(updated);
  });

  // === IMPORT (SMART AUTOMATION ENGINE) ===
  app.post(api.cases.import.path, async (req, res) => {
    try {
      const { filename, cases } = req.body;
      let processed = 0;
      let errors = 0;

      // Log start
      const log = await storage.createUploadLog({
        filename,
        status: "Processing",
        recordsProcessed: 0,
        errorCount: 0
      });

      // AI/Logic Placeholder: "Smart Assignment Engine"
      // In a real AI app, we would call OpenAI here to analyze risk/priority.
      // For now, we use Rule-Based Logic as requested.

      for (const row of cases) {
        try {
          const amount = Number(row.Amount);
          const daysOverdue = Number(row.Days_Overdue);
          
          // 1. Assign Priority
          let priority = "Low";
          if (amount > 50000 || daysOverdue > 60) priority = "High";
          else if (amount > 20000) priority = "Medium";

          // 2. Assign DCA (Smart Routing)
          // Find DCAs in the region
          const regionDcas = await storage.getDcaByRegion(row.Region);
          let assignedDcaId: number | null = null;
          
          if (regionDcas.length > 0) {
            // Simple load balancing: pick random or first for now
            // Future: Use "Active Cases" to find least busy
            assignedDcaId = regionDcas[0].id; 
          }

          // 3. Set SLA Deadline
          const today = new Date();
          let slaDays = 30;
          if (priority === "High") slaDays = 7;
          else if (priority === "Medium") slaDays = 14;
          
          const slaDeadline = addDays(today, slaDays);

          // Create Case
          const newCase = await storage.createCase({
            caseIdentifier: String(row.Case_ID),
            customerName: row.Customer_Name,
            amount: String(amount),
            daysOverdue: daysOverdue,
            region: row.Region,
            status: row.Status || "Assigned",
            priority,
            assignedDcaId,
            slaDeadline
          });

          // Log auto-assignment
          if (assignedDcaId) {
            await storage.createCaseNote({
              caseId: newCase.id,
              note: `System: Auto-assigned to DCA (ID: ${assignedDcaId}) based on region ${row.Region}`,
              isSystemGenerated: true
            });
          }

          processed++;
        } catch (err) {
          console.error("Import error for row", row, err);
          errors++;
        }
      }

      // Update log
      await db.update(uploadLogs).set({
        status: errors === 0 ? "Success" : "Partial",
        recordsProcessed: processed,
        errorCount: errors
      }).where(eq(uploadLogs.id, log.id));

      res.json({ processed, success: true, message: `Processed ${processed} cases with ${errors} errors.` });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Import failed" });
    }
  });

  // === NOTES ===
  app.post(api.notes.create.path, async (req, res) => {
    const note = await storage.createCaseNote({
      caseId: Number(req.params.id),
      note: req.body.note,
      isSystemGenerated: false
    });
    res.status(201).json(note);
  });

  app.get(api.uploadLogs.list.path, async (req, res) => {
    const logs = await storage.getUploadLogs();
    res.json(logs);
  });

  // === SEED DATA ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingDcas = await storage.getDcas();
  if (existingDcas.length === 0) {
    console.log("Seeding database...");
    
    const dca1 = await storage.createDca({
      name: "Alpha Collections",
      region: "North"
    });
    
    const dca2 = await storage.createDca({
      name: "Omega Recovery",
      region: "South"
    });

    const dca3 = await storage.createDca({
      name: "Global Debt Solvers",
      region: "East"
    });

    // Seed some cases
    await storage.createCase({
      caseIdentifier: "CASE-1001",
      customerName: "Acme Corp",
      amount: "55000",
      daysOverdue: 65,
      region: "North",
      status: "In Progress",
      priority: "High",
      assignedDcaId: dca1.id,
      slaDeadline: new Date(Date.now() + 86400000 * 5) // 5 days from now
    });

    await storage.createCase({
      caseIdentifier: "CASE-1002",
      customerName: "John Doe",
      amount: "1500",
      daysOverdue: 10,
      region: "South",
      status: "New",
      priority: "Low",
      assignedDcaId: dca2.id,
      slaDeadline: new Date(Date.now() + 86400000 * 25)
    });
  }
}
