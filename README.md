# QuizStack

AI-powered quizzes with a polished dark mode, LeetCode-inspired leaderboard, and Supabase-backed results.

## Getting Started

Requirements: Node.js (LTS) and npm

```sh
npm i
npm run dev
```

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- React Query
- Supabase (data + edge functions)

## Environment

Create a `.env.local` with:

```
VITE_QUESTIONS_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Scripts

- `npm run dev` — start local dev server
- `npm run build` — build for production
- `npm run preview` — preview production build

## License

MIT
