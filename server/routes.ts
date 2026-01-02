import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { addDays } from "date-fns";

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
    
    const dca = c.assignedDcaId !== null && c.assignedDcaId !== undefined ? await storage.getDca(c.assignedDcaId) : undefined;
    const notes = await storage.getCaseNotes(caseId);
    
    res.json({ ...c, dca, notes });
  });

  app.put(api.cases.update.path, async (req, res) => {
    const updated = await storage.updateCase(Number(req.params.id), req.body);
    
    if (req.body.status) {
      await storage.createCaseNote({
        caseId: updated.id,
        note: `Status updated to ${req.body.status}`,
        isSystemGenerated: true
      });
    }

    res.json(updated);
  });

  // === IMPORT ===
  app.post(api.cases.import.path, async (req, res) => {
    try {
      const { filename, cases } = req.body;
      let processed = 0;
      let errors = 0;

      const log = await storage.createUploadLog({
        filename,
        status: "Processing",
        recordsProcessed: 0,
        errorCount: 0
      });

      for (const row of cases) {
        try {
          const amount = Number(row.Amount);
          const daysOverdue = Number(row.Days_Overdue);
          
          let priority = "Low";
          if (amount > 50000 || daysOverdue > 60) priority = "High";
          else if (amount > 20000) priority = "Medium";

          const regionDcas = await storage.getDcaByRegion(row.Region);
          let assignedDcaId: number | null = null;
          
          if (regionDcas.length > 0) {
            assignedDcaId = regionDcas[0].id; 
          }

          const today = new Date();
          let slaDays = 30;
          if (priority === "High") slaDays = 7;
          else if (priority === "Medium") slaDays = 14;
          
          const slaDeadline = addDays(today, slaDays);

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

      await storage.createUploadLog({
        filename,
        status: errors === 0 ? "Success" : "Partial",
        recordsProcessed: processed,
        errorCount: errors
      });

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

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingDcas = await storage.getDcas();
  if (existingDcas.length === 0) {
    console.log("Seeding memory storage...");
    
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

    await storage.createCase({
      caseIdentifier: "CASE-1001",
      customerName: "Acme Corp",
      amount: "55000",
      daysOverdue: 65,
      region: "North",
      status: "In Progress",
      priority: "High",
      assignedDcaId: dca1.id,
      slaDeadline: new Date(Date.now() + 86400000 * 5)
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
