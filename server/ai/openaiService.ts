import OpenAI from "openai";

// Initialize OpenAI client safely
// Using the provided environment variable requirement: process.env.OPENAI_API_KEY
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * testAIConnection()
 * - If OPENAI_API_KEY is missing: return { enabled: false, message: "AI not configured" }
 * - If key exists: make a small, low-cost request, return { enabled: true, message: "AI ready" }
 */
export async function testAIConnection() {
  if (!openai) {
    return { enabled: false, message: "AI not configured" };
  }

  try {
    // A small, low-cost request to verify connection
    await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "say hi" }],
      max_tokens: 5,
    });

    return { enabled: true, message: "AI ready" };
  } catch (error) {
    console.error("OpenAI Connection Test Failed:", error);
    return { enabled: false, message: "AI connection failed", error: error instanceof Error ? error.message : String(error) };
  }
}
