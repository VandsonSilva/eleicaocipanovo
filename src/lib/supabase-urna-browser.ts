import { createBrowserClient } from "@supabase/ssr";

let urnaClient: ReturnType<typeof createBrowserClient> | null = null;

export function createUrnaClient() {
  if (urnaClient) return urnaClient;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Configure a URL e a chave publica do Supabase no .env.local"
    );
  }

  const client = createBrowserClient(supabaseUrl, supabaseKey, {
    isSingleton: false,
    cookieOptions: {
      name: "cipa-urna-auth",
    },
  });

  urnaClient = client;
  return client;
}
