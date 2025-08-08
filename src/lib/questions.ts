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
  const key = (import.meta.env.VITE_QUESTIONS_API_KEY as string | undefined) || "AIzaSyDCmMzVSbSl6zq2Z14i3_SVfT4dhytpQ7g";

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
  const supa = await api.getQuestions(count, topic);
  return ((supa as any)?.data || []) as ExternalQuestion[];
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
    return data.length > 0 ? data as NormalizedQuestion[] : fallbackQuestions.slice(0, limit);
  } catch {
    return fallbackQuestions.slice(0, limit);
  }
}

// Fallback questions when database is empty
const fallbackQuestions: NormalizedQuestion[] = [
  {
    id: 'fallback-1',
    type: 'multiple_choice',
    question_text: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correct_answer: 'Paris',
    image_url: null,
    explanation: 'Paris is the capital and largest city of France.'
  },
  {
    id: 'fallback-2',
    type: 'multiple_choice',
    question_text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correct_answer: 'Mars',
    image_url: null,
    explanation: 'Mars appears red due to iron oxide on its surface.'
  },
  {
    id: 'fallback-3',
    type: 'multiple_choice',
    question_text: 'What is the largest ocean on Earth?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
    correct_answer: 'Pacific Ocean',
    image_url: null,
    explanation: 'The Pacific Ocean covers about one-third of the Earth\'s surface.'
  },
  {
    id: 'fallback-4',
    type: 'multiple_choice',
    question_text: 'Who wrote "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    correct_answer: 'William Shakespeare',
    image_url: null,
    explanation: 'William Shakespeare wrote this famous tragedy in the late 16th century.'
  },
  {
    id: 'fallback-5',
    type: 'multiple_choice',
    question_text: 'What is the chemical symbol for gold?',
    options: ['Ag', 'Au', 'Fe', 'Cu'],
    correct_answer: 'Au',
    image_url: null,
    explanation: 'Au comes from the Latin word for gold, "aurum".'
  }
];

export async function fetchQuestionsFromAI(topic: string, difficulty: string, limit: number): Promise<NormalizedQuestion[]> {
  const key = (import.meta.env.VITE_QUESTIONS_API_KEY as string | undefined) || "AIzaSyDCmMzVSbSl6zq2Z14i3_SVfT4dhytpQ7g";
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


