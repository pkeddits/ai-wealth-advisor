import { handleRegisterItem } from '../../server/pluggy/handlers.js';
import { serverEnv } from '../../server/env.js';

export function POST(request: Request) {
  return handleRegisterItem(request, serverEnv(process.env));
}
