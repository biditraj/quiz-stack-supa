import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

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
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getQuestions: async (n = 10) => request(`/get-questions?n=${n}`),
  getLeaderboard: async (limit = 10) => request(`/get-leaderboard?limit=${limit}`),
  submitQuiz: async (payload: { score: number; accuracy: number; speed: number }) => {
    // First try supabase.functions.invoke (adds auth automatically)
    const inv = await supabase.functions.invoke('submit-quiz', { body: payload });
    if (!inv.error) return { data: inv.data } as any;
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
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return { data: await res.json() } as any;
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
  }) => {
    const inv = await supabase.functions.invoke('add-question', { body: payload });
    if (!inv.error) return { data: inv.data } as any;
    let details = inv.error.message || 'add-question failed';
    const ctxRes: Response | undefined = (inv.error as any)?.context?.response;
    const ctxMsg = await extractResponseMessage(ctxRes);
    if (ctxMsg) details = ctxMsg;
    throw new Error(details);
  },
};


