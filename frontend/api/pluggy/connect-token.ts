import { handleConnectToken } from '../../server/pluggy/handlers.js';
import { serverEnv } from '../../server/env.js';

export function POST(request: Request) {
  return handleConnectToken(request, serverEnv(process.env));
}
