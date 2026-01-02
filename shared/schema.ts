
import { pgTable, text, serial, integer, boolean, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// DCA Master Table
export const dcas = pgTable("dcas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(), // North, South, East, West, etc.
  activeCases: integer("active_cases").default(0),
  recoveredCases: integer("recovered_cases").default(0),
  slaScore: numeric("sla_score").default("100"), // Percentage
  createdAt: timestamp("created_at").defaultNow(),
});

// Cases Table
export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseIdentifier: text("case_identifier").notNull(), // From Excel (Case_ID)
  customerName: text("customer_name").notNull(),
  amount: numeric("amount").notNull(),
  daysOverdue: integer("days_overdue").notNull(),
  region: text("region").notNull(),
  status: text("status").notNull().default("New"), // New, Assigned, In Progress, Recovered, Escalated
  priority: text("priority").notNull().default("Low"), // High, Medium, Low (Auto-calculated)
  assignedDcaId: integer("assigned_dca_id").references(() => dcas.id),
  slaDeadline: timestamp("sla_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Case Notes (Audit Trail)
export const caseNotes = pgTable("case_notes", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  note: text("note").notNull(),
  isSystemGenerated: boolean("is_system_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Upload Logs
export const uploadLogs = pgTable("upload_logs", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  status: text("status").notNull(), // Success, Failed, Partial
  recordsProcessed: integer("records_processed").default(0),
  errorCount: integer("error_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const dcasRelations = relations(dcas, ({ many }) => ({
  cases: many(cases),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  dca: one(dcas, {
    fields: [cases.assignedDcaId],
    references: [dcas.id],
  }),
  notes: many(caseNotes),
}));

export const caseNotesRelations = relations(caseNotes, ({ one }) => ({
  case: one(cases, {
    fields: [caseNotes.caseId],
    references: [cases.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertDcaSchema = createInsertSchema(dcas).omit({ id: true, createdAt: true, activeCases: true, recoveredCases: true, slaScore: true });
export const insertCaseSchema = createInsertSchema(cases).omit({ id: true, createdAt: true });
export const insertCaseNoteSchema = createInsertSchema(caseNotes).omit({ id: true, createdAt: true });
export const insertUploadLogSchema = createInsertSchema(uploadLogs).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Dca = typeof dcas.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type CaseNote = typeof caseNotes.$inferSelect;
export type UploadLog = typeof uploadLogs.$inferSelect;

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
