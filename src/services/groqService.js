import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const analyzeTranscript = async (transcript, sopRules) => {
  const prompt = `
You are an expert call center compliance analyst and agent coach.
Analyze the following call transcript against the SOP rules provided.

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
    {
      "text": "clear description of what the agent did wrong",
      "timestamp": "0:00–0:12",
      "severity": "critical" | "major" | "minor",
      "coaching": "specific, actionable tip on how to fix this. Include an example script if relevant."
    }
  ],
  "passed_checks": ["check 1", "check 2"],
  "payment_preference": "cash" | "card" | "upi" | "unknown",
  "summary": "brief summary of the call"
}

Rules for violations:
- Always include the timestamp range from the transcript where the violation was detected
- If you cannot determine a specific timestamp, use "0:00–end"
- severity must be one of: "critical" (compliance-breaking, legal/reputation risk), "major" (significant SOP breach), "minor" (small lapse, easily corrected)
- For coaching, be specific and practical — give the agent exact words they could use
- Keep coaching tips concise, under 2 sentences

Rules for passed_checks:
- List each SOP rule that was successfully followed
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

    if (parsed.violations && Array.isArray(parsed.violations)) {
      parsed.violations = parsed.violations.map(v => {
        if (typeof v === "string") return { text: v, timestamp: null, severity: "major", coaching: null };
        return {
          text: v.text || v,
          timestamp: v.timestamp || null,
          severity: v.severity || "major",
          coaching: v.coaching || null,
        };
      });
    }

    return parsed;
  } catch (error) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
};