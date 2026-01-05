import type { Express } from "express";
import type { Server } from "http";
import { addDays } from "date-fns";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { testAIConnection } from "./aiService";

export async function registerRoutes(
  _httpServer: Server,
  app: Express
): Promise<Server> {

  // ---------- AI STATUS ----------
  app.get("/api/admin/ai-status", async (_req, res) => {
    res.json(await testAIConnection());
  });

  // ---------- DASHBOARD ----------
  app.get(api.dashboard.stats.path, async (req, res) => {
    const dcaId = req.query.dcaId ? Number(req.query.dcaId) : undefined;
    res.json(await storage.getDashboardStats(dcaId));
  });

  // ---------- DCAs ----------
  app.get(api.dcas.list.path, async (_req, res) => {
    res.json(await storage.getDcas());
  });

  app.post(api.dcas.create.path, async (req, res) => {
    res.status(201).json(await storage.createDca(req.body));
  });

  // ---------- CASES ----------
  app.get(api.cases.list.path, async (req, res) => {
    res.json(
      await storage.getCases({
        search: req.query.search as string,
        status: req.query.status as string,
        dcaId: req.query.dcaId ? Number(req.query.dcaId) : undefined,
      })
    );
  });

  app.get(api.cases.get.path, async (req, res) => {
    const c = await storage.getCase(Number(req.params.id));
    if (!c) return res.status(404).json({ message: "Case not found" });
    res.json(c);
  });

  app.put(api.cases.update.path, async (req, res) => {
    res.json(await storage.updateCase(Number(req.params.id), req.body));
  });

  // ---------- NOTES ----------
  app.post(api.notes.create.path, async (req, res) => {
    res.status(201).json(
      await storage.createCaseNote({
        caseId: Number(req.params.id),
        note: req.body.note,
        isSystemGenerated: false,
      })
    );
  });

  // ---------- UPLOAD LOGS ----------
  app.get(api.uploadLogs.list.path, async (_req, res) => {
    res.json(await storage.getUploadLogs());
  });

  // ---------- IMPORT ----------
  app.post(api.cases.import.path, async (req, res) => {
    const { filename, cases: casesData } = req.body;
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    const now = new Date();
    const dcas = await storage.getDcas();

    for (const row of casesData) {
      try {
        // Check if case already exists by caseIdentifier
        const existingCase = await storage.getCaseByIdentifier(String(row.Case_ID));
        if (existingCase) {
          skippedCount++;
          continue;
        }

        // Automatic DCA Assignment based on region
        const regionalDcas = dcas.filter(d => d.region === String(row.Region));
        let assignedDcaId = null;
        
        if (regionalDcas.length > 0) {
          // Simplistic workload assignment: pick DCA with fewest active cases
          assignedDcaId = regionalDcas.sort((a, b) => a.activeCases - b.activeCases)[0].id;
        }

        await storage.createCase({
          caseIdentifier: String(row.Case_ID),
          customerName: String(row.Customer_Name),
          amount: String(row.Amount),
          daysOverdue: Number(row.Days_Overdue),
          region: String(row.Region),
          status: row.Status || "New",
          priority: "Low",
          assignedDcaId,
          createdAt: now
        } as any);
        successCount++;
      } catch (error) {
        console.error("Error importing row:", error);
        errorCount++;
      }
    }

    await storage.createUploadLog({
      filename,
      status: errorCount === 0 ? "Success" : (successCount > 0 ? "Partial" : "Failed"),
      recordsProcessed: successCount,
      errorCount
    });

    res.json({
      processed: successCount,
      skipped: skippedCount,
      success: successCount > 0 || skippedCount > 0,
      message: `Imported ${successCount} cases, skipped ${skippedCount} duplicates, with ${errorCount} errors.`
    });
  });

  // 🌱 Seed ONCE, SAFE
  await seedDatabaseIfEmpty();

  return _httpServer;
}

async function seedDatabaseIfEmpty() {
  const existing = await storage.getCases();
  if (existing.length > 0) {
    console.log("✅ Database already seeded, skipping");
    return;
  }

  console.log("🌱 Seeding database...");

  const north = await storage.createDca({ name: "Alpha Collections", region: "North" });
  const south = await storage.createDca({ name: "Omega Recovery", region: "South" });

  await storage.createCase({
    caseIdentifier: "CASE-1001",
    customerName: "Acme Corp",
    amount: "55000",
    daysOverdue: 65,
    region: "North",
    priority: "High",
    status: "In Progress",
    assignedDcaId: north.id,
    slaDeadline: addDays(new Date(), 5),
    __skipAI: true, // 🔕 IMPORTANT
  } as any);

  await storage.createCase({
    caseIdentifier: "CASE-1002",
    customerName: "John Doe",
    amount: "1500",
    daysOverdue: 10,
    region: "South",
    priority: "Low",
    status: "New",
    assignedDcaId: south.id,
    slaDeadline: addDays(new Date(), 25),
    __skipAI: true,
  } as any);
}
