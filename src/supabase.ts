import { createClient } from '@supabase/supabase-js';
import {
  canSendSupabaseRequest,
  getSupabaseRestriction,
  recordSupabaseNetworkFailure,
  recordSupabaseResponse,
} from './supabaseRestriction';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing. Please check your environment variables.');
}

const supabaseFetch: typeof fetch = async (input, init) => {
  if (!canSendSupabaseRequest()) {
    const paymentRequired = getSupabaseRestriction() === 'payment_required';
    return new Response(JSON.stringify({
      message: paymentRequired
        ? 'Supabase access requires payment attention.'
        : 'Supabase is temporarily unavailable; requests are paused.',
    }), {
      status: paymentRequired ? 402 : 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(input, init);
    recordSupabaseResponse(response.status);
    return response;
  } catch (error) {
    recordSupabaseNetworkFailure();
    throw error;
  }
};

// We provide a custom fetch wrapper to avoid issues with libraries trying to 
// overwrite window.fetch in restricted environments.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: supabaseFetch,
  },
});
