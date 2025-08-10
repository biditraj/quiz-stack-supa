export type LocalQuestion = {
  id: string;
  type: "multiple_choice" | "true_false" | "fill_blank" | "image_based";
  question_text: string;
  options: string[];
  correct_answer: string;
  image_url?: string | null;
  category?: string;
};

// Minimal local questions to supplement Supabase by category
const DATA: Record<string, LocalQuestion[]> = {
  General: [
    {
      id: "local-gen-1",
      type: "multiple_choice",
      question_text: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Mercury"],
      correct_answer: "Mars",
      image_url: null,
      category: "General",
    },
    {
      id: "local-gen-2",
      type: "multiple_choice",
      question_text: "What is the capital of Japan?",
      options: ["Kyoto", "Seoul", "Tokyo", "Osaka"],
      correct_answer: "Tokyo",
      image_url: null,
      category: "General",
    },
  ],
  Science: [
    {
      id: "local-sci-1",
      type: "multiple_choice",
      question_text: "What is H2O commonly known as?",
      options: ["Oxygen", "Hydrogen", "Salt", "Water"],
      correct_answer: "Water",
      image_url: null,
      category: "Science",
    },
    {
      id: "local-sci-2",
      type: "multiple_choice",
      question_text: "Which gas do plants absorb from the atmosphere?",
      options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Helium"],
      correct_answer: "Carbon Dioxide",
      image_url: null,
      category: "Science",
    },
  ],
  History: [
    {
      id: "local-his-1",
      type: "multiple_choice",
      question_text: "Who was the first President of the United States?",
      options: ["Abraham Lincoln", "Thomas Jefferson", "George Washington", "John Adams"],
      correct_answer: "George Washington",
      image_url: null,
      category: "History",
    },
  ],
};

const LOWER_INDEX = Object.fromEntries(
  Object.entries(DATA).map(([k, v]) => [k.toLowerCase(), v])
);

export function getLocalQuestionsByCategory(category: string, limit = 10): LocalQuestion[] {
  const key = (category || "").toLowerCase();
  const list = LOWER_INDEX[key] || [];
  return list.slice(0, limit);
}
