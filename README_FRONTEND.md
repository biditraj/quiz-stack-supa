# QuizMaster Frontend

A beautiful, modern React frontend for the QuizMaster quiz platform built with Vite, Tailwind CSS, and Framer Motion.

## ✨ Features

- **Modern UI Design**: Clean, beautiful interface with glassmorphism effects and gradients
- **Smooth Animations**: Framer Motion powered micro-animations and page transitions
- **Responsive Design**: Mobile-first approach with perfect adaptation to all screen sizes
- **Dark/Light Mode**: Seamless theme switching with system preference detection
- **Authentication**: Secure email/password and Google OAuth integration via Supabase Auth
- **Real-time Quiz System**: Interactive quiz experience with immediate feedback
- **Leaderboard**: Competitive ranking system with live updates
- **Admin Panel**: Question management for administrators
- **TypeScript**: Full type safety throughout the application

## 🚀 Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Lightning fast build tool
- **TypeScript** - Type safety and better DX
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Supabase** - Backend as a service
- **React Query** - Server state management
- **React Router** - Client-side routing
- **Radix UI** - Accessible component primitives
- **Lucide Icons** - Beautiful icon library

## 🎨 Design System

### Colors
- **Primary**: `#3B82F6` (blue-500)
- **Accent**: `#F59E0B` (amber-500)  
- **Background**: `#F9FAFB` (gray-50)
- **Dark Mode**: `#111827` (gray-900)

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700, 800, 900

### Components
- **Cards**: Glassmorphism with `backdrop-blur-md` and soft shadows
- **Buttons**: Gradient backgrounds with hover effects
- **Animations**: Fade + slide transitions for smooth UX

## 📦 Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   ├── layout/         # Layout components (Navbar, Footer)
│   └── auth/           # Authentication guards
├── pages/              # Route components
│   ├── auth/           # Login, Signup pages
│   ├── quiz/           # Quiz interface
│   ├── leaderboard/    # Leaderboard display
│   └── admin/          # Admin panel
├── contexts/           # React contexts
├── lib/                # Utility functions
├── integrations/       # Third-party integrations
└── hooks/              # Custom React hooks
```

## 🔒 Authentication

The app uses Supabase Auth with:

- **Email/Password** authentication
- **Google OAuth** integration  
- **Protected routes** for authenticated users
- **Admin routes** for administrators
- **Automatic session management**

## 🎯 Key Pages

### Home (`/`)
- Hero section with compelling CTAs
- Feature showcase
- Responsive design with animations

### Quiz (`/quiz`) 
- Interactive question interface
- Multiple question types support:
  - Multiple choice
  - True/false  
  - Fill in the blank
  - Image-based questions
- Real-time scoring and feedback
- Smooth question transitions
- Progress tracking

### Leaderboard (`/leaderboard`)
- Live ranking updates
- Score, accuracy, and speed metrics
- Animated rank changes
- User avatars and profiles

### Admin (`/admin/add-question`)
- Question creation interface
- Support for all question types
- JSON option formatting
- Image URL integration

## 🔧 API Integration

The frontend connects to Supabase Edge Functions:

- `GET /functions/v1/get-questions` - Fetch quiz questions
- `GET /functions/v1/get-leaderboard` - Get rankings
- `POST /functions/v1/submit-quiz` - Submit quiz results
- `POST /functions/v1/add-question` - Add new questions (admin)

## 🌓 Theme System

- **Light Mode**: Clean, bright interface
- **Dark Mode**: Rich dark theme with proper contrast
- **System Mode**: Auto-detection of OS preference
- **Persistent**: Theme choice saved to localStorage

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: 
  - Mobile: `< 768px`
  - Tablet: `768px - 1024px`  
  - Desktop: `> 1024px`
- **Touch Friendly**: Appropriate tap targets
- **Performance**: Optimized images and animations

---

Built with ❤️ using React, Vite, and Supabase


