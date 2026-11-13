import { create } from 'zustand';

interface UIState {
  isMobileNavOpen: boolean;
  isSidebarCollapsed: boolean;
  /** Painel do assistente, aberto pelo botão flutuante (desktop) ou pela barra inferior (celular). */
  isAssistantOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleSidebar: () => void;
  setAssistantOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileNavOpen: false,
  isSidebarCollapsed: false,
  isAssistantOpen: false,
  openMobileNav: () => set({ isMobileNavOpen: true, isAssistantOpen: false }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setAssistantOpen: (open) => set(open ? { isAssistantOpen: true, isMobileNavOpen: false } : { isAssistantOpen: false }),
}));
