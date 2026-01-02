import {
  type Case, type Dca, type CaseNote, type UploadLog,
  type CreateCaseRequest, type UpdateCaseRequest,
  type CreateDcaRequest, type UpdateDcaRequest,
  type CreateNoteRequest,
  type DashboardStats
} from "@shared/schema";

export interface IStorage {
  getDcas(): Promise<Dca[]>;
  getDca(id: number): Promise<Dca | undefined>;
  getDcaByName(name: string): Promise<Dca | undefined>;
  getDcaByRegion(region: string): Promise<Dca[]>;
  createDca(dca: CreateDcaRequest): Promise<Dca>;
  updateDca(id: number, updates: UpdateDcaRequest): Promise<Dca>;
  getCases(filters?: { search?: string, status?: string, dcaId?: number }): Promise<(Case & { dcaName?: string })[]>;
  getCase(id: number): Promise<Case | undefined>;
  createCase(data: CreateCaseRequest): Promise<Case>;
  updateCase(id: number, updates: UpdateCaseRequest): Promise<Case>;
  getCaseNotes(caseId: number): Promise<CaseNote[]>;
  createCaseNote(note: CreateNoteRequest): Promise<CaseNote>;
  createUploadLog(log: any): Promise<UploadLog>;
  getUploadLogs(): Promise<UploadLog[]>;
  getDashboardStats(dcaId?: number): Promise<DashboardStats>;
}

export class MemStorage implements IStorage {
  private dcas: Map<number, Dca>;
  private cases: Map<number, Case>;
  private notes: Map<number, CaseNote>;
  private logs: Map<number, UploadLog>;
  private currentId: { [key: string]: number };

  constructor() {
    this.dcas = new Map();
    this.cases = new Map();
    this.notes = new Map();
    this.logs = new Map();
    this.currentId = { dcas: 1, cases: 1, notes: 1, logs: 1 };
  }

  async getDcas(): Promise<Dca[]> {
    return Array.from(this.dcas.values()).sort((a, b) => Number(b.slaScore) - Number(a.slaScore));
  }

  async getDca(id: number): Promise<Dca | undefined> {
    return this.dcas.get(id);
  }

  async getDcaByName(name: string): Promise<Dca | undefined> {
    return Array.from(this.dcas.values()).find(d => d.name === name);
  }

  async getDcaByRegion(region: string): Promise<Dca[]> {
    return Array.from(this.dcas.values()).filter(d => d.region === region);
  }

  async createDca(dca: CreateDcaRequest): Promise<Dca> {
    const id = this.currentId.dcas++;
    const newDca: Dca = {
      ...dca,
      id,
      activeCases: 0,
      recoveredCases: 0,
      slaScore: "100",
      createdAt: new Date()
    };
    this.dcas.set(id, newDca);
    return newDca;
  }

  async updateDca(id: number, updates: UpdateDcaRequest): Promise<Dca> {
    const dca = await this.getDca(id);
    if (!dca) throw new Error("DCA not found");
    const updated = { ...dca, ...updates };
    this.dcas.set(id, updated);
    return updated;
  }

  async getCases(filters?: { search?: string, status?: string, dcaId?: number }): Promise<(Case & { dcaName?: string })[]> {
    let allCases = Array.from(this.cases.values());
    
    if (filters?.status) allCases = allCases.filter(c => c.status === filters.status);
    if (filters?.dcaId) allCases = allCases.filter(c => c.assignedDcaId === filters.dcaId);
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      allCases = allCases.filter(c => 
        c.customerName.toLowerCase().includes(search) || 
        c.caseIdentifier.toLowerCase().includes(search)
      );
    }

    return allCases.map(c => ({
      ...c,
      dcaName: c.assignedDcaId ? this.dcas.get(c.assignedDcaId)?.name : undefined
    })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCase(id: number): Promise<Case | undefined> {
    return this.cases.get(id);
  }

  async createCase(data: CreateCaseRequest): Promise<Case> {
    const id = this.currentId.cases++;
    const newCase: Case = {
      ...data,
      id,
      aiRecoveryScore: null,
      aiPriority: null,
      aiFollowUpMessage: null,
      aiLastUpdatedAt: null,
      createdAt: new Date(),
      status: data.status || "New",
      priority: data.priority || "Low",
      assignedDcaId: data.assignedDcaId || null,
      slaDeadline: data.slaDeadline || null,
    };
    this.cases.set(id, newCase);
    return newCase;
  }

  async updateCase(id: number, updates: UpdateCaseRequest): Promise<Case> {
    const current = await this.getCase(id);
    if (!current) throw new Error("Case not found");
    const updated = { ...current, ...updates };
    this.cases.set(id, updated);
    return updated;
  }

  async getCaseNotes(caseId: number): Promise<CaseNote[]> {
    return Array.from(this.notes.values())
      .filter(n => n.caseId === caseId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createCaseNote(note: CreateNoteRequest): Promise<CaseNote> {
    const id = this.currentId.notes++;
    const newNote: CaseNote = {
      ...note,
      id,
      isSystemGenerated: note.isSystemGenerated || false,
      createdAt: new Date()
    };
    this.notes.set(id, newNote);
    return newNote;
  }

  async createUploadLog(log: any): Promise<UploadLog> {
    const id = this.currentId.logs++;
    const newLog: UploadLog = {
      ...log,
      id,
      recordsProcessed: log.recordsProcessed || 0,
      errorCount: log.errorCount || 0,
      createdAt: new Date()
    };
    this.logs.set(id, newLog);
    return newLog;
  }

  async getUploadLogs(): Promise<UploadLog[]> {
    return Array.from(this.logs.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getDashboardStats(dcaId?: number): Promise<DashboardStats> {
    let allCases = Array.from(this.cases.values());
    if (dcaId) allCases = allCases.filter(c => c.assignedDcaId === dcaId);

    const total = allCases.length;
    const pending = allCases.filter(c => !['Recovered', 'Escalated'].includes(c.status)).length;
    const recovered = allCases.filter(c => c.status === 'Recovered').length;
    const breaches = allCases.filter(c => 
      c.slaDeadline && c.slaDeadline < new Date() && !['Recovered', 'Escalated'].includes(c.status)
    ).length;

    const statusCounts: { [key: string]: number } = {};
    const dcaCounts: { [key: string]: number } = {};

    allCases.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      const dcaName = c.assignedDcaId ? this.dcas.get(c.assignedDcaId)?.name || 'Unassigned' : 'Unassigned';
      dcaCounts[dcaName] = (dcaCounts[dcaName] || 0) + 1;
    });

    return {
      totalCases: total,
      pendingCases: pending,
      recoveredCases: recovered,
      slaBreaches: breaches,
      casesByStatus: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      casesByDca: Object.entries(dcaCounts).map(([name, value]) => ({ name, value })),
      recoveryRate: total ? Math.round((recovered / total) * 100) : 0
    };
  }
}

export const storage = new MemStorage();
