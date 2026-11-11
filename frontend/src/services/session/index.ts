import { appMode } from '../../config/appMode';
import { apiSession } from './api';
import { demoSession } from './demo';
import { supabaseSession } from './supabase';

export const session = appMode === 'supabase' ? supabaseSession : appMode === 'api' ? apiSession : demoSession;
export { AuthError } from './types';
export type { SignUpInput, SignUpResult } from './types';
