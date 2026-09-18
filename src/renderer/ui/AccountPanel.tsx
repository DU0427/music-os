'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2, LogOut, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccountStore } from '../store/account';
import type { ProviderQrStatus } from '../../shared/music/providers';

type Phase = 'idle' | 'loading' | 'waiting' | 'scanned' | 'retrying' | 'expired' | 'error' | 'confirmed';

const STATUS_TEXT: Record<ProviderQrStatus, string> = {
  waiting: '打开网易云音乐 App，扫描二维码登录',
  scanned: '已扫码，请在手机上确认',
  confirmed: '登录成功',
  expired: '二维码已过期',
  error: '登录状态异常，请重试',
};

/**
 * 账号面板：未登录时走扫码流程（二维码 + 轮询状态），登录后显示头像/昵称与退出。
 * 视觉沿用设计语言：玻璃面板 + 单一 accent + 三档字阶。
 */
export default function AccountPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const loggedIn = useAccountStore((s) => s.loggedIn);
  const account = useAccountStore((s) => s.account);
  const refresh = useAccountStore((s) => s.refresh);
  const logout = useAccountStore((s) => s.logout);

  const [phase, setPhase] = useState<Phase>('idle');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const createQr = useCallback(async () => {
    if (typeof window.musicOS?.createNeteaseQrLogin !== 'function') {
      setPhase('error');
      return;
    }
    setPhase('loading');
    setQrDataUrl(null);
    stopPolling();
    try {
      const session = await window.musicOS.createNeteaseQrLogin();
      if (!session?.qrDataUrl) {
        setPhase('error');
        return;
      }
      setQrDataUrl(session.qrDataUrl);
      setPhase('waiting');

      let transientFailures = 0;
      const poll = async () => {
        if (typeof window.musicOS?.pollNeteaseQrLogin !== 'function') {
          return;
        }
        try {
          const result = await window.musicOS.pollNeteaseQrLogin(session.key);
          if (result.status === 'confirmed') {
            await refresh();
            setPhase('confirmed');
            window.setTimeout(() => onClose(), 900);
            return;
          }
          if (result.status === 'expired') {
            setPhase('expired');
            return;
          }
          if (result.status === 'error') {
            // 网络波动 / 非常规返回：先重试几次，避免把瞬时失败显示成「状态异常」
            transientFailures += 1;
            if (transientFailures <= 3) {
              setPhase('retrying');
              pollTimerRef.current = window.setTimeout(poll, 1600);
              return;
            }
            setPhase('error');
            return;
          }
          transientFailures = 0;
          setPhase(result.status === 'scanned' ? 'scanned' : 'waiting');
          pollTimerRef.current = window.setTimeout(poll, 1600);
        } catch {
          transientFailures += 1;
          if (transientFailures <= 3) {
            setPhase('retrying');
            pollTimerRef.current = window.setTimeout(poll, 1600);
            return;
          }
          setPhase('error');
        }
      };
      pollTimerRef.current = window.setTimeout(poll, 1200);
    } catch {
      setPhase('error');
    }
  }, [onClose, refresh, stopPolling]);

  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      setPhase('idle');
      setQrDataUrl(null);
      return;
    }
    void refresh();
  }, [isOpen, refresh, stopPolling]);

  useEffect(() => {
    if (isOpen && !loggedIn && phase === 'idle') {
      void createQr();
    }
  }, [isOpen, loggedIn, phase, createQr]);

  const statusText =
    phase === 'loading'
      ? '正在获取二维码…'
      : phase === 'confirmed'
        ? STATUS_TEXT.confirmed
        : phase === 'scanned'
          ? STATUS_TEXT.scanned
          : phase === 'retrying'
            ? '网络波动，正在重试…'
            : phase === 'expired'
              ? STATUS_TEXT.expired
              : phase === 'error'
                ? STATUS_TEXT.error
                : STATUS_TEXT.waiting;

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
              width: 340,
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
                  {loggedIn ? '已登录' : '扫码登录'}
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
                    width: 188,
                    height: 188,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.96)',
                    border: '1px solid var(--mo-line)',
                  }}
                >
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="登录二维码" style={{ width: 164, height: 164 }} />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#0a0a0c' }} />
                  )}
                </div>
                <div className="flex items-center" style={{ gap: 6 }}>
                  {phase === 'confirmed' ? (
                    <Check className="h-3.5 w-3.5" style={{ color: 'var(--mo-accent)' }} />
                  ) : phase === 'loading' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--mo-ink-muted)' }} />
                  ) : null}
                  <span style={{ fontSize: 12, color: phase === 'confirmed' ? 'var(--mo-accent)' : 'var(--mo-ink-soft)' }}>
                    {statusText}
                  </span>
                </div>
                {phase === 'expired' || phase === 'error' ? (
                  <button
                    type="button"
                    onClick={() => void createQr()}
                    className="flex items-center justify-center gap-2 rounded-full"
                    style={{
                      padding: '8px 16px',
                      fontSize: 12,
                      color: 'var(--mo-accent-contrast)',
                      background: 'var(--mo-accent)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    刷新二维码
                  </button>
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
