import { z } from "zod";

// === BASE SCHEMAS ===
export const insertDcaSchema = z.object({
  name: z.string().min(1),
  region: z.string().min(1),
});

export const insertCaseSchema = z.object({
  caseIdentifier: z.string().min(1),
  customerName: z.string().min(1),
  amount: z.string().min(1),
  daysOverdue: z.number().int(),
  region: z.string().min(1),
  status: z.string().optional().default("New"),
  priority: z.string().optional().default("Low"),
  assignedDcaId: z.number().optional(),
  slaDeadline: z.date().optional(),
  createdAt: z.date().optional(),
});

export const insertCaseNoteSchema = z.object({
  caseId: z.number(),
  note: z.string().min(1),
  isSystemGenerated: z.boolean().optional().default(false),
});

export const insertUploadLogSchema = z.object({
  filename: z.string().min(1),
  status: z.string(),
  recordsProcessed: z.number().optional().default(0),
  errorCount: z.number().optional().default(0),
});

// === TYPES ===
export type Dca = {
  id: number;
  name: string;
  region: string;
  activeCases: number;
  recoveredCases: number;
  slaScore: string;
  createdAt: Date;
};

export type Case = {
  id: number;
  caseIdentifier: string;
  customerName: string;
  amount: string;
  daysOverdue: number;
  region: string;
  status: string;
  priority: string;
  assignedDcaId: number | null;
  slaDeadline: Date | null;
  aiRecoveryScore: number | null;
  aiPriority: string | null;
  aiFollowUpMessage: string | null;
  aiLastUpdatedAt: Date | null;
  createdAt: Date;
};

export type CaseNote = {
  id: number;
  caseId: number;
  note: string;
  isSystemGenerated: boolean;
  createdAt: Date;
};

export type UploadLog = {
  id: number;
  filename: string;
  status: string;
  recordsProcessed: number;
  errorCount: number;
  createdAt: Date;
};

export type CreateDcaRequest = z.infer<typeof insertDcaSchema>;
export type UpdateDcaRequest = Partial<CreateDcaRequest>;

export type CreateCaseRequest = z.infer<typeof insertCaseSchema>;
export type UpdateCaseRequest = Partial<CreateCaseRequest>;
export type ImportCaseRow = {
  Case_ID: string;
  Customer_Name: string;
  Amount: number;
  Days_Overdue: number;
  Region: string;
  Status?: string;
};
export type BatchImportRequest = {
  filename: string;
  cases: ImportCaseRow[];
};

export type CreateNoteRequest = z.infer<typeof insertCaseNoteSchema>;

export type DashboardStats = {
  totalCases: number;
  pendingCases: number;
  recoveredCases: number;
  slaBreaches: number;
  casesByStatus: { name: string; value: number }[];
  casesByDca: { name: string; value: number }[];
  recoveryRate: number;
};

export const chatModels = ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet"] as const;
export type ChatModel = (typeof chatModels)[number];

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema),
  model: z.enum(chatModels).default("gpt-4o"),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
