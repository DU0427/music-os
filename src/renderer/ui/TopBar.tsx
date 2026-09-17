import { motion, AnimatePresence } from 'motion/react';
import { Search, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useRuntimeStore } from '../store/runtime';
import { useAccountStore } from '../store/account';

const SPACE_TITLE: Record<string, string> = {
  home: 'stage',
  library: 'library',
  memory: 'memory',
};

export default function TopBar({ onSearch, onAccount }: { onSearch?: () => void; onAccount?: () => void }) {
  const loggedIn = useAccountStore((s) => s.loggedIn);
  const account = useAccountStore((s) => s.account);
  const currentSpace = useRuntimeStore((s) => s.currentSpace);

  return (
    <motion.header
      className="fixed top-0 left-0 w-full px-8 py-6 flex items-start justify-between pointer-events-none z-20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 pointer-events-auto group">
        <div className="relative w-6 h-6 flex items-center justify-center">
          <motion.div
            className="absolute inset-[-2px] rounded-full"
            style={{ border: '1px solid var(--mo-accent-ghost)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--mo-accent)' }} />
        </div>
        <div className="font-sans font-medium text-[13px] text-white/80 group-hover:text-white transition-colors tracking-wide">
          music os
        </div>
      </div>

      {/* Center space title：状态胶囊 */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSpace}
            initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="rounded-full"
            style={{
              padding: '5px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--mo-line)',
            }}
          >
            <span className="font-mono text-[10.5px] tracking-[0.16em] lowercase" style={{ color: 'var(--mo-ink-soft)' }}>
              {SPACE_TITLE[currentSpace] ?? currentSpace}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right: search pill + account */}
      <div className="flex items-center gap-2 relative">
        <button
          type="button"
          aria-label="搜索"
          onClick={onSearch}
          className="pointer-events-auto flex items-center rounded-full transition-colors"
          style={{
            gap: 8,
            padding: '6px 10px 6px 12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--mo-line)',
            color: 'var(--mo-ink-muted)',
            cursor: 'pointer',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = 'var(--mo-ink)';
            event.currentTarget.style.borderColor = 'var(--mo-line-strong)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = 'var(--mo-ink-muted)';
            event.currentTarget.style.borderColor = 'var(--mo-line)';
          }}
        >
          <Search className="h-3.5 w-3.5" />
          <span style={{ fontSize: 12 }}>搜索</span>
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              padding: '1px 5px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--mo-line)',
              color: 'var(--mo-ink-faint)',
            }}
          >
            ⌘K
          </span>
        </button>
        <button
          type="button"
          aria-label={loggedIn ? '账号' : '登录'}
          title={loggedIn ? (account?.nickname ?? '账号') : '登录网易云'}
          onClick={onAccount}
          className="pointer-events-auto grid shrink-0 place-items-center overflow-hidden rounded-full transition-colors"
          style={{
            width: 32,
            height: 32,
            background: loggedIn ? 'transparent' : 'rgba(255,255,255,0.04)',
            border: '1px solid var(--mo-line)',
            cursor: 'pointer',
          }}
        >
          {loggedIn && account?.avatarUrl ? (
            <img src={account.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <UserRound className="h-3.5 w-3.5" style={{ color: 'var(--mo-ink-muted)' }} />
          )}
        </button>
      </div>
    </motion.header>
  );
}