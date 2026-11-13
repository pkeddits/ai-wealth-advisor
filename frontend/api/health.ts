import { handleHealth } from '../server/health.js';

export function GET(request: Request) {
  return handleHealth(request, process.env);
}
