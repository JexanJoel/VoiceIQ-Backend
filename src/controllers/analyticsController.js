import supabase from "../services/supabaseService.js";
import { success, error } from "../utils/responseHelper.js";

// Overall dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from("calls")
      .select(
        "id, sentiment, sop_compliance_percentage, language, payment_preference, created_at"
      );

    if (dbError) throw new Error(dbError.message);

    const total = data.length;
    const flagged = data.filter((c) => c.sop_compliance_percentage < 70).length;
    const avgCompliance =
      total > 0
        ? Math.round(
            data.reduce((sum, c) => sum + (c.sop_compliance_percentage || 0), 0) / total
          )
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

    return success(res, {
      total_calls: total,
      flagged_calls: flagged,
      avg_compliance_percentage: avgCompliance,
      sentiment_breakdown: sentimentCounts,
      language_breakdown: languageCounts,
      payment_preference_breakdown: paymentCounts,
    });
  } catch (err) {
    return error(res, err.message);
  }
};

// Compliance trend over time (last 7 days)
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

    // Group by day
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

// Top violations across all calls
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
          violationCounts[v] = (violationCounts[v] || 0) + 1;
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