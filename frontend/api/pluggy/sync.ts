import { handleSync } from '../../server/pluggy/handlers.js';
import { serverEnv } from '../../server/env.js';

export function POST(request: Request) {
  return handleSync(request, serverEnv(process.env));
}
