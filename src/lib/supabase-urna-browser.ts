import { createBrowserClient } from "@supabase/ssr";

export function createUrnaClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Configure a URL e a chave publica do Supabase no .env.local"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    cookieOptions: {
      name: "cipa-urna-auth",
    },
  });
}
