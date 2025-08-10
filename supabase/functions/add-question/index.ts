// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const adminEmailsEnv = (Deno.env.get("ADMIN_EMAILS") || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  const authHeader = req.headers.get("Authorization");
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader ?? "" } },
  });

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Ensure user is admin, or email is allowlisted
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleErr) throw roleErr;
    const userEmail = (user.email || "").toLowerCase();
    const isAllowlisted = userEmail.length > 0 && adminEmailsEnv.includes(userEmail);

    const body = await req.json();
    const { type, question_text, options = null, correct_answer, image_url = null, category = 'General' } = body ?? {};

    if (!type || !question_text || !correct_answer) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Use user-scoped client if true admin (RLS will permit). If allowlisted but not admin,
    // use service role client to bypass RLS safely.
    let data: any = null;
    if (isAdmin) {
      let resp = await supabase
        .from("questions")
        .insert({ type, question_text, options, correct_answer, image_url, category })
        .select("id")
        .single();
      // Fallback if category column is missing
      if (resp.error && String(resp.error?.message || resp.error).toLowerCase().includes('category')) {
        resp = await supabase
          .from("questions")
          .insert({ type, question_text, options, correct_answer, image_url })
          .select("id")
          .single();
      }
      if (resp.error) throw resp.error;
      data = resp.data;
    } else if (isAllowlisted) {
      if (!serviceRoleKey) {
        return new Response(
          JSON.stringify({ error: "Forbidden: service role not configured on function", hint: "Set SUPABASE_SERVICE_ROLE_KEY and ADMIN_EMAILS secrets for this function." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
      const serviceClient = createClient(supabaseUrl, serviceRoleKey);
      let resp = await serviceClient
        .from("questions")
        .insert({ type, question_text, options, correct_answer, image_url, category })
        .select("id")
        .single();
      if (resp.error && String(resp.error?.message || resp.error).toLowerCase().includes('category')) {
        resp = await serviceClient
          .from("questions")
          .insert({ type, question_text, options, correct_answer, image_url })
          .select("id")
          .single();
      }
      if (resp.error) throw resp.error;
      data = resp.data;
    } else {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
