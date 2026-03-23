import supabase from "../services/supabaseService.js";
import { success, error } from "../utils/responseHelper.js";

export const getAgents = async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true });
    if (dbError) throw new Error(dbError.message);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
};

export const createAgent = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return error(res, "Agent name is required", 400);

    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", req.user.id)
      .ilike("name", name.trim())
      .single();

    if (existing) return error(res, "Agent with this name already exists", 400);

    const { data, error: dbError } = await supabase
      .from("agents")
      .insert({ user_id: req.user.id, name: name.trim() })
      .select()
      .single();
    if (dbError) throw new Error(dbError.message);
    return success(res, data, "Agent created", 201);
  } catch (err) {
    return error(res, err.message);
  }
};

export const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { error: dbError } = await supabase
      .from("agents")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);
    if (dbError) throw new Error(dbError.message);
    return success(res, null, "Agent deleted");
  } catch (err) {
    return error(res, err.message);
  }
};

export const getAgentStats = async (req, res) => {
  try {
    const { data: calls, error: dbError } = await supabase
      .from("calls")
      .select("agent_id, agent_name, sop_compliance_percentage, sentiment, violations, created_at")
      .order("created_at", { ascending: false });

    if (dbError) throw new Error(dbError.message);

    const agentMap = {};

    calls.forEach((call) => {
      const key = call.agent_id || "unknown";
      const name = call.agent_name || "Unknown Agent";

      if (!agentMap[key]) {
        agentMap[key] = {
          agent_id: call.agent_id,
          agent_name: name,
          total_calls: 0,
          total_compliance: 0,
          sentiment_counts: { positive: 0, neutral: 0, negative: 0 },
          all_violations: [],
        };
      }

      agentMap[key].total_calls += 1;
      agentMap[key].total_compliance += call.sop_compliance_percentage || 0;

      if (call.sentiment) {
        agentMap[key].sentiment_counts[call.sentiment] =
          (agentMap[key].sentiment_counts[call.sentiment] || 0) + 1;
      }

      if (call.violations && Array.isArray(call.violations)) {
        agentMap[key].all_violations.push(...call.violations);
      }
    });

    const stats = Object.values(agentMap).map((a) => {
      const avgCompliance = a.total_calls > 0
        ? Math.round(a.total_compliance / a.total_calls)
        : 0;

      const violationCounts = {};
      a.all_violations.forEach((v) => {
        violationCounts[v] = (violationCounts[v] || 0) + 1;
      });
      const topViolation = Object.entries(violationCounts)
        .sort((x, y) => y[1] - x[1])[0]?.[0] || null;

      const sentiment = Object.entries(a.sentiment_counts)
        .sort((x, y) => y[1] - x[1])[0]?.[0] || 'neutral';

      return {
        agent_id: a.agent_id,
        agent_name: a.agent_name,
        total_calls: a.total_calls,
        avg_compliance: avgCompliance,
        dominant_sentiment: sentiment,
        top_violation: topViolation,
      };
    });

    stats.sort((a, b) => b.avg_compliance - a.avg_compliance);

    return success(res, stats);
  } catch (err) {
    return error(res, err.message);
  }
};

export const getAgentCalls = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error: dbError } = await supabase
      .from("calls")
      .select("*")
      .eq("agent_id", id)
      .order("created_at", { ascending: false });
    if (dbError) throw new Error(dbError.message);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
};