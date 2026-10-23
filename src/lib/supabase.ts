import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string; 

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or key is not defined in environment variables or .env file.');
}   

export const supabase = createClient(supabaseUrl, supabaseKey);