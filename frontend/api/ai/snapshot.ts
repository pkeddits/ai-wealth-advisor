import { handleSnapshot } from '../../server/ai/handler';
import { serverEnv } from '../../server/env';

export function POST(request: Request) {
  return handleSnapshot(request, serverEnv(process.env));
}
