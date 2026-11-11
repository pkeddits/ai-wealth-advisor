import { create } from 'zustand';

interface UIState {
  isMobileNavOpen: boolean;
  isSidebarCollapsed: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileNavOpen: false,
  isSidebarCollapsed: false,
  openMobileNav: () => set({ isMobileNavOpen: true }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
}));
