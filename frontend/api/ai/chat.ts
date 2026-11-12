import { handleChat } from '../../server/ai/handler';
import { serverEnv } from '../../server/env';

export function POST(request: Request) {
  return handleChat(request, serverEnv(process.env));
}
