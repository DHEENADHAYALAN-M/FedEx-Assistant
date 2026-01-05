import { pgTable, text, serial, integer, timestamp, doublePrecision, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const dcas = pgTable("dcas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  slaScore: text("sla_score").default("100").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseIdentifier: text("case_identifier").notNull().unique(),
  customerName: text("customer_name").notNull(),
  amount: text("amount").notNull(),
  daysOverdue: integer("days_overdue").notNull(),
  region: text("region").notNull(),
  status: text("status").default("New").notNull(),
  priority: text("priority").default("Low").notNull(),
  assignedDcaId: integer("assigned_dca_id").references(() => dcas.id),
  slaDeadline: timestamp("sla_deadline"),
  aiRecoveryScore: doublePrecision("ai_recovery_score"),
  aiPriority: text("ai_priority"),
  aiFollowUpMessage: text("ai_follow_up_message"),
  aiLastUpdatedAt: timestamp("ai_last_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
});

export const caseNotes = pgTable("case_notes", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  note: text("note").notNull(),
  isSystemGenerated: boolean("is_system_generated").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const uploadLogs = pgTable("upload_logs", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  status: text("status").notNull(),
  recordsProcessed: integer("records_processed").default(0).notNull(),
  errorCount: integer("error_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDcaSchema = createInsertSchema(dcas).omit({ id: true, createdAt: true });
export const insertCaseSchema = createInsertSchema(cases).omit({ id: true, createdAt: true, lastUpdatedAt: true });
export const insertCaseNoteSchema = createInsertSchema(caseNotes).omit({ id: true, createdAt: true });
export const insertUploadLogSchema = createInsertSchema(uploadLogs).omit({ id: true, createdAt: true });

export type Dca = typeof dcas.$inferSelect;
export type InsertDca = z.infer<typeof insertDcaSchema>;
export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type CaseNote = typeof caseNotes.$inferSelect;
export type InsertCaseNote = z.infer<typeof insertCaseNoteSchema>;
export type UploadLog = typeof uploadLogs.$inferSelect;
export type InsertUploadLog = z.infer<typeof insertUploadLogSchema>;

// For frontend compatibility if needed
export type CreateDcaRequest = InsertDca;
export type UpdateDcaRequest = Partial<CreateDcaRequest>;
export type CreateCaseRequest = InsertCase;
export type UpdateCaseRequest = Partial<CreateCaseRequest>;
export type CreateNoteRequest = InsertCaseNote;

export type DashboardStats = {
  totalCases: number;
  pendingCases: number;
  recoveredCases: number;
  slaBreaches: number;
  casesByStatus: { name: string; value: number }[];
  casesByDca: { name: string; value: number }[];
  casesByPriority: { name: string; value: number }[];
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

export type ImportCaseRow = {
  Case_ID: string;
  Customer_Name: string;
  Amount: number;
  Days_Overdue: number;
  Region: string;
  Status?: string;
};
