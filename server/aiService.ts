import OpenAI from "openai";

// Initialize OpenAI client with Replit-specific environment variables
// Only create client if API key is available, otherwise AI features will use fallbacks
const openai = process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    })
  : null;

export interface CaseAiData {
  amount: number;
  daysOverdue: number;
  status: string;
}

/**
 * Predict recovery probability using AI with a rule-based fallback.
 */
export async function aiRecoveryPrediction(caseData: CaseAiData): Promise<number> {
  if (!openai) {
    return fallbackRecoveryScore(caseData);
  }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a debt recovery risk analyst. Return ONLY a single number representing the probability of recovery (0-100) based on the debt details provided."
        },
        {
          role: "user",
          content: `Amount: ${caseData.amount}, Days Overdue: ${caseData.daysOverdue}, Status: ${caseData.status}`
        }
      ],
      max_completion_tokens: 10,
    });

    const score = parseInt(response.choices[0]?.message?.content?.trim() || "0");
    return isNaN(score) ? fallbackRecoveryScore(caseData) : Math.min(100, Math.max(0, score));
  } catch (error) {
    console.warn("AI Recovery Prediction failed, using fallback:", error);
    return fallbackRecoveryScore(caseData);
  }
}

function fallbackRecoveryScore(caseData: CaseAiData): number {
  let score = 100 - caseData.daysOverdue * 0.8;
  if (caseData.amount > 50000) score -= 10;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Suggest case priority using AI, ensuring it never downgrades rule-based risks.
 */
export async function aiSuggestedPriority(caseData: CaseAiData, rulePriority: string): Promise<string> {
  const priorities = ["Low", "Medium", "High"];
  
  if (!openai) {
    return rulePriority;
  }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a debt collection prioritizer. Suggest a priority: 'High', 'Medium', or 'Low' for this debt case."
        },
        {
          role: "user",
          content: `Amount: ${caseData.amount}, Days Overdue: ${caseData.daysOverdue}, Status: ${caseData.status}`
        }
      ],
      max_completion_tokens: 10,
    });

    const aiPriority = response.choices[0]?.message?.content?.trim() || "Low";
    
    // Ensure we take the higher of rule-based or AI priority
    const ruleIdx = priorities.indexOf(rulePriority);
    const aiIdx = priorities.indexOf(aiPriority);
    
    return priorities[Math.max(ruleIdx, aiIdx === -1 ? 0 : aiIdx)];
  } catch (error) {
    console.warn("AI Suggested Priority failed, using rule-based:", error);
    return rulePriority;
  }
}

/**
 * Generate a professional follow-up reminder message.
 */
export async function aiFollowUpMessage(caseData: CaseAiData, customerName: string): Promise<string> {
  if (!openai) {
    return fallbackFollowUp(customerName, caseData.amount);
  }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "Generate a professional, polite, and persuasive debt collection reminder message. Keep it concise."
        },
        {
          role: "user",
          content: `Customer: ${customerName}, Amount: ${caseData.amount}, Days Overdue: ${caseData.daysOverdue}`
        }
      ],
      max_completion_tokens: 200,
    });

    return response.choices[0]?.message?.content?.trim() || fallbackFollowUp(customerName, caseData.amount);
  } catch (error) {
    console.warn("AI Follow-up Message failed, using fallback:", error);
    return fallbackFollowUp(customerName, caseData.amount);
  }
}

function fallbackFollowUp(customerName: string, amount: number): string {
  return `Dear ${customerName}, this is a reminder regarding your outstanding balance of ${amount}. Please contact us to arrange payment.`;
}
