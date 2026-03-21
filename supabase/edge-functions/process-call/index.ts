// Optional edge function — skip for now, backend handles processing
// Use this later if you want to trigger processing directly from Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { call_id } = await req.json();

  if (!call_id) {
    return new Response(JSON.stringify({ error: "call_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Placeholder — actual processing is handled by Node backend
  return new Response(
    JSON.stringify({ message: `Processing triggered for call ${call_id}` }),
    { headers: { "Content-Type": "application/json" } }
  );
});