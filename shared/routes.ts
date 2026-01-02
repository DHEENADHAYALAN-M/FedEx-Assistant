
import { z } from 'zod';
import { insertCaseSchema, insertDcaSchema, insertCaseNoteSchema, cases, dcas, caseNotes, uploadLogs } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      responses: {
        200: z.custom<any>(), // Typed as DashboardStats in implementation
      },
    },
  },
  dcas: {
    list: {
      method: 'GET' as const,
      path: '/api/dcas',
      responses: {
        200: z.array(z.custom<typeof dcas.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/dcas/:id',
      responses: {
        200: z.custom<typeof dcas.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/dcas',
      input: insertDcaSchema,
      responses: {
        201: z.custom<typeof dcas.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  cases: {
    list: {
      method: 'GET' as const,
      path: '/api/cases',
      input: z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        dcaId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof cases.$inferSelect & { dcaName?: string }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/cases/:id',
      responses: {
        200: z.custom<typeof cases.$inferSelect & { dca?: typeof dcas.$inferSelect, notes: typeof caseNotes.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/cases/:id',
      input: insertCaseSchema.partial(),
      responses: {
        200: z.custom<typeof cases.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    import: {
      method: 'POST' as const,
      path: '/api/cases/import',
      input: z.object({
        filename: z.string(),
        cases: z.array(z.object({
          Case_ID: z.string(),
          Customer_Name: z.string(),
          Amount: z.number().or(z.string()),
          Days_Overdue: z.number().or(z.string()),
          Region: z.string(),
          Status: z.string().optional(),
        })),
      }),
      responses: {
        200: z.object({
          processed: z.number(),
          success: z.boolean(),
          message: z.string(),
        }),
      },
    },
  },
  notes: {
    create: {
      method: 'POST' as const,
      path: '/api/cases/:id/notes',
      input: z.object({ note: z.string() }),
      responses: {
        201: z.custom<typeof caseNotes.$inferSelect>(),
      },
    },
  },
  uploadLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/upload-logs',
      responses: {
        200: z.array(z.custom<typeof uploadLogs.$inferSelect>()),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
