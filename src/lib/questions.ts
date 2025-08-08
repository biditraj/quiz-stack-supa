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
  const key = import.meta.env.VITE_QUESTIONS_API_KEY as string | undefined;
  if (!key) return [];

  // Example: use Google Generative AI to generate MCQs. Keep it bounded and simple.
  // NOTE: This keeps generation client-side only when explicitly configured.
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const topicLine = topic && topic.trim().length > 0 ? `Topic: ${topic}.` : "General knowledge.";
    const prompt = `Generate ${count} short multiple choice questions as a pure JSON array (no backticks, no prose). Each item must have fields: id, type (always "multiple_choice"), question_text, options (array of 4 concise strings), correct_answer (exactly one of options). Keep questions crisp and unambiguous. ${topicLine}`;
    const res = await model.generateContent(prompt);
    const text = res.response.text();
    // Try to extract JSON
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
  // Prefer Supabase questions; if external key present, prepend some MCQs
  const [external, supa] = await Promise.all([
    fetchExternalMcqs(Math.min(5, count)),
    api.getQuestions(count),
  ]);
  const supaQs = (supa as any)?.data || [];
  // Normalize: if external questions have correct_answer we keep it; supabase Edge already returns correct answers in payload for client-side feedback only if function does so. If not, client feedback for external only.
  return [...external, ...supaQs].slice(0, count);
}

export async function getTopicQuestions(topic: string, count = 10) {
  // Try Gemini topic generation first, then fall back to Supabase
  const ext = await fetchExternalMcqs(count, topic);
  if (ext.length) return ext.slice(0, count);
  const supa = await api.getQuestions(count);
  return ((supa as any)?.data || []) as ExternalQuestion[];
}


