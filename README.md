# QuizStack

AI-powered quizzes with a polished dark mode, LeetCode-inspired leaderboard, and Supabase-backed results.

## 🚀 Quick Start

```sh
# Install dependencies (using Bun)
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

## 📚 Documentation

- **[Frontend Guide](docs/README_FRONTEND.md)** - Detailed frontend documentation
- **[Friend Challenges Setup](docs/FRIEND_CHALLENGES_SETUP.md)** - Multiplayer challenge system setup
- **[Database Scripts](scripts/)** - SQL scripts and database utilities

## 🛠️ Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (database + edge functions)
- **State Management**: React Query
- **Package Manager**: Bun

## 🔧 Environment Setup

Create a `.env.local` with:

```env
VITE_QUESTIONS_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📁 Project Structure

```
├── src/                    # Frontend source code
├── supabase/              # Supabase configuration & functions
├── docs/                  # Documentation files
├── scripts/               # Database scripts & utilities
├── public/                # Static assets
└── dist/                  # Build output
```

## 🎯 Available Scripts

- `bun run dev` — Start local development server
- `bun run build` — Build for production
- `bun run preview` — Preview production build
- `bun run lint` — Run ESLint

## 🗄️ Database

The project uses Supabase with:
- User authentication and profiles
- Quiz questions and categories
- Leaderboard and scoring
- Friend challenges system
- Real-time presence

## 📝 License

MIT
