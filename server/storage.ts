import mongoose, { Schema, Document } from "mongoose";
import { aiRecoveryPrediction } from "./aiService";
import {
  type Case,
  type Dca,
  type CaseNote,
  type UploadLog,
  type CreateCaseRequest,
  type UpdateCaseRequest,
  type CreateDcaRequest,
  type UpdateDcaRequest,
  type CreateNoteRequest,
  type DashboardStats
} from "@shared/schema";

// --- Mongoose Schemas ---

const DcaSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  region: { type: String, required: true },
  activeCases: { type: Number, default: 0 },
  recoveredCases: { type: Number, default: 0 },
  slaScore: { type: String, default: "100" },
  createdAt: { type: Date, default: Date.now }
});

const CaseSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  caseIdentifier: { type: String, required: true },
  customerName: { type: String, required: true },
  amount: { type: String, required: true },
  daysOverdue: { type: Number, required: true },
  region: { type: String, required: true },
  status: { type: String, default: "New" },
  priority: { type: String, default: "Low" },
  assignedDcaId: { type: Number, default: null },
  slaDeadline: { type: Date, default: null },
  aiRecoveryScore: { type: Number, default: null },
  aiPriority: { type: String, default: null },
  aiFollowUpMessage: { type: String, default: null },
  aiLastUpdatedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

const NoteSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  caseId: { type: Number, required: true },
  note: { type: String, required: true },
  isSystemGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const LogSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  filename: { type: String, required: true },
  status: { type: String, required: true },
  recordsProcessed: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const DcaModel = mongoose.model("Dca", DcaSchema);
const CaseModel = mongoose.model("Case", CaseSchema);
const NoteModel = mongoose.model("Note", NoteSchema);
const LogModel = mongoose.model("Log", LogSchema);
const CounterModel = mongoose.model("Counter", CounterSchema);

async function getNextId(name: string): Promise<number> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

export interface IStorage {
  getDcas(): Promise<Dca[]>;
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

export class MemStorage implements IStorage {
  private dcas = new Map<number, Dca>();
  private cases = new Map<number, Case>();
  private notes = new Map<number, CaseNote>();
  private logs = new Map<number, UploadLog>();
  private currentId = { dcas: 1, cases: 1, notes: 1, logs: 1 };

  async getDcas(): Promise<Dca[]> {
    return Array.from(this.dcas.values()).sort((a, b) => Number(b.slaScore) - Number(a.slaScore));
  }
  async getDca(id: number): Promise<Dca | undefined> { return this.dcas.get(id); }
  async getDcaByName(name: string): Promise<Dca | undefined> {
    return Array.from(this.dcas.values()).find(d => d.name === name);
  }
  async getDcaByRegion(region: string): Promise<Dca[]> {
    return Array.from(this.dcas.values()).filter(d => d.region === region);
  }
  async createDca(dca: CreateDcaRequest): Promise<Dca> {
    const id = this.currentId.dcas++;
    const newDca: Dca = { ...dca, id, activeCases: 0, recoveredCases: 0, slaScore: "100", createdAt: new Date() };
    this.dcas.set(id, newDca);
    return newDca;
  }
  async updateDca(id: number, updates: UpdateDcaRequest): Promise<Dca> {
    const dca = this.dcas.get(id);
    if (!dca) throw new Error("DCA not found");
    const updated = { ...dca, ...updates };
    this.dcas.set(id, updated);
    return updated;
  }
  async getCases(filters?: { search?: string; status?: string; dcaId?: number }): Promise<(Case & { dcaName?: string })[]> {
    let allCases = Array.from(this.cases.values());
    if (filters?.status && filters.status !== "all") allCases = allCases.filter(c => c.status === filters.status);
    if (filters?.dcaId) allCases = allCases.filter(c => c.assignedDcaId === filters.dcaId);
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      allCases = allCases.filter(c => c.customerName.toLowerCase().includes(search) || c.caseIdentifier.toLowerCase().includes(search));
    }
    return allCases.map(c => ({ ...c, dcaName: c.assignedDcaId ? this.dcas.get(c.assignedDcaId)?.name : undefined })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async getCase(id: number): Promise<Case | undefined> { return this.cases.get(id); }
  async getCaseByIdentifier(identifier: string): Promise<Case | undefined> {
    return Array.from(this.cases.values()).find(c => c.caseIdentifier === identifier);
  }
  async createCase(data: CreateCaseRequest): Promise<Case> {
    const id = this.currentId.cases++;
    const newCase: Case = { ...data, id, aiRecoveryScore: null, aiPriority: null, aiFollowUpMessage: null, aiLastUpdatedAt: null, createdAt: new Date(), status: data.status || "New", priority: data.priority || "Low", assignedDcaId: data.assignedDcaId || null, slaDeadline: data.slaDeadline || null };
    try {
      const recoveryScore = await aiRecoveryPrediction({ amount: Number(data.amount), daysOverdue: data.daysOverdue, status: newCase.status });
      newCase.aiRecoveryScore = recoveryScore;
      newCase.aiLastUpdatedAt = new Date();
    } catch (error) { console.warn("AI recovery prediction failed", error); }
    this.cases.set(id, newCase);
    return newCase;
  }
  async updateCase(id: number, updates: UpdateCaseRequest): Promise<Case> {
    const current = this.cases.get(id);
    if (!current) throw new Error("Case not found");
    const updated = { ...current, ...updates };
    this.cases.set(id, updated);
    return updated;
  }
  async getCaseNotes(caseId: number): Promise<CaseNote[]> {
    return Array.from(this.notes.values()).filter(n => n.caseId === caseId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async createCaseNote(note: CreateNoteRequest): Promise<CaseNote> {
    const id = this.currentId.notes++;
    const newNote: CaseNote = { ...note, id, isSystemGenerated: note.isSystemGenerated || false, createdAt: new Date() };
    this.notes.set(id, newNote);
    return newNote;
  }
  async createUploadLog(log: any): Promise<UploadLog> {
    const id = this.currentId.logs++;
    const newLog: UploadLog = { ...log, id, recordsProcessed: log.recordsProcessed || 0, errorCount: log.errorCount || 0, createdAt: new Date() };
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
    const pending = allCases.filter(c => !["Recovered", "Escalated"].includes(c.status)).length;
    const recovered = allCases.filter(c => c.status === "Recovered").length;
    const breaches = allCases.filter(c => c.slaDeadline && c.slaDeadline < new Date() && !["Recovered", "Escalated"].includes(c.status)).length;
    const statusCounts: Record<string, number> = {};
    const dcaCounts: Record<string, number> = {};
    allCases.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      const dcaName = c.assignedDcaId ? this.dcas.get(c.assignedDcaId)?.name || "Unassigned" : "Unassigned";
      dcaCounts[dcaName] = (dcaCounts[dcaName] || 0) + 1;
    });
    return {
      totalCases: total, pendingCases: pending, recoveredCases: recovered, slaBreaches: breaches,
      casesByStatus: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      casesByDca: Object.entries(dcaCounts).map(([name, value]) => ({ name, value })),
      recoveryRate: total ? Math.round((recovered / total) * 100) : 0
    };
  }

  async clearAllCases(): Promise<void> {
    this.cases.clear();
    this.currentId.cases = 1;
  }
}

export class MongoStorage implements IStorage {
  async getDcas(): Promise<Dca[]> {
    const docs = await DcaModel.find().sort("-slaScore");
    return docs.map(d => d.toObject());
  }
  async getDca(id: number): Promise<Dca | undefined> {
    const doc = await DcaModel.findOne({ id });
    return doc ? doc.toObject() : undefined;
  }
  async getDcaByName(name: string): Promise<Dca | undefined> {
    const doc = await DcaModel.findOne({ name });
    return doc ? doc.toObject() : undefined;
  }
  async getDcaByRegion(region: string): Promise<Dca[]> {
    const docs = await DcaModel.find({ region });
    return docs.map(d => d.toObject());
  }
  async createDca(dca: CreateDcaRequest): Promise<Dca> {
    const id = await getNextId("dcas");
    const doc = await DcaModel.create({ ...dca, id });
    return doc.toObject();
  }
  async updateDca(id: number, updates: UpdateDcaRequest): Promise<Dca> {
    const doc = await DcaModel.findOneAndUpdate({ id }, updates, { new: true });
    if (!doc) throw new Error("DCA not found");
    return doc.toObject();
  }
  async getCases(filters?: { search?: string; status?: string; dcaId?: number }): Promise<(Case & { dcaName?: string })[]> {
    const query: any = {};
    if (filters?.status && filters.status !== "all") query.status = filters.status;
    if (filters?.dcaId) query.assignedDcaId = filters.dcaId;
    if (filters?.search) {
      query.$or = [
        { customerName: { $regex: filters.search, $options: "i" } },
        { caseIdentifier: { $regex: filters.search, $options: "i" } }
      ];
    }
    const cases = await CaseModel.find(query).sort("-createdAt");
    const dcas = await DcaModel.find();
    const dcaMap = new Map(dcas.map(d => [d.id, d.name]));
    return cases.map(c => {
      const obj = c.toObject();
      return { 
        ...obj, 
        assignedDcaId: obj.assignedDcaId ?? null,
        slaDeadline: obj.slaDeadline ?? null,
        dcaName: obj.assignedDcaId ? dcaMap.get(obj.assignedDcaId) : undefined 
      } as Case & { dcaName?: string };
    });
  }
  async getCase(id: number): Promise<Case | undefined> {
    const doc = await CaseModel.findOne({ id });
    if (!doc) return undefined;
    const obj = doc.toObject();
    return { 
      ...obj, 
      assignedDcaId: obj.assignedDcaId ?? null,
      slaDeadline: obj.slaDeadline ?? null
    } as Case;
  }
  async getCaseByIdentifier(identifier: string): Promise<Case | undefined> {
    const doc = await CaseModel.findOne({ caseIdentifier: identifier });
    if (!doc) return undefined;
    const obj = doc.toObject();
    return { 
      ...obj, 
      assignedDcaId: obj.assignedDcaId ?? null,
      slaDeadline: obj.slaDeadline ?? null
    } as Case;
  }
  async createCase(data: CreateCaseRequest): Promise<Case> {
    const id = await getNextId("cases");
    const docData: any = { 
      ...data, 
      id, 
      createdAt: data.createdAt || new Date(),
      assignedDcaId: data.assignedDcaId ?? null,
      slaDeadline: data.slaDeadline ?? null
    };
    try {
      const score = await aiRecoveryPrediction({ amount: Number(data.amount), daysOverdue: data.daysOverdue, status: data.status || "New" });
      docData.aiRecoveryScore = score;
      docData.aiLastUpdatedAt = new Date();
    } catch (e) { console.warn("AI score failed", e); }
    const doc = await CaseModel.create(docData);
    const obj = doc.toObject();
    return { 
      ...obj, 
      assignedDcaId: obj.assignedDcaId ?? null,
      slaDeadline: obj.slaDeadline ?? null
    } as Case;
  }
  async updateCase(id: number, updates: UpdateCaseRequest): Promise<Case> {
    const doc = await CaseModel.findOneAndUpdate({ id }, updates, { new: true });
    if (!doc) throw new Error("Case not found");
    const obj = doc.toObject();
    return { 
      ...obj, 
      assignedDcaId: obj.assignedDcaId ?? null,
      slaDeadline: obj.slaDeadline ?? null
    } as Case;
  }
  async getCaseNotes(caseId: number): Promise<CaseNote[]> {
    const docs = await NoteModel.find({ caseId }).sort("-createdAt");
    return docs.map(d => d.toObject());
  }
  async createCaseNote(note: CreateNoteRequest): Promise<CaseNote> {
    const id = await getNextId("notes");
    const doc = await NoteModel.create({ ...note, id });
    return doc.toObject();
  }
  async createUploadLog(log: any): Promise<UploadLog> {
    const id = await getNextId("logs");
    const doc = await LogModel.create({ ...log, id });
    return doc.toObject();
  }
  async getUploadLogs(): Promise<UploadLog[]> {
    const docs = await LogModel.find().sort("-createdAt");
    return docs.map(d => d.toObject());
  }
  async getDashboardStats(dcaId?: number): Promise<DashboardStats> {
    const query: any = dcaId ? { assignedDcaId: dcaId } : {};
    const allCases = await CaseModel.find(query);
    const total = allCases.length;
    const pending = allCases.filter(c => !["Recovered", "Escalated"].includes(c.status)).length;
    const recovered = allCases.filter(c => c.status === "Recovered").length;
    const breaches = allCases.filter(c => c.slaDeadline && c.slaDeadline < new Date() && !["Recovered", "Escalated"].includes(c.status)).length;
    const statusCounts: Record<string, number> = {};
    const dcaCounts: Record<string, number> = {};
    const dcas = await DcaModel.find();
    const dcaMap = new Map(dcas.map(d => [d.id, d.name]));
    allCases.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      const dcaName = c.assignedDcaId ? dcaMap.get(c.assignedDcaId) || "Unassigned" : "Unassigned";
      dcaCounts[dcaName] = (dcaCounts[dcaName] || 0) + 1;
    });
    return {
      totalCases: total, pendingCases: pending, recoveredCases: recovered, slaBreaches: breaches,
      casesByStatus: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      casesByDca: Object.entries(dcaCounts).map(([name, value]) => ({ name, value })),
      recoveryRate: total ? Math.round((recovered / total) * 100) : 0
    };
  }

  async clearAllCases(): Promise<void> {
    await CaseModel.deleteMany({});
  }
}

export let storage: IStorage = new MemStorage();

export async function initializeStorage() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("🟢 MongoDB connected");
      storage = new MongoStorage();
    } catch (err) {
      console.error("❌ MongoDB connection failed, falling back to Memory:", err);
    }
  }
}
