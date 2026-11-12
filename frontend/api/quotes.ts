import { handleQuotesRequest } from '../server/quotes';

export function GET(request: Request) {
  return handleQuotesRequest(request, {
    brapiKey: process.env.BRAPI_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
  });
}
