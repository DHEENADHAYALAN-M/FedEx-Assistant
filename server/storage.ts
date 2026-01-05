import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { eq, or, ilike, desc, sql, and, lt } from 'drizzle-orm';
import { aiRecoveryPrediction } from "./aiService";
import {
  type Dca,
  type Case,
  type CaseNote,
  type UploadLog,
  type CreateDcaRequest,
  type UpdateDcaRequest,
  type CreateCaseRequest,
  type UpdateCaseRequest,
  type CreateNoteRequest,
  type DashboardStats,
  dcas,
  cases,
  caseNotes,
  uploadLogs
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

export interface IStorage {
  getDcas(): Promise<(Dca & { activeCases: number; recoveredCases: number })[]>;
  getDca(id: number): Promise<Dca | undefined>;
  getDcaByName(name: string): Promise<Dca | undefined>;
  getDcaByRegion(region: string): Promise<Dca[]>;
  createDca(dca: CreateDcaRequest): Promise<Dca>;
  updateDca(id: number, updates: UpdateDcaRequest): Promise<Dca>;
  getCases(filters?: { search?: string; status?: string; dcaId?: number }): Promise<(Case & { dcaName?: string })[]>;
  getCase(id: number): Promise<Case | undefined>;
  getCaseByIdentifier(identifier: string): Promise<Case | undefined>;
  createCase(data: CreateCaseRequest): Promise<Case>;
  updateCase(id: number, updates: UpdateCaseRequest): Promise<Case>;
  getCaseNotes(caseId: number): Promise<CaseNote[]>;
  createCaseNote(note: CreateNoteRequest): Promise<CaseNote>;
  createUploadLog(log: any): Promise<UploadLog>;
  getUploadLogs(): Promise<UploadLog[]>;
  getDashboardStats(dcaId?: number): Promise<DashboardStats>;
  clearAllCases(): Promise<void>;
}

export class PostgresStorage implements IStorage {
  async getDcas(): Promise<(Dca & { activeCases: number; recoveredCases: number })[]> {
    const allDcas = await db.select().from(dcas);
    const results = await Promise.all(allDcas.map(async (dca) => {
      const dcaCases = await db.select().from(cases).where(eq(cases.assignedDcaId, dca.id));
      const active = dcaCases.filter(c => !["Recovered", "Escalated"].includes(c.status)).length;
      const recovered = dcaCases.filter(c => c.status === "Recovered").length;
      return { ...dca, activeCases: active, recoveredCases: recovered, slaScore: dca.slaScore ?? "100" };
    }));
    return results.sort((a, b) => Number(b.slaScore) - Number(a.slaScore));
  }

  async getDca(id: number): Promise<Dca | undefined> {
    const [dca] = await db.select().from(dcas).where(eq(dcas.id, id));
    return dca;
  }

  async getDcaByName(name: string): Promise<Dca | undefined> {
    const [dca] = await db.select().from(dcas).where(eq(dcas.name, name));
    return dca;
  }

  async getDcaByRegion(region: string): Promise<Dca[]> {
    return await db.select().from(dcas).where(eq(dcas.region, region));
  }

  async createDca(dca: CreateDcaRequest): Promise<Dca> {
    const [newDca] = await db.insert(dcas).values(dca).returning();
    return newDca;
  }

  async updateDca(id: number, updates: UpdateDcaRequest): Promise<Dca> {
    const [updated] = await db.update(dcas).set(updates).where(eq(dcas.id, id)).returning();
    if (!updated) throw new Error("DCA not found");
    return updated;
  }

  async getCases(filters?: { search?: string; status?: string; dcaId?: number }): Promise<(Case & { dcaName?: string })[]> {
    let query = db.select({
      case: cases,
      dcaName: dcas.name
    }).from(cases).leftJoin(dcas, eq(cases.assignedDcaId, dcas.id));

    const conditions = [];
    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(cases.status, filters.status));
    }
    if (filters?.dcaId) {
      conditions.push(eq(cases.assignedDcaId, filters.dcaId));
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(cases.customerName, `%${filters.search}%`),
        ilike(cases.caseIdentifier, `%${filters.search}%`)
      ));
    }

    const results = await (conditions.length > 0 
      ? query.where(and(...conditions))
      : query).orderBy(desc(cases.createdAt));

    return results.map(r => ({ ...r.case, dcaName: r.dcaName ?? undefined }));
  }

  async getCase(id: number): Promise<Case | undefined> {
    const [c] = await db.select().from(cases).where(eq(cases.id, id));
    return c;
  }

  async getCaseByIdentifier(identifier: string): Promise<Case | undefined> {
    const [c] = await db.select().from(cases).where(eq(cases.caseIdentifier, identifier));
    return c;
  }

  async createCase(data: CreateCaseRequest): Promise<Case> {
    const now = new Date();
    const insertData: any = { 
      ...data, 
      createdAt: (data as any).createdAt || now, 
      lastUpdatedAt: now 
    };

    try {
      const recoveryScore = await aiRecoveryPrediction({ 
        amount: Number(data.amount), 
        daysOverdue: data.daysOverdue, 
        status: data.status || "New" 
      });
      insertData.aiRecoveryScore = recoveryScore;
      insertData.aiLastUpdatedAt = now;
    } catch (error) {
      console.warn("AI recovery prediction failed", error);
    }

    const [newCase] = await db.insert(cases).values(insertData).returning();
    return newCase;
  }

  async updateCase(id: number, updates: UpdateCaseRequest): Promise<Case> {
    const [updated] = await db.update(cases)
      .set({ ...updates, lastUpdatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    if (!updated) throw new Error("Case not found");
    return updated;
  }

  async getCaseNotes(caseId: number): Promise<CaseNote[]> {
    return await db.select()
      .from(caseNotes)
      .where(eq(caseNotes.caseId, caseId))
      .orderBy(desc(caseNotes.createdAt));
  }

  async createCaseNote(note: CreateNoteRequest): Promise<CaseNote> {
    const [newNote] = await db.insert(caseNotes).values(note).returning();
    return newNote;
  }

  async createUploadLog(log: any): Promise<UploadLog> {
    const [newLog] = await db.insert(uploadLogs).values(log).returning();
    return newLog;
  }

  async getUploadLogs(): Promise<UploadLog[]> {
    return await db.select().from(uploadLogs).orderBy(desc(uploadLogs.createdAt));
  }

  async getDashboardStats(dcaId?: number): Promise<DashboardStats> {
    const allCases = dcaId 
      ? await db.select().from(cases).where(eq(cases.assignedDcaId, dcaId))
      : await db.select().from(cases);

    const total = allCases.length;
    const pending = allCases.filter(c => !["Recovered", "Escalated"].includes(c.status)).length;
    const recovered = allCases.filter(c => c.status === "Recovered").length;
    const breaches = allCases.filter(c => c.slaDeadline && c.slaDeadline < new Date() && !["Recovered", "Escalated"].includes(c.status)).length;
    
    const statusCounts: Record<string, number> = {};
    const dcaCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = { "High": 0, "Medium": 0, "Low": 0 };
    
    const allDcas = await db.select().from(dcas);
    const dcaMap = new Map(allDcas.map(d => [d.id, d.name]));

    allCases.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      priorityCounts[c.priority] = (priorityCounts[c.priority] || 0) + 1;
      const dcaName = c.assignedDcaId ? dcaMap.get(c.assignedDcaId) || "Unassigned" : "Unassigned";
      dcaCounts[dcaName] = (dcaCounts[dcaName] || 0) + 1;
    });

    return {
      totalCases: total,
      pendingCases: pending,
      recoveredCases: recovered,
      slaBreaches: breaches,
      casesByStatus: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      casesByDca: Object.entries(dcaCounts).map(([name, value]) => ({ name, value })),
      casesByPriority: Object.entries(priorityCounts).map(([name, value]) => ({ name, value })),
      recoveryRate: total ? Math.round((recovered / total) * 100) : 0
    };
  }

  async clearAllCases(): Promise<void> {
    await db.delete(cases);
  }
}

export const storage = new PostgresStorage();
