import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const n = Number.parseInt(url.searchParams.get("n") ?? "10", 10);
    const topic = (url.searchParams.get("topic") ?? "").trim();
    const difficulty = (url.searchParams.get("difficulty") ?? "").trim();
    const includeAnswers = (url.searchParams.get("include_answers") ?? "").trim() === '1';

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // If a topic is provided, filter by it using ILIKE and then randomly sample in code.
    // Difficulty is accepted but ignored here since schema has no difficulty column yet.
    if (topic.length > 0) {
      const selectCols = includeAnswers
        ? "id,type,question_text,options,image_url,correct_answer"
        : "id,type,question_text,options,image_url";
      const { data: filtered, error: filterErr } = await supabase
        .from("questions")
        .select(selectCols)
        .ilike("question_text", `%${topic}%`)
        .limit(Math.max(n * 5, 50));
      if (filterErr) throw filterErr;
      const pool = Array.isArray(filtered) ? filtered : [];
      // Shuffle and take n
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const sampled = pool.slice(0, n);
      if (sampled.length > 0) {
        return new Response(JSON.stringify({ data: sampled }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      // Fallback to random if no matches found
      if (includeAnswers) {
        const { data, error } = await supabase
          .from('questions')
          .select('id,type,question_text,options,image_url,correct_answer')
          .order('created_at', { ascending: false })
          .limit(Math.max(n * 5, 50));
        if (error) throw error;
        const pool2 = Array.isArray(data) ? data : [];
        for (let i = pool2.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool2[i], pool2[j]] = [pool2[j], pool2[i]];
        }
        const sampled2 = pool2.slice(0, n);
        return new Response(JSON.stringify({ data: sampled2 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        const { data, error } = await supabase.rpc("get_random_questions", { n });
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Default: call RPC for random questions
    if (includeAnswers) {
      const { data, error } = await supabase
        .from('questions')
        .select('id,type,question_text,options,image_url,correct_answer')
        .order('created_at', { ascending: false })
        .limit(Math.max(n * 5, 50));
      if (error) throw error;
      const pool = Array.isArray(data) ? data : [];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const sampled = pool.slice(0, n);
      return new Response(JSON.stringify({ data: sampled }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data, error } = await supabase.rpc("get_random_questions", { n });
    if (error) throw error;

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
