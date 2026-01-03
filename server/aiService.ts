import OpenAI from "openai";

/**
 * Load OpenAI safely (works in dev + prod)
 */
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// Log AI status once
console.log("AI enabled:", !!process.env.OPENAI_API_KEY);

export interface CaseAiData {
  amount: number;
  daysOverdue: number;
  status: string;
}

/**
 * === TEST AI CONNECTION (Admin check) ===
 */
export async function testAIConnection() {
  if (!openai) {
    return { enabled: false, message: "AI not configured" };
  }

  try {
    await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say hi" }],
      max_tokens: 5,
    });

    return { enabled: true, message: "AI ready" };
  } catch (err) {
    console.error("AI test failed:", err);
    return { enabled: false, message: "AI connection failed" };
  }
}

/**
 * === AI RECOVERY SCORE (0–100) ===
 */
export async function aiRecoveryPrediction(
  caseData: CaseAiData
): Promise<number> {
  if (!openai) {
    return fallbackRecovery(caseData);
  }

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a debt recovery analyst. Return ONLY a number between 0 and 100. Be concise.",
        },
        {
          role: "user",
          content: `Amount: ${caseData.amount}, Days Overdue: ${caseData.daysOverdue}, Status: ${caseData.status}`,
        },
      ],
      max_tokens: 10,
    });

    const score = Number(res.choices[0]?.message?.content?.trim());
    return isNaN(score)
      ? fallbackRecovery(caseData)
      : Math.max(0, Math.min(100, score));
  } catch (err) {
    console.warn("AI failed, using fallback:", err);
    return fallbackRecovery(caseData);
  }
}

/**
 * === FALLBACK (NO AI / ERROR SAFE) ===
 */
function fallbackRecovery(caseData: CaseAiData): number {
  let score = 100 - caseData.daysOverdue * 0.8;
  if (caseData.amount > 50000) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * === AI PRIORITY (STUBBED) ===
 */
export async function aiPriorityAssessment(caseData: CaseAiData): Promise<string> {
  if (caseData.amount > 50000 || caseData.daysOverdue > 60) return "High";
  if (caseData.amount > 20000) return "Medium";
  return "Low";
}

/**
 * === AI FOLLOW-UP GENERATION (STUBBED) ===
 */
export async function aiGenerateFollowUp(caseData: CaseAiData): Promise<string> {
  return `Follow-up recommended for ${caseData.amount} overdue by ${caseData.daysOverdue} days.`;
}
