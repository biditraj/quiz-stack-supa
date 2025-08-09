import { api } from "@/lib/api";

type ExternalQuestion = {
  id: string;
  type: "multiple_choice" | "true_false" | "fill_blank" | "image_based";
  question_text: string;
  options: any;
  image_url?: string | null;
  correct_answer?: string;
};

async function fetchExternalMcqs(count: number, topic?: string): Promise<ExternalQuestion[]> {
  const key = (import.meta.env.VITE_QUESTIONS_API_KEY as string | undefined);
  if (!key) return [];
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const topicLine = topic && topic.trim().length > 0 ? `Topic: ${topic}.` : "General knowledge.";
    const prompt = `Generate ${count} short multiple choice questions as a pure JSON array (no backticks, no prose). Each item must have fields: id, type (always "multiple_choice"), question_text, options (array of 4 concise strings), correct_answer (exactly one of options). Keep questions crisp and unambiguous. ${topicLine}`;
    const res = await model.generateContent(prompt);
    const text = res.response.text();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    const json = JSON.parse(text.slice(start, end + 1));
    return (json as any[]).map((q, i) => ({
      id: q.id || `ext-${Date.now()}-${i}`,
      type: "multiple_choice",
      question_text: q.question_text || q.question || "",
      options: q.options || q.choices || [],
      correct_answer: q.correct_answer || q.answer || "",
      image_url: null,
    }));
  } catch {
    return [];
  }
}

export async function getQuizQuestions(count = 10) {
  // Use Supabase questions only
  const supa = await api.getQuestions(count, undefined, undefined, true);
  const supaQs = (supa as any)?.data || [];
  return supaQs.slice(0, count);
}

export async function getTopicQuestions(topic: string, count = 10) {
  // Prefer Supabase topic filtering only
  const supa = await api.getQuestions(count, topic, undefined, true);
  return (((supa as any)?.data || []) as ExternalQuestion[]).slice(0, count);
}

export type NormalizedQuestion = {
  id: string;
  type: "multiple_choice" | "true_false" | "fill_blank" | "image_based";
  question_text: string;
  options: any;
  image_url?: string | null;
  correct_answer?: string;
  explanation?: string | null;
};

export async function fetchQuestionsFromDB(topic: string, difficulty: string, limit: number): Promise<NormalizedQuestion[]> {
  try {
    const res = await api.getQuestions(limit, topic, difficulty, true);
    const data: any[] = (res as any)?.data || [];
    return data as NormalizedQuestion[];
  } catch {
    return [];
  }
}

// No demo fallback; rely on DB or explicit AI mode
const fallbackQuestions: NormalizedQuestion[] = [];

export async function fetchQuestionsFromAI(topic: string, difficulty: string, limit: number): Promise<NormalizedQuestion[]> {
  const key = (import.meta.env.VITE_QUESTIONS_API_KEY as string | undefined);
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Generate ${limit} multiple-choice quiz questions on ${topic} with difficulty ${difficulty}. Each question should be returned as a pure JSON array (no code fences, no prose) where each item has: id (string), question_text (string), options (array of exactly 4 concise strings), correct_answer_index (0-based index into options), explanation (short string).`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1) return fallbackQuestions.slice(0, limit);
    const raw = JSON.parse(text.slice(start, end + 1));
    const mapped: NormalizedQuestion[] = (raw as any[]).map((q: any, idx: number) => {
      const options: string[] = Array.isArray(q.options) ? q.options : [];
      const idxNum = typeof q.correct_answer_index === "number" ? q.correct_answer_index : 0;
      const safeIndex = Math.max(0, Math.min(options.length - 1, idxNum));
      return {
        id: q.id || `ai-${Date.now()}-${idx}`,
        type: "multiple_choice",
        question_text: q.question_text || q.question || "",
        options,
        correct_answer: options[safeIndex] || "",
        explanation: q.explanation || null,
        image_url: null,
      };
    });
    return mapped.length > 0 ? mapped : fallbackQuestions.slice(0, limit);
  } catch (error) {
    console.error('AI generation error:', error);
    return fallbackQuestions.slice(0, limit);
  }
}

export async function fetchTopicSuggestions(topic: string): Promise<string[]> {
  const trimmed = (topic || '').trim();
  if (!trimmed) return [];
  const key = (import.meta.env.VITE_QUESTIONS_API_KEY as string | undefined) || "AIzaSyDCmMzVSbSl6zq2Z14i3_SVfT4dhytpQ7g";
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a quiz curator. Given the topic "${trimmed}", propose 6 to 10 concise quiz topic suggestions (mix of general and subtopics). Return ONLY a JSON array of strings, no markdown or prose.`;
    const res = await model.generateContent(prompt);
    const text = res.response.text();
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    const arr = JSON.parse(text.slice(start, end + 1));
    return (Array.isArray(arr) ? arr : []).map((s: any) => String(s)).filter(Boolean);
  } catch {
    // Simple fallback: split keywords
    const parts = trimmed.split(/[,;/]|\band\b|\bor\b/gi).map(s => s.trim()).filter(Boolean);
    return Array.from(new Set([trimmed, ...parts])).slice(0, 8);
  }
}


