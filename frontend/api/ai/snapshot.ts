import { handleSnapshot } from '../../server/ai/handler.js';
import { serverEnv } from '../../server/env.js';

export function POST(request: Request) {
  return handleSnapshot(request, serverEnv(process.env));
}
