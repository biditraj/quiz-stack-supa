import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

const baseUrl = `${SUPABASE_URL}/functions/v1`;

async function extractResponseMessage(res: Response | undefined) {
  if (!res) return '';
  try {
    const data = await res.clone().json();
    if (typeof data === 'string') return data;
    if (data?.error) {
      if (typeof data.error === 'string') return data.error;
      if (typeof data.error?.message === 'string') return data.error.message;
      return JSON.stringify(data.error);
    }
    if (data?.message) return data.message;
    return JSON.stringify(data);
  } catch {
    try { return await res.text(); } catch { return ''; }
  }
}

async function request(path: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getQuestions: async (n = 10, topic?: string, difficulty?: string, includeAnswers?: boolean) => {
    const params = new URLSearchParams();
    params.set('n', String(n));
    if (topic && topic.trim()) params.set('topic', topic.trim());
    if (difficulty && difficulty.trim()) params.set('difficulty', difficulty.trim());
    if (includeAnswers) params.set('include_answers', '1');
    return request(`/get-questions?${params.toString()}`);
  },
  getQuestionsByCategory: async (n = 10, category?: string, includeAnswers?: boolean) => {
    const params = new URLSearchParams();
    params.set('n', String(n));
    if (category && category.trim()) params.set('category', category.trim());
    if (includeAnswers) params.set('include_answers', '1');
    return request(`/get-questions?${params.toString()}`);
  },
  listCategories: async () => request(`/list-categories`),
  getLeaderboard: async (limit = 10) => request(`/get-leaderboard?limit=${limit}`),
  submitQuiz: async (payload: { score: number; accuracy: number; speed: number }) => {
    // First try supabase.functions.invoke (adds auth automatically)
    const inv = await supabase.functions.invoke('submit-quiz', { body: payload });
    if (!inv.error) return inv.data as any;
    // Extract server response for better debugging
    let details = inv.error.message || 'submit-quiz failed';
    const ctxRes: Response | undefined = (inv.error as any)?.context?.response;
    const ctxMsg = await extractResponseMessage(ctxRes);
    if (ctxMsg) details = ctxMsg;
    // Fallback to direct fetch to ensure Authorization header
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (token) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json() as any;
      details = await extractResponseMessage(res) || details;
    }
    throw new Error(details);
  },
  addQuestion: async (payload: {
    type: "multiple_choice" | "true_false" | "fill_blank" | "image_based";
    question_text: string;
    options?: unknown;
    correct_answer: string;
    image_url?: string | null;
    category?: string;
  }) => {
    const inv = await supabase.functions.invoke('add-question', { body: payload });
    if (!inv.error) return inv.data as any;
    let details = inv.error.message || 'add-question failed';
    const ctxRes: Response | undefined = (inv.error as any)?.context?.response;
    const ctxMsg = await extractResponseMessage(ctxRes);
    if (ctxMsg) details = ctxMsg;
    // Fallback to direct fetch to ensure Authorization header
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (token) {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/add-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json() as any;
      details = (await extractResponseMessage(res)) || details;
    }
    // Final fallback: write directly via PostgREST (requires DB admin role via RLS)
    try {
      const resp = await supabase
        .from('questions')
        .insert({
          type: payload.type,
          question_text: payload.question_text,
          options: (payload.options ?? null) as any,
          correct_answer: payload.correct_answer,
          image_url: payload.image_url ?? null,
          // @ts-ignore - category may not exist if migration not applied
          category: (payload as any).category ?? 'General',
        } as any)
        .select('id')
        .single();
      if (!resp.error && resp.data) return { data: resp.data } as any;
      // Retry without category if column missing
      if (resp.error && String(resp.error.message || resp.error).toLowerCase().includes('category')) {
        const alt = await supabase
          .from('questions')
          .insert({
            type: payload.type,
            question_text: payload.question_text,
            options: (payload.options ?? null) as any,
            correct_answer: payload.correct_answer,
            image_url: payload.image_url ?? null,
          } as any)
          .select('id')
          .single();
        if (!alt.error && alt.data) return { data: alt.data } as any;
      }
    } catch {}
    throw new Error(details);
  },
  bulkImportQuestions: async (items: Array<{ type?: "multiple_choice" | "true_false" | "fill_blank" | "image_based"; question_text: string; options?: unknown; correct_answer: string; image_url?: string | null; category?: string }>) => {
    const inv = await supabase.functions.invoke('bulk-import-questions', { body: { items } });
    if (!inv.error) return inv.data as any;
    let details = inv.error.message || 'bulk-import-questions failed';
    const ctxRes: Response | undefined = (inv.error as any)?.context?.response;
    const ctxMsg = await extractResponseMessage(ctxRes);
    if (ctxMsg) details = ctxMsg;
    // Fallback to direct fetch to ensure Authorization header
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (token) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bulk-import-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });
      if (res.ok) return await res.json() as any;
      details = (await extractResponseMessage(res)) || details;
    }
    // Final fallback: client-side chunked insert (requires DB admin role via RLS)
    try {
      const chunkSize = 500;
      let inserted = 0;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        let { error } = await supabase.from('questions').insert(chunk as any);
        if (error && String(error.message || error).toLowerCase().includes('category')) {
          const chunkNoCat = (chunk as any).map(({ category, ...rest }: any) => rest);
          const alt = await supabase.from('questions').insert(chunkNoCat);
          error = alt.error as any;
        }
        if (error) throw error;
        inserted += chunk.length;
      }
      return { data: { inserted } } as any;
    } catch {}
    throw new Error(details);
  },
};


