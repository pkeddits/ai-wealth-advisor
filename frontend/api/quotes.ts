import { handleQuotesRequest } from '../server/quotes.js';
import { quotesEnv } from '../server/env.js';

export function GET(request: Request) {
  return handleQuotesRequest(request, quotesEnv(process.env));
}
