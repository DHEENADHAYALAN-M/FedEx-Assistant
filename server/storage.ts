
import { db } from "./db";
import {
  dcas, cases, caseNotes, uploadLogs,
  type Case, type Dca, type CaseNote, type UploadLog,
  type CreateCaseRequest, type UpdateCaseRequest,
  type CreateDcaRequest, type UpdateDcaRequest,
  type CreateNoteRequest,
  type DashboardStats
} from "@shared/schema";
import { eq, desc, sql, and, like } from "drizzle-orm";

export interface IStorage {
  // DCAs
  getDcas(): Promise<Dca[]>;
  getDca(id: number): Promise<Dca | undefined>;
  getDcaByName(name: string): Promise<Dca | undefined>; // For auto-assignment
  getDcaByRegion(region: string): Promise<Dca[]>; // For auto-assignment
  createDca(dca: CreateDcaRequest): Promise<Dca>;
  updateDca(id: number, updates: UpdateDcaRequest): Promise<Dca>;

  // Cases
  getCases(filters?: { search?: string, status?: string, dcaId?: number }): Promise<(Case & { dcaName?: string })[]>;
  getCase(id: number): Promise<Case | undefined>;
  createCase(data: CreateCaseRequest): Promise<Case>;
  updateCase(id: number, updates: UpdateCaseRequest): Promise<Case>;
  
  // Notes
  getCaseNotes(caseId: number): Promise<CaseNote[]>;
  createCaseNote(note: CreateNoteRequest): Promise<CaseNote>;

  // Upload Logs
  createUploadLog(log: any): Promise<UploadLog>;
  getUploadLogs(): Promise<UploadLog[]>;

  // Stats
  getDashboardStats(dcaId?: number): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  async getDcas(): Promise<Dca[]> {
    return await db.select().from(dcas).orderBy(desc(dcas.slaScore));
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
    return updated;
  }

  async getCases(filters?: { search?: string, status?: string, dcaId?: number }): Promise<(Case & { dcaName?: string })[]> {
    const conditions = [];
    if (filters?.status) conditions.push(eq(cases.status, filters.status));
    if (filters?.dcaId) conditions.push(eq(cases.assignedDcaId, filters.dcaId));
    if (filters?.search) {
      conditions.push(
        sql`(${cases.customerName} ILIKE ${`%${filters.search}%`} OR ${cases.caseIdentifier} ILIKE ${`%${filters.search}%`})`
      );
    }

    const query = db
      .select({
        id: cases.id,
        caseIdentifier: cases.caseIdentifier,
        customerName: cases.customerName,
        amount: cases.amount,
        daysOverdue: cases.daysOverdue,
        region: cases.region,
        status: cases.status,
        priority: cases.priority,
        assignedDcaId: cases.assignedDcaId,
        slaDeadline: cases.slaDeadline,
        createdAt: cases.createdAt,
        dcaName: dcas.name
      })
      .from(cases)
      .leftJoin(dcas, eq(cases.assignedDcaId, dcas.id));

    if (conditions.length > 0) {
      // @ts-ignore
      return await query.where(and(...conditions)).orderBy(desc(cases.createdAt));
    }
    
    return await query.orderBy(desc(cases.createdAt));
  }

  async getCase(id: number): Promise<Case | undefined> {
    const [c] = await db.select().from(cases).where(eq(cases.id, id));
    return c;
  }

  async createCase(data: CreateCaseRequest): Promise<Case> {
    const [newCase] = await db.insert(cases).values(data).returning();
    return newCase;
  }

  async updateCase(id: number, updates: UpdateCaseRequest): Promise<Case> {
    const [updated] = await db.update(cases).set(updates).where(eq(cases.id, id)).returning();
    return updated;
  }

  async getCaseNotes(caseId: number): Promise<CaseNote[]> {
    return await db.select().from(caseNotes).where(eq(caseNotes.caseId, caseId)).orderBy(desc(caseNotes.createdAt));
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
    const conditions = dcaId ? [eq(cases.assignedDcaId, dcaId)] : [];
    
    // Total Cases
    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(and(...conditions));
      
    // Pending
    const [pending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(and(...conditions, sql`${cases.status} NOT IN ('Recovered', 'Escalated')`));

    // Recovered
    const [recovered] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(and(...conditions, eq(cases.status, 'Recovered')));

    // SLA Breaches (Deadline passed and not closed)
    const [breaches] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(and(
        ...conditions, 
        sql`${cases.slaDeadline} < NOW()`,
        sql`${cases.status} NOT IN ('Recovered', 'Escalated')`
      ));

    // Group by Status
    const byStatus = await db
      .select({ name: cases.status, value: sql<number>`count(*)` })
      .from(cases)
      .where(and(...conditions))
      .groupBy(cases.status);

    // Group by DCA
    const byDca = await db
      .select({ name: dcas.name, value: sql<number>`count(*)` })
      .from(cases)
      .leftJoin(dcas, eq(cases.assignedDcaId, dcas.id))
      .where(and(...conditions))
      .groupBy(dcas.name);

    return {
      totalCases: Number(total?.count || 0),
      pendingCases: Number(pending?.count || 0),
      recoveredCases: Number(recovered?.count || 0),
      slaBreaches: Number(breaches?.count || 0),
      casesByStatus: byStatus.map(s => ({ ...s, value: Number(s.value) })),
      casesByDca: byDca.map(d => ({ name: d.name || 'Unassigned', value: Number(d.value) })),
      recoveryRate: total?.count ? Math.round((Number(recovered?.count) / Number(total?.count)) * 100) : 0
    };
  }
}

export const storage = new DatabaseStorage();
