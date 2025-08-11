import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ResetPassword from "@/pages/auth/ResetPassword";
import QuizPage from "@/pages/quiz/QuizPage";
import Leaderboard from "@/pages/leaderboard/Leaderboard";
import AddQuestion from "@/pages/admin/AddQuestion";
import Profile from "@/pages/admin/Profile";
import NotFound from "@/pages/NotFound";

// Challenge Pages
import ChallengesPage from "@/pages/challenges/ChallengesPage";

import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="quiz-theme">
        <TooltipProvider>
          <AuthProvider>
            <Router>
              <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
                <Navbar />
                <main className="flex-1">
                  <AnimatedRoutes />
                </main>
                <Footer />
              </div>
            </Router>
            <Toaster />
            <Sonner />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

function AnimatedRoutes() {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/quiz"
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/challenges"
            element={
              <ProtectedRoute>
                <ChallengesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/add-question"
            element={
              <AdminRoute>
                <AddQuestion />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <AdminRoute>
                <Profile />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
