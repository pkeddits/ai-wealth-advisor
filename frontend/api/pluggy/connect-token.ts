import { handleConnectToken } from '../../server/pluggy/handlers';
import { serverEnv } from '../../server/env';

export function POST(request: Request) {
  return handleConnectToken(request, serverEnv(process.env));
}
