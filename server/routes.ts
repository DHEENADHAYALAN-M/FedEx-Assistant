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
