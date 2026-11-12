import { handleDisconnect } from '../../server/pluggy/handlers';
import { serverEnv } from '../../server/env';

export function POST(request: Request) {
  return handleDisconnect(request, serverEnv(process.env));
}
