import { handleSync } from '../../server/pluggy/handlers';
import { serverEnv } from '../../server/env';

export function POST(request: Request) {
  return handleSync(request, serverEnv(process.env));
}
