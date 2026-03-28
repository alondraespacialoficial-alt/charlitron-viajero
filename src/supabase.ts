import { createClient } from '@supabase/supabase-js';

// Use environment variables with hardcoded fallbacks as provided by the user
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://osulhjzqgqzodyjamrmn.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdWxoanpxZ3F6b2R5amFtcm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDIwNzMsImV4cCI6MjA4ODQ3ODA3M30.0TImrXhmNZfnbQxWTEH4gyn5NOcbyzxX-OMniJZaUEU";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing. Please check your environment variables.');
}

// We provide a custom fetch wrapper to avoid issues with libraries trying to 
// overwrite window.fetch in restricted environments.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (input, init) => fetch(input, init),
  },
});
