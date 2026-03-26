import supabase from "../services/supabaseService.js";
import { success, error } from "../utils/responseHelper.js";

export const getDashboardStats = async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from("calls")
      .select("id, sentiment, sop_compliance_percentage, language, payment_preference, created_at");

    if (dbError) throw new Error(dbError.message);

    const total = data.length;
    const flagged = data.filter((c) => c.sop_compliance_percentage < 70).length;
    const avgCompliance = total > 0
      ? Math.round(data.reduce((sum, c) => sum + (c.sop_compliance_percentage || 0), 0) / total)
      : 0;

    const sentimentCounts = {
      positive: data.filter((c) => c.sentiment === "positive").length,
      neutral: data.filter((c) => c.sentiment === "neutral").length,
      negative: data.filter((c) => c.sentiment === "negative").length,
    };

    const languageCounts = data.reduce((acc, c) => {
      const lang = c.language || "unknown";
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {});

    const paymentCounts = data.reduce((acc, c) => {
      const pref = c.payment_preference || "unknown";
      acc[pref] = (acc[pref] || 0) + 1;
      return acc;
    }, {});

    // Best and worst performing day
    const dayMap = {};
    data.forEach((c) => {
      const day = new Date(c.created_at).toISOString().split("T")[0];
      if (!dayMap[day]) dayMap[day] = { sum: 0, count: 0 };
      dayMap[day].sum += c.sop_compliance_percentage || 0;
      dayMap[day].count += 1;
    });

    const dayAverages = Object.entries(dayMap).map(([date, val]) => ({
      date,
      avg: Math.round(val.sum / val.count),
      count: val.count,
    }));

    const bestDay = dayAverages.length > 0
      ? dayAverages.reduce((a, b) => a.avg > b.avg ? a : b)
      : null;

    const worstDay = dayAverages.length > 0
      ? dayAverages.reduce((a, b) => a.avg < b.avg ? a : b)
      : null;

    return success(res, {
      total_calls: total,
      flagged_calls: flagged,
      avg_compliance_percentage: avgCompliance,
      sentiment_breakdown: sentimentCounts,
      language_breakdown: languageCounts,
      payment_preference_breakdown: paymentCounts,
      best_day: bestDay,
      worst_day: worstDay,
    });
  } catch (err) {
    return error(res, err.message);
  }
};

export const getComplianceTrend = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error: dbError } = await supabase
      .from("calls")
      .select("sop_compliance_percentage, created_at")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (dbError) throw new Error(dbError.message);

    const trend = {};
    data.forEach((c) => {
      const day = new Date(c.created_at).toISOString().split("T")[0];
      if (!trend[day]) trend[day] = { total: 0, sum: 0 };
      trend[day].total += 1;
      trend[day].sum += c.sop_compliance_percentage || 0;
    });

    const trendArray = Object.entries(trend).map(([date, val]) => ({
      date,
      avg_compliance: Math.round(val.sum / val.total),
      call_count: val.total,
    }));

    return success(res, trendArray);
  } catch (err) {
    return error(res, err.message);
  }
};

export const getTopViolations = async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from("calls")
      .select("violations");

    if (dbError) throw new Error(dbError.message);

    const violationCounts = {};
    data.forEach((c) => {
      if (c.violations && Array.isArray(c.violations)) {
        c.violations.forEach((v) => {
          // Handle both string and object violations
          const key = typeof v === "object" && v !== null ? v.text : v;
          if (key) violationCounts[key] = (violationCounts[key] || 0) + 1;
        });
      }
    });

    const sorted = Object.entries(violationCounts)
      .map(([violation, count]) => ({ violation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return success(res, sorted);
  } catch (err) {
    return error(res, err.message);
  }
};

// Violation count per SOP rule
export const getViolationsByRule = async (req, res) => {
  try {
    const { data: callsData, error: dbError } = await supabase
      .from("calls")
      .select("violations");

    if (dbError) throw new Error(dbError.message);

    // Get user's SOP rules
    const { data: rules, error: rulesError } = await supabase
      .from("sop_rules")
      .select("id, rule_text, category")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true });

    if (rulesError) throw new Error(rulesError.message);

    // Count all violations
    const violationCounts = {};
    callsData.forEach((c) => {
      if (c.violations && Array.isArray(c.violations)) {
        c.violations.forEach((v) => {
          const key = typeof v === "object" && v !== null ? v.text : v;
          if (key) violationCounts[key] = (violationCounts[key] || 0) + 1;
        });
      }
    });

    // Match violations to rules by fuzzy text matching
    const ruleStats = (rules || []).map((rule) => {
      // Find violations that mention this rule's keywords
      const ruleWords = rule.rule_text.toLowerCase().split(" ").filter(w => w.length > 4);
      let count = 0;
      Object.entries(violationCounts).forEach(([violation, vCount]) => {
        const vLower = violation.toLowerCase();
        const matches = ruleWords.filter(w => vLower.includes(w)).length;
        if (matches >= 2) count += vCount;
      });

      return {
        rule_id: rule.id,
        rule_text: rule.rule_text,
        category: rule.category,
        violation_count: count,
      };
    });

    // Sort by most violated
    ruleStats.sort((a, b) => b.violation_count - a.violation_count);

    return success(res, ruleStats);
  } catch (err) {
    return error(res, err.message);
  }
};