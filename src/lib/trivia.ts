function decodeHtml(input: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = input;
  return txt.value;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type TriviaCategory = { id: number; name: string };

export async function getTriviaCategories(): Promise<TriviaCategory[]> {
  const res = await fetch('https://opentdb.com/api_category.php');
  const json = await res.json();
  return (json?.trivia_categories || []).map((c: any) => ({ id: c.id, name: c.name }));
}

export type TriviaFetchParams = {
  amount: number;
  categoryId?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'multiple' | 'boolean';
};

export type NormalizedQuestion = {
  id: string;
  type: 'multiple_choice' | 'true_false';
  question_text: string;
  options: string[];
  correct_answer: string;
  image_url?: string | null;
};

export async function getTriviaQuestions({ amount, categoryId, difficulty, type }: TriviaFetchParams): Promise<NormalizedQuestion[]> {
  const params = new URLSearchParams();
  params.set('amount', String(amount));
  if (categoryId) params.set('category', String(categoryId));
  if (difficulty) params.set('difficulty', difficulty);
  if (type) params.set('type', type);

  const res = await fetch(`https://opentdb.com/api.php?${params.toString()}`);
  const json = await res.json();
  const results = json?.results || [];
  return results.map((q: any, idx: number) => {
    const question = decodeHtml(q.question);
    const correct = decodeHtml(q.correct_answer);
    const incorrect = (q.incorrect_answers || []).map((a: string) => decodeHtml(a));
    const options = q.type === 'boolean' ? ['True', 'False'] : shuffleArray([correct, ...incorrect]);
    return {
      id: `trivia-${Date.now()}-${idx}`,
      type: q.type === 'boolean' ? 'true_false' : 'multiple_choice',
      question_text: question,
      options,
      correct_answer: correct,
      image_url: null,
    } as NormalizedQuestion;
  });
}


