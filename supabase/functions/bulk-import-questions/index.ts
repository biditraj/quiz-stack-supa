// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type IncomingItem = {
  type?: "multiple_choice" | "true_false" | "fill_blank" | "image_based";
  question_text: string;
  options?: any;
  correct_answer: string;
  image_url?: string | null;
  category?: string;
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

    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleErr) throw roleErr;
    const userEmail = (user.email || "").toLowerCase();
    const isAllowlisted = userEmail.length > 0 && adminEmailsEnv.includes(userEmail);

    const body = await req.json();
    const items: IncomingItem[] = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const normalizeAnswer = (ans: any, options: any): string => {
      const val = String(ans ?? "").trim();
      if (!Array.isArray(options)) return val;
      // Accept numeric index (1-based or 0-based)
      const asNum = Number(val);
      if (!Number.isNaN(asNum)) {
        const zeroIdx = asNum > 0 ? asNum - 1 : asNum;
        if (options[zeroIdx] != null) return String(options[zeroIdx]);
      }
      // Accept letter A-D or a-d
      if (/^[A-Da-d]$/.test(val)) {
        const zeroIdx = val.toUpperCase().charCodeAt(0) - 65; // A -> 0
        if (options[zeroIdx] != null) return String(options[zeroIdx]);
      }
      return val;
    };

    const rows = items
      .map((raw) => {
        const type = (raw.type || "multiple_choice") as IncomingItem["type"];
        const question_text = String(raw.question_text || "").trim();
        const image_url = raw.image_url ?? null;
        const category = String(raw.category || "General").trim() || "General";

        let options = raw.options ?? null;
        if (Array.isArray(options)) {
          options = options.map((o) => String(o));
        }

        let correct_answer = normalizeAnswer(raw.correct_answer, options);

        if (!question_text || !correct_answer) return null;
        if (type === "multiple_choice") {
          if (!Array.isArray(options) || options.length < 2) return null;
          const match = options.find((o: string) => String(o).trim().toLowerCase() === String(correct_answer).trim().toLowerCase());
          if (!match) return null;
          correct_answer = match; // ensure exact value from options
        }

        return { type, question_text, options, correct_answer, image_url, category };
      })
      .filter(Boolean);

    if (!rows.length) {
      return new Response(JSON.stringify({ error: "No valid items after validation" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Insert in chunks, using user client if admin, else service role if allowlisted
    let inserted = 0;
    const chunkSize = 500;
    if (isAdmin) {
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        let { error } = await supabase.from("questions").insert(chunk);
        if (error && String(error?.message || error).toLowerCase().includes('category')) {
          const chunkNoCat = chunk.map(({ category, ...rest }) => rest);
          const alt = await supabase.from("questions").insert(chunkNoCat);
          error = alt.error;
        }
        if (error) throw error;
        inserted += chunk.length;
      }
    } else if (isAllowlisted) {
      if (!serviceRoleKey) {
        return new Response(
          JSON.stringify({ error: "Forbidden: service role not configured on function", hint: "Set SUPABASE_SERVICE_ROLE_KEY and ADMIN_EMAILS secrets for this function." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
      const serviceClient = createClient(supabaseUrl, serviceRoleKey);
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        let { error } = await serviceClient.from("questions").insert(chunk);
        if (error && String(error?.message || error).toLowerCase().includes('category')) {
          const chunkNoCat = chunk.map(({ category, ...rest }) => rest);
          const alt = await serviceClient.from("questions").insert(chunkNoCat);
          error = alt.error;
        }
        if (error) throw error;
        inserted += chunk.length;
      }
    } else {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    return new Response(JSON.stringify({ data: { inserted } }), {
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


