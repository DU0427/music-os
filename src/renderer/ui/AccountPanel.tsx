'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2, LogIn, LogOut, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccountStore } from '../store/account';

type Phase = 'idle' | 'loading' | 'confirmed' | 'error';

/**
 * 账号面板：打开网易云官方登录窗口完成扫码与安全验证
 * （官方会要求「选择网络环境」等步骤，直接调 /api 登录会被判为不支持的旧客户端并返回 8821），
 * Cookie 落在同一持久化分区，登录后显示头像/昵称与退出。
 */
export default function AccountPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const loggedIn = useAccountStore((s) => s.loggedIn);
  const account = useAccountStore((s) => s.account);
  const refresh = useAccountStore((s) => s.refresh);
  const logout = useAccountStore((s) => s.logout);

  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    if (!isOpen) {
      setPhase('idle');
      return;
    }
    void refresh();
  }, [isOpen, refresh]);

  const openLoginWindow = async () => {
    if (typeof window.musicOS?.openNeteaseLoginWindow !== 'function') {
      setPhase('error');
      return;
    }
    setPhase('loading');
    try {
      const result = await window.musicOS.openNeteaseLoginWindow();
      if (result) {
        await refresh();
        setPhase('confirmed');
        window.setTimeout(() => onClose(), 1000);
        return;
      }
      // 未完成登录（关窗 / 超时）→ 回到待登录态
      setPhase('idle');
    } catch {
      setPhase('error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32 }}
        >
          <div
            className="absolute inset-0"
            onClick={onClose}
            style={{ background: 'rgba(3,3,5,0.72)', backdropFilter: 'blur(18px) saturate(1.1)', WebkitBackdropFilter: 'blur(18px) saturate(1.1)' }}
          />

          <motion.div
            className="relative z-10"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 360,
              padding: '22px 24px 24px',
              borderRadius: 20,
              background: 'var(--mo-bg-elevated-strong)',
              border: '1px solid var(--mo-line)',
              boxShadow: 'var(--mo-shadow-glass), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
              <div>
                <div className="font-mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mo-accent)' }}>
                  网易云账号
                </div>
                <div style={{ marginTop: 6, fontSize: 16, fontWeight: 500, color: 'var(--mo-ink)' }}>
                  {loggedIn ? '已登录' : '登录'}
                </div>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={onClose}
                className="grid place-items-center rounded-full transition-colors"
                style={{ width: 28, height: 28, color: 'var(--mo-ink-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--mo-line)', cursor: 'pointer' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {loggedIn ? (
              <div className="flex flex-col items-center" style={{ gap: 12 }}>
                {account?.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt=""
                    style={{ width: 72, height: 72, borderRadius: 999, border: '1px solid var(--mo-line)', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--mo-accent-ghost)', border: '1px solid var(--mo-line)' }} />
                )}
                <div style={{ fontSize: 14, color: 'var(--mo-ink)' }}>{account?.nickname ?? '网易云用户'}</div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex items-center justify-center gap-2 rounded-full"
                  style={{
                    marginTop: 6,
                    padding: '9px 18px',
                    fontSize: 12,
                    color: 'var(--mo-ink-soft)',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--mo-line)',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  退出登录
                </button>
                <div style={{ fontSize: 11, color: 'var(--mo-ink-faint)', textAlign: 'center', lineHeight: 1.6 }}>
                  登录后可播放会员曲目，并解锁每日推荐等个性化内容。
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center" style={{ gap: 12 }}>
                <div
                  className="grid place-items-center"
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 24,
                    background: 'linear-gradient(140deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                    border: '1px solid var(--mo-line)',
                  }}
                >
                  <LogIn className="h-7 w-7" style={{ color: 'var(--mo-ink-muted)' }} />
                </div>

                <button
                  type="button"
                  onClick={() => void openLoginWindow()}
                  disabled={phase === 'loading' || phase === 'confirmed'}
                  className="flex items-center justify-center"
                  style={{
                    gap: 8,
                    marginTop: 4,
                    padding: '10px 20px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--mo-accent-contrast)',
                    background: 'var(--mo-accent)',
                    border: 'none',
                    borderRadius: 999,
                    cursor: phase === 'loading' ? 'default' : 'pointer',
                    opacity: phase === 'loading' ? 0.75 : 1,
                  }}
                >
                  {phase === 'loading' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : phase === 'confirmed' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <LogIn className="h-3.5 w-3.5" />
                  )}
                  {phase === 'loading' ? '在窗口中完成登录…' : phase === 'confirmed' ? '登录成功' : '打开登录窗口'}
                </button>

                <div style={{ fontSize: 11.5, color: 'var(--mo-ink-faint)', textAlign: 'center', lineHeight: 1.7 }}>
                  弹出的是网易云官方登录页：请扫码，并按提示完成
                  <span style={{ color: 'var(--mo-ink-soft)' }}>「选择网络环境」</span>
                  等安全验证；完成后本应用会自动登录。
                </div>

                {phase === 'error' ? (
                  <div style={{ fontSize: 11.5, color: 'var(--mo-warm)', textAlign: 'center', lineHeight: 1.6 }}>
                    登录窗口打开失败，请重试；仍失败时可先用匿名模式（推荐歌单 / 榜单 / 搜索不受影响）。
                  </div>
                ) : null}

                <div style={{ fontSize: 11, color: 'var(--mo-ink-faint)', textAlign: 'center', lineHeight: 1.6 }}>
                  登录态只保存在本机 Electron 分区，不会写入仓库或日志。
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
