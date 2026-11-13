import { handleDisconnect } from '../../server/pluggy/handlers.js';
import { serverEnv } from '../../server/env.js';

export function POST(request: Request) {
  return handleDisconnect(request, serverEnv(process.env));
}
