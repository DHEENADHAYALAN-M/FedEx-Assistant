import mongoose from "mongoose";
import { storage, initializeStorage } from "./storage";

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.log("MONGODB_URI not set, skipping seeding or using memory storage");
  }

  await initializeStorage();

  // Check if we already have data
  const existingDcas = await storage.getDcas();
  if (existingDcas.length > 0) {
    console.log("Database already seeded");
    process.exit(0);
  }

  console.log("Seeding database...");

  const dca1 = await storage.createDca({ name: "Global Recovery Solutions", region: "North America" });
  const dca2 = await storage.createDca({ name: "Apex Collections", region: "Europe" });
  const dca3 = await storage.createDca({ name: "Pacific Credit", region: "APAC" });

  const sampleCases = [
    {
      caseIdentifier: "FEDEX-001",
      customerName: "TechCorp Industries",
      amount: "5250.00",
      daysOverdue: 45,
      region: "North America",
      status: "Active",
      priority: "High",
      assignedDcaId: dca1.id,
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    {
      caseIdentifier: "FEDEX-002",
      customerName: "Global Logistics Ltd",
      amount: "12400.50",
      daysOverdue: 12,
      region: "Europe",
      status: "New",
      priority: "Medium",
      assignedDcaId: dca2.id,
      slaDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    },
    {
      caseIdentifier: "FEDEX-003",
      customerName: "Sunrise Trading",
      amount: "850.00",
      daysOverdue: 95,
      region: "APAC",
      status: "Escalated",
      priority: "High",
      assignedDcaId: dca3.id,
      slaDeadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      caseIdentifier: "FEDEX-004",
      customerName: "Oceanic Ventures",
      amount: "3100.00",
      daysOverdue: 30,
      region: "North America",
      status: "Recovered",
      priority: "Low",
      assignedDcaId: dca1.id,
      slaDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    }
  ];

  for (const c of sampleCases) {
    await storage.createCase(c);
  }

  console.log("Seeding completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
