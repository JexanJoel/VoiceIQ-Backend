import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const analyzeTranscript = async (transcript, sopRules) => {
  const prompt = `
You are a call center compliance analyst. Analyze the following call transcript against the SOP rules provided.

The transcript includes timestamps in the format [M:SS–M:SS] at the start of each segment.
Use these timestamps to identify WHEN each violation occurred.

TRANSCRIPT:
${transcript}

SOP RULES:
${sopRules}

Respond ONLY in this exact JSON format with no extra text:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentiment_score": 0.0 to 1.0,
  "sop_compliance_percentage": 0 to 100,
  "violations": [
    { "text": "violation description", "timestamp": "0:00–0:12" },
    { "text": "violation description", "timestamp": "0:45–1:02" }
  ],
  "passed_checks": ["check 1", "check 2"],
  "payment_preference": "cash" | "card" | "upi" | "unknown",
  "summary": "brief summary of the call"
}

For violations, always include the timestamp range from the transcript where the violation was detected.
If you cannot determine a specific timestamp for a violation, use "0:00–end".
`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const raw = response.choices[0].message.content;
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Normalize violations — handle both old string format and new object format
    if (parsed.violations && Array.isArray(parsed.violations)) {
      parsed.violations = parsed.violations.map(v => {
        if (typeof v === "string") return { text: v, timestamp: null };
        return v;
      });
    }

    return parsed;
  } catch (error) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
};