import supabase from "../services/supabaseService.js";
import { success, error } from "../utils/responseHelper.js";

const MAX_RULES = 10;

export const getRules = async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from("sop_rules")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true });
    if (dbError) throw new Error(dbError.message);
    return success(res, data);
  } catch (err) {
    return error(res, err.message);
  }
};

export const createRule = async (req, res) => {
  try {
    const { rule_text, category } = req.body;
    if (!rule_text || !category) return error(res, "rule_text and category are required", 400);

    // Check max limit
    const { count } = await supabase
      .from("sop_rules")
      .select("*", { count: "exact", head: true })
      .eq("user_id", req.user.id);

    if (count >= MAX_RULES) return error(res, `Maximum ${MAX_RULES} rules allowed`, 400);

    const { data, error: dbError } = await supabase
      .from("sop_rules")
      .insert({ user_id: req.user.id, rule_text, category })
      .select()
      .single();
    if (dbError) throw new Error(dbError.message);
    return success(res, data, "Rule created", 201);
  } catch (err) {
    return error(res, err.message);
  }
};

export const updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { rule_text, category, is_active } = req.body;

    const { data, error: dbError } = await supabase
      .from("sop_rules")
      .update({ rule_text, category, is_active })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();
    if (dbError) throw new Error(dbError.message);
    return success(res, data, "Rule updated");
  } catch (err) {
    return error(res, err.message);
  }
};

export const deleteRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { error: dbError } = await supabase
      .from("sop_rules")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);
    if (dbError) throw new Error(dbError.message);
    return success(res, null, "Rule deleted");
  } catch (err) {
    return error(res, err.message);
  }
};

export const toggleRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: existing } = await supabase
      .from("sop_rules")
      .select("is_active")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single();

    const { data, error: dbError } = await supabase
      .from("sop_rules")
      .update({ is_active: !existing.is_active })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();
    if (dbError) throw new Error(dbError.message);
    return success(res, data, "Rule toggled");
  } catch (err) {
    return error(res, err.message);
  }
};