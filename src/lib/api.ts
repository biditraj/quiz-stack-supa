import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const baseUrl = `${SUPABASE_URL}/functions/v1`;

async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function request(path: string, init?: RequestInit & { auth?: boolean }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  };
  if (init?.auth) {
    Object.assign(headers, await getAuthHeader());
  }
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getQuestions: async (n = 10) => {
    return request(`/get-questions?n=${n}`);
  },
  getLeaderboard: async (limit = 10) => {
    return request(`/get-leaderboard?limit=${limit}`);
  },
  submitQuiz: async (payload: { score: number; accuracy: number; speed: number }) => {
    return request(`/submit-quiz`, { method: "POST", body: JSON.stringify(payload), auth: true });
  },
  addQuestion: async (payload: {
    type: "multiple_choice" | "true_false" | "fill_blank" | "image_based";
    question_text: string;
    options?: unknown;
    correct_answer: string;
    image_url?: string | null;
  }) => {
    return request(`/add-question`, { method: "POST", body: JSON.stringify(payload), auth: true });
  },
};


