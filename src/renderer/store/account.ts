'use client';

import { create } from 'zustand';
import type { ProviderAccount } from '../../shared/music/providers';

interface AccountState {
  loggedIn: boolean;
  account: ProviderAccount | null;
  /** 从主进程同步一次登录态（启动时与扫码成功后调用）。 */
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAccountStore = create<AccountState>((set) => ({
  loggedIn: false,
  account: null,

  refresh: async () => {
    if (typeof window.musicOS?.getNeteaseAuthStatus !== 'function') {
      return;
    }
    try {
      const status = await window.musicOS.getNeteaseAuthStatus();
      set({ loggedIn: Boolean(status?.loggedIn), account: status?.account ?? null });
    } catch {
      // 登录态未知时保持原值，不影响播放
    }
  },

  logout: async () => {
    if (typeof window.musicOS?.logoutNetease !== 'function') {
      return;
    }
    try {
      await window.musicOS.logoutNetease();
    } finally {
      set({ loggedIn: false, account: null });
    }
  },
}));
