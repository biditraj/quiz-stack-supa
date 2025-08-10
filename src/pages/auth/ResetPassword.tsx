import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Check your email", description: "We sent a reset link." });
    }
  };

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="rounded-2xl border bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-8 shadow-xl">
          <h2 className="mb-2 text-2xl font-semibold">Reset password</h2>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">Enter your email to receive a reset link.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <Button disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}


