import { handleChat } from '../../server/ai/handler.js';
import { serverEnv } from '../../server/env.js';

export function POST(request: Request) {
  return handleChat(request, serverEnv(process.env));
}
