import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const SUPABASE_URL = "https://kxnzhrzfhoxibdzvikyj.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnpocnpmaG94aWJkenZpa3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjY1MDcsImV4cCI6MjA3MDI0MjUwN30.8DHirjuRPXF8BPrYZP-81usFB--ZJm1pYOEFUOYajoI";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});