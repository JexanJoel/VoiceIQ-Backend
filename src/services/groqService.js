import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Existing analyzeTranscript (used by dashboard flow) ────────────────────
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
export const analyzeForHackathon = async (transcript, language, financialContext = null) => {

  // Build financial hints from raw audio extraction to help LLM
  let financialHints = "";
  if (financialContext) {
    const hints = [];
    if (financialContext.hasEMI) {
      hints.push(`- EMI/installment related words detected: ${financialContext.emiMatches.join(", ")}`);
    }
    if (financialContext.hasPayment) {
      hints.push(`- Payment related words detected: ${financialContext.paymentMatches.join(", ")}`);
    }
    if (financialContext.amounts.length > 0) {
      hints.push(`- Amounts/numbers detected: ${financialContext.amounts.join(", ")}`);
    }
    if (hints.length > 0) {
      financialHints = `\nFINANCIAL CONTEXT FROM AUDIO:\n${hints.join("\n")}\nUse these to inform your paymentPreference classification.\n`;
    }
  }

  const prompt = `
You are an expert call center compliance analyst specializing in Indian call centers.
The transcript is in ${language} (mix of ${language === "Tamil" ? "Tamil and English, called Tanglish" : "Hindi and English, called Hinglish"}).
Note: The transcript may contain some garbled words due to mixed-language audio — focus on the meaning and context, not perfect spelling.
${financialHints}
Analyze the transcript below and return ONLY a valid JSON object with no extra text, no markdown, no code fences.

TRANSCRIPT:
${transcript}

Your JSON must follow this EXACT structure:
{
  "summary": "Concise 2-3 sentence summary mentioning specific details like course name, fees, outcomes",
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
- greeting: true if agent opened with ANY greeting (Hello, Vanakkam, Namaste, Hi, Good morning, Salam, etc.)
- identification: true if agent called the customer by name at any point OR customer confirmed their name
- problemStatement: true if agent clearly stated the purpose or issue of the call
- solutionOffering: true if agent offered any solution, course, product, service, or next steps
- closing: true if agent ended with any closing (Thank you, Okay fine, Bye, Take care, etc.)
- complianceScore: fraction of the 5 SOP steps that were followed (e.g. 4/5 = 0.8)
- adherenceStatus: "FOLLOWED" only if ALL 5 steps are true, otherwise "NOT_FOLLOWED"

Payment Rules (VERY IMPORTANT):
- EMI: classify as EMI if ANY of these:
  * Agent mentions EMI, installment, monthly payment, or paying in parts
  * Agent mentions a course fee AND says it can be paid in installments
  * Financial context above shows EMI keywords were detected
  * Customer asks about paying monthly
- FULL_PAYMENT: customer explicitly agrees to pay the full amount at once
- PARTIAL_PAYMENT: customer offers to pay part now and rest later
- DOWN_PAYMENT: customer agrees to pay an initial deposit only
- NONE: absolutely no payment, fee, or cost discussion at all

Rejection Rules:
- HIGH_INTEREST: customer complains about interest rate or cost being too high
- BUDGET_CONSTRAINTS: customer says no money, tight budget, can't afford right now
- ALREADY_PAID: customer claims they already paid
- NOT_INTERESTED: customer explicitly says not interested or rejects the offer
- NONE: call ended positively or no rejection happened

Sentiment Rules:
- Positive: customer is friendly, cooperative, agreed to next steps, good ending
- Negative: customer is angry, frustrated, or refused
- Neutral: professional tone, no strong emotion

Keyword Rules:
- Extract exactly 10 specific keywords or phrases most relevant to this call
- Include: course names, technology topics, specific amounts, company names, action items
- Avoid generic words like "call", "agent", "customer", "discuss"
- Good examples: "Data Science", "73800 course fee", "EMI options", "IIT Madras", "placement support"
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

    // ── Validate and sanitize enums ───────────────────────────────────────
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

    // ── Safety net: if LLM missed EMI but raw audio had EMI keywords ──────
    if (financialContext?.hasEMI && parsed.analytics.paymentPreference === "NONE") {
      parsed.analytics.paymentPreference = "EMI";
    }

    // ── Recalculate adherenceStatus from booleans ─────────────────────────
    const allFollowed =
      parsed.sop_validation?.greeting &&
      parsed.sop_validation?.identification &&
      parsed.sop_validation?.problemStatement &&
      parsed.sop_validation?.solutionOffering &&
      parsed.sop_validation?.closing;

    parsed.sop_validation.adherenceStatus = allFollowed ? "FOLLOWED" : "NOT_FOLLOWED";

    // ── Recalculate complianceScore from booleans ─────────────────────────
    const steps = [
      parsed.sop_validation.greeting,
      parsed.sop_validation.identification,
      parsed.sop_validation.problemStatement,
      parsed.sop_validation.solutionOffering,
      parsed.sop_validation.closing,
    ];
    const trueCount = steps.filter(Boolean).length;
    parsed.sop_validation.complianceScore = parseFloat((trueCount / 5).toFixed(1));

    // ── Ensure keywords is a non-empty array ──────────────────────────────
    if (!Array.isArray(parsed.keywords) || parsed.keywords.length === 0) {
      parsed.keywords = ["call center", "compliance", "SOP", "agent", "customer",
        "transcript", "analysis", "payment", "sentiment", "keywords"];
    }

    return parsed;
  } catch (err) {
    throw new Error(`Hackathon analysis failed: ${err.message}`);
  }
};