import { handleRegisterItem } from '../../server/pluggy/handlers';
import { serverEnv } from '../../server/env';

export function POST(request: Request) {
  return handleRegisterItem(request, serverEnv(process.env));
}
