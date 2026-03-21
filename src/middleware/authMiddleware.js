import supabase from "../services/supabaseService.js";
import { error } from "../utils/responseHelper.js";

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return error(res, "Unauthorized - No token provided", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return error(res, "Unauthorized - Invalid token", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    return error(res, "Unauthorized - Token verification failed", 401);
  }
};