import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Existing analyzeTranscript (used by your dashboard flow) ───────────────
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
      "coaching": "specific, actionable tip on how to fix this."
    }
  ],
  "passed_checks": ["check 1", "check 2"],
  "payment_preference": "cash" | "card" | "upi" | "unknown",
  "summary": "brief summary of the call"
}
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
      parsed.violations = parsed.violations.map((v) => {
        if (typeof v === "string")
          return { text: v, timestamp: null, severity: "major", coaching: null };
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

// ─── NEW: analyzeForHackathon (used by /api/call-analytics) ─────────────────
export const analyzeForHackathon = async (transcript, language) => {
  const prompt = `
You are an expert call center compliance analyst specializing in Indian call centers.
The transcript is in ${language} (mix of ${language === "Tamil" ? "Tamil and English, called Tanglish" : "Hindi and English, called Hinglish"}).

Analyze the transcript below and return ONLY a valid JSON object with no extra text, no markdown, no code fences.

TRANSCRIPT:
${transcript}

Your JSON must follow this EXACT structure:
{
  "summary": "Concise 2-3 sentence summary of the call covering key topics and outcome",
  "sop_validation": {
    "greeting": true or false,
    "identification": true or false,
    "problemStatement": true or false,
    "solutionOffering": true or false,
    "closing": true or false,
    "complianceScore": 0.0 to 1.0,
    "adherenceStatus": "FOLLOWED" or "NOT_FOLLOWED",
    "explanation": "One sentence explaining what was followed and what was missed"
  },
  "analytics": {
    "paymentPreference": "EMI" or "FULL_PAYMENT" or "PARTIAL_PAYMENT" or "DOWN_PAYMENT" or "NONE",
    "rejectionReason": "HIGH_INTEREST" or "BUDGET_CONSTRAINTS" or "ALREADY_PAID" or "NOT_INTERESTED" or "NONE",
    "sentiment": "Positive" or "Neutral" or "Negative"
  },
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"]
}

SOP Rules:
- greeting: true if agent opened with ANY greeting (Hello, Vanakkam, Namaste, Hi, Good morning, etc.)
- identification: true if agent called the customer by name OR customer confirmed their name during the call
- problemStatement: true if agent clearly stated the purpose or issue of the call
- solutionOffering: true if agent offered any solution, product, service, or next steps
- closing: true if agent ended with any closing statement (Thank you, Okay fine, Bye, etc.)
- complianceScore: fraction of the 5 SOP steps that were followed (e.g. 4/5 = 0.8)
- adherenceStatus: "FOLLOWED" only if ALL 5 steps are true, otherwise "NOT_FOLLOWED"

Payment Rules (IMPORTANT):
- EMI: agent OR customer mentions installments, EMI, monthly payments, or paying in parts over time — classify as EMI even if customer hasn't confirmed yet
- FULL_PAYMENT: customer agrees to pay the full amount at once
- PARTIAL_PAYMENT: customer offers to pay part now and rest later
- DOWN_PAYMENT: customer agrees to pay an initial deposit
- NONE: absolutely no payment discussion in the entire call
- If agent mentions course fee with EMI options (e.g. "73,000 with EMI up to 24 months"), classify as EMI

Rejection Rules:
- HIGH_INTEREST: customer complains about interest rate or fee being too high
- BUDGET_CONSTRAINTS: customer says they don't have money / tight budget this month
- ALREADY_PAID: customer claims they already paid
- NOT_INTERESTED: customer doesn't want the product or service
- NONE: no rejection — payment was agreed, or call ended positively, or no payment discussed

Sentiment Rules:
- Positive: customer is friendly, cooperative, agreed to next steps
- Negative: customer is angry, frustrated, or refused
- Neutral: professional tone, no strong positive or negative emotion

Keyword Rules:
- Extract exactly 10 keywords or phrases that are most relevant to the call's domain and content
- Keywords must be actual terms spoken or implied in the conversation (course names, topics, amounts, actions)
- Avoid generic words like "call", "agent", "customer"
`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const raw = response.choices[0].message.content;
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Validate and sanitize enums
    const validPayment = ["EMI", "FULL_PAYMENT", "PARTIAL_PAYMENT", "DOWN_PAYMENT", "NONE"];
    const validRejection = ["HIGH_INTEREST", "BUDGET_CONSTRAINTS", "ALREADY_PAID", "NOT_INTERESTED", "NONE"];
    const validSentiment = ["Positive", "Neutral", "Negative"];

    if (!validPayment.includes(parsed.analytics?.paymentPreference)) {
      parsed.analytics.paymentPreference = "NONE";
    }
    if (!validRejection.includes(parsed.analytics?.rejectionReason)) {
      parsed.analytics.rejectionReason = "NONE";
    }
    if (!validSentiment.includes(parsed.analytics?.sentiment)) {
      parsed.analytics.sentiment = "Neutral";
    }

    // Ensure adherenceStatus is valid
    const allFollowed =
      parsed.sop_validation?.greeting &&
      parsed.sop_validation?.identification &&
      parsed.sop_validation?.problemStatement &&
      parsed.sop_validation?.solutionOffering &&
      parsed.sop_validation?.closing;

    parsed.sop_validation.adherenceStatus = allFollowed ? "FOLLOWED" : "NOT_FOLLOWED";

    // Recalculate complianceScore from booleans for accuracy
    const steps = [
      parsed.sop_validation.greeting,
      parsed.sop_validation.identification,
      parsed.sop_validation.problemStatement,
      parsed.sop_validation.solutionOffering,
      parsed.sop_validation.closing,
    ];
    const trueCount = steps.filter(Boolean).length;
    parsed.sop_validation.complianceScore = parseFloat((trueCount / 5).toFixed(1));

    // Ensure keywords is an array of strings
    if (!Array.isArray(parsed.keywords)) {
      parsed.keywords = [];
    }

    return parsed;
  } catch (err) {
    throw new Error(`Hackathon analysis failed: ${err.message}`);
  }
};