import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'dark' | 'system' | 'light';
export type MotionPreference = 'full' | 'reduced' | 'off';
export type DensityPreference = 'comfortable' | 'compact';
export type DateFormatPreference = 'dd/mm/aaaa' | 'aaaa-mm-dd' | 'extenso';
export type ValueDisplayPreference = 'full' | 'rounded';
export type ReturnDisplayPreference = 'percent' | 'absolute' | 'both';
export type HomePagePreference = '/dashboard' | '/portfolios';

export interface NotificationPreferences {
  email: boolean;
  system: boolean;
  goals: boolean;
}

export interface Preferences {
  theme: ThemePreference;
  motion: MotionPreference;
  density: DensityPreference;
  effects: boolean;
  dateFormat: DateFormatPreference;
  valueDisplay: ValueDisplayPreference;
  returnDisplay: ReturnDisplayPreference;
  homePage: HomePagePreference;
  notifications: NotificationPreferences;
  /** Gradiente do avatar (índice em AVATAR_GRADIENTS) ou imagem reduzida em data URL. */
  avatar: { kind: 'gradient'; index: number } | { kind: 'image'; dataUrl: string };
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  motion: 'full',
  density: 'comfortable',
  effects: true,
  dateFormat: 'dd/mm/aaaa',
  valueDisplay: 'full',
  returnDisplay: 'both',
  homePage: '/dashboard',
  notifications: { email: false, system: true, goals: true },
  avatar: { kind: 'gradient', index: 0 },
};

interface PreferencesState extends Preferences {
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      set: (key, value) => set({ [key]: value } as Partial<PreferencesState>),
      reset: () => set(DEFAULT_PREFERENCES),
    }),
    { name: 'aiwa.preferences.v1', version: 1 },
  ),
);
