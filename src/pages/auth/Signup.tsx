import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function Signup() {
  const { signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password, username);
    setLoading(false);
    if (!error) navigate("/login");
  };

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="rounded-2xl border bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">Q</div>
            <h2 className="text-2xl font-semibold">Create your account</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Join the leaderboard</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="johndoe" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <Button disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>
          <div className="mt-4">
            <Button type="button" variant="outline" className="w-full" onClick={() => signInWithGoogle()}>
              Sign up with Google
            </Button>
          </div>
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
            Already have an account? <Link to="/login" className="text-blue-600">Log in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}


