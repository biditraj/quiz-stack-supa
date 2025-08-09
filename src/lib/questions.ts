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
  const key = (import.meta.env.VITE_QUESTIONS_API_KEY as string | undefined) ?? "AIzaSyBBNyXwqSL808ZNAb-pz4dl7FQw3FxDR_E";
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
  const key = (import.meta.env.VITE_QUESTIONS_API_KEY as string | undefined) ?? "AIzaSyBBNyXwqSL808ZNAb-pz4dl7FQw3FxDR_E";
  if (!key) {
    console.error('No API key available for AI generation');
    return [];
  }

  console.log(`Starting AI generation for topic: "${topic}", difficulty: "${difficulty}", limit: ${limit}`);

  // Multiple attempts with different strategies
  const attempts = [
    // Attempt 1: Detailed prompt with specific format
    async () => {
      console.log('AI Attempt 1: Using detailed prompt with Gemini SDK');
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const topicLine = topic && topic.trim().length > 0 ? `Topic: ${topic}.` : "General knowledge.";
      const prompt = `Generate ${limit} multiple choice questions about ${topicLine} Difficulty: ${difficulty}. Return ONLY a JSON array with this exact format: [{"question_text": "question here", "options": ["A", "B", "C", "D"], "correct_answer": "exact option text"}]`;
      
      console.log('AI Attempt 1 - Sending prompt:', prompt);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      const generationPromise = model.generateContent(prompt);
      const res = await Promise.race([generationPromise, timeoutPromise]) as any;
      
      const text = res.response.text();
      console.log('AI Attempt 1 - Response length:', text.length);
      console.log('AI Attempt 1 - Response preview:', text.substring(0, 200) + '...');
      
      return parseAIResponse(text);
    },
    
    // Attempt 2: Simpler prompt with different format
    async () => {
      console.log('AI Attempt 2: Using simpler prompt with Gemini SDK');
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const simplePrompt = `Create ${limit} multiple choice questions about ${topic}. Return as JSON array: [{"question": "question text", "options": ["A", "B", "C", "D"], "answer": "correct option"}]`;
      
      console.log('AI Attempt 2 - Sending prompt:', simplePrompt);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      const generationPromise = model.generateContent(simplePrompt);
      const res = await Promise.race([generationPromise, timeoutPromise]) as any;
      
      const text = res.response.text();
      console.log('AI Attempt 2 - Response length:', text.length);
      console.log('AI Attempt 2 - Response preview:', text.substring(0, 200) + '...');
      
      return parseAIResponse(text, true);
    },
    
    // Attempt 3: Direct REST API call as last resort
    async () => {
      console.log('AI Attempt 3: Using direct REST API call');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      const fetchPromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate ${limit} multiple choice questions about ${topic}. Return as JSON array: [{"question": "question text", "options": ["A", "B", "C", "D"], "answer": "correct option"}]`
            }]
          }]
        })
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`REST API failed: ${response.status} - ${errorText}`);
        
        // Check for quota exceeded error
        if (response.status === 429) {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.code === 429) {
            throw new Error('QUOTA_EXCEEDED: Daily API quota limit reached. Please try again tomorrow or upgrade your plan.');
          }
        }
        
        throw new Error(`REST API failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('AI Attempt 3 - REST Response length:', text.length);
      console.log('AI Attempt 3 - REST Response preview:', text.substring(0, 200) + '...');
      
      return parseAIResponse(text, true);
    }
  ];

  // Try each attempt
  for (let i = 0; i < attempts.length; i++) {
    try {
      console.log(`Trying AI attempt ${i + 1}...`);
      const questions = await attempts[i]();
      if (questions && questions.length > 0) {
        console.log(`AI attempt ${i + 1} succeeded with ${questions.length} questions`);
        console.log('Sample question:', questions[0]);
        return questions;
      } else {
        console.log(`AI attempt ${i + 1} returned empty result`);
      }
    } catch (error) {
      console.error(`AI attempt ${i + 1} failed:`, error);
      
      // Check if it's a quota exceeded error
      if (error instanceof Error && error.message.includes('QUOTA_EXCEEDED')) {
        console.error('API quota exceeded - stopping further attempts');
        throw error; // Re-throw to be handled by the caller
      }
    }
  }

  console.error('All AI attempts failed - no questions generated');
  return [];
}

// Helper function to parse AI responses
function parseAIResponse(text: string, isSimpleFormat = false): NormalizedQuestion[] {
  try {
    console.log('Parsing AI response, length:', text.length);
    console.log('Raw text preview:', text.substring(0, 300) + '...');
    
    // Try to find JSON array in the response
    let jsonText = text;
    
    // Look for JSON array markers
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    
    if (start !== -1 && end !== -1 && end > start) {
      jsonText = text.slice(start, end + 1);
      console.log('Found JSON array markers, extracted:', jsonText.substring(0, 200) + '...');
    } else {
      // Try to extract JSON from markdown code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*(\[.*?\])\s*```/s);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
        console.log('Found JSON in code block, extracted:', jsonText.substring(0, 200) + '...');
      } else {
        console.log('No JSON array markers or code blocks found');
        console.log('Full text:', text);
        return [];
      }
    }
    
    // Clean up the JSON text
    jsonText = jsonText.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
    jsonText = jsonText.replace(/,\s*]/g, ']'); // Remove trailing commas
    jsonText = jsonText.replace(/,\s*}/g, '}'); // Remove trailing commas in objects
    
    console.log('Cleaned JSON text:', jsonText.substring(0, 300) + '...');
    
    const json = JSON.parse(jsonText);
    if (!Array.isArray(json)) {
      console.log('Parsed JSON is not an array:', json);
      return [];
    }
    
    console.log('Successfully parsed JSON array with', json.length, 'items');
    
    const questions = json.map((q: any, i: number) => {
      if (isSimpleFormat) {
        return {
          id: `ai-simple-${Date.now()}-${i}`,
          type: "multiple_choice" as const,
          question_text: q.question || q.question_text || "",
          options: q.options || q.choices || [],
          correct_answer: q.answer || q.correct_answer || "",
          explanation: null,
          image_url: null,
        };
      } else {
        return {
          id: q.id || `ai-${Date.now()}-${i}`,
          type: "multiple_choice" as const,
          question_text: q.question_text || q.question || "",
          options: q.options || q.choices || [],
          correct_answer: q.correct_answer || q.answer || "",
          explanation: q.explanation || null,
          image_url: null,
        };
      }
    }).filter(q => {
      const isValid = q.question_text && 
        q.question_text.trim().length > 0 && 
        Array.isArray(q.options) && 
        q.options.length >= 2 && 
        q.correct_answer;
      
      if (!isValid) {
        console.log('Filtered out invalid question:', q);
      }
      
      return isValid;
    });
    
    console.log('Filtered to', questions.length, 'valid questions');
    if (questions.length > 0) {
      console.log('Sample valid question:', questions[0]);
    }
    
    return questions;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.log('Raw text was:', text);
    return [];
  }
}

export async function fetchTopicSuggestions(topic: string): Promise<string[]> {
  const trimmed = (topic || '').trim();
  if (!trimmed) return [];
  const key = (import.meta.env.VITE_QUESTIONS_API_KEY as string | undefined) ?? "AIzaSyBBNyXwqSL808ZNAb-pz4dl7FQw3FxDR_E";
  if (!key) return [];
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


