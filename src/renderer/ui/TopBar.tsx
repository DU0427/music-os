import { motion } from 'motion/react';
import { Search, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useAccountStore } from '../store/account';


export default function TopBar({ onSearch, onAccount }: { onSearch?: () => void; onAccount?: () => void }) {
  const loggedIn = useAccountStore((s) => s.loggedIn);
  const account = useAccountStore((s) => s.account);

  return (
    <motion.header
      className="fixed top-0 left-0 w-full px-8 py-6 flex items-center justify-end pointer-events-none z-20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.8 }}
    >
      {/* Right: search pill + account */}
      <div className="flex items-center gap-2 relative">
        <button
          type="button"
          aria-label="搜索"
          onClick={onSearch}
          className="pointer-events-auto flex items-center rounded-full"
          style={{
            gap: 9,
            padding: '7px 9px 7px 13px',
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid var(--mo-line)',
            color: 'var(--mo-ink-muted)',
            cursor: 'pointer',
            transition:
              'color 260ms var(--mo-ease), border-color 260ms var(--mo-ease), background 260ms var(--mo-ease), box-shadow 260ms var(--mo-ease), transform 260ms var(--mo-ease)',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = 'var(--mo-ink)';
            event.currentTarget.style.borderColor = 'var(--mo-accent-ghost)';
            event.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            event.currentTarget.style.boxShadow = '0 8px 26px rgba(0,0,0,0.42), 0 0 24px var(--mo-accent-ghost)';
            event.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = 'var(--mo-ink-muted)';
            event.currentTarget.style.borderColor = 'var(--mo-line)';
            event.currentTarget.style.background = 'rgba(255,255,255,0.035)';
            event.currentTarget.style.boxShadow = 'none';
            event.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Search className="h-3.5 w-3.5" />
          <span style={{ fontSize: 12, letterSpacing: '0.01em' }}>搜索歌曲、歌手…</span>
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              padding: '2px 6px',
              marginLeft: 2,
              borderRadius: 7,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--mo-line)',
              color: 'var(--mo-ink-faint)',
              letterSpacing: '0.06em',
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
          className="pointer-events-auto grid shrink-0 place-items-center overflow-hidden rounded-full"
          style={{
            width: 34,
            height: 34,
            background: loggedIn ? 'transparent' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${loggedIn ? 'var(--mo-line-strong)' : 'var(--mo-line)'}`,
            boxShadow: loggedIn ? '0 4px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
            cursor: 'pointer',
            transition: 'border-color 240ms var(--mo-ease), box-shadow 240ms var(--mo-ease), transform 240ms var(--mo-ease)',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = 'var(--mo-accent-ghost)';
            event.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5), 0 0 20px var(--mo-accent-ghost)';
            event.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = loggedIn ? 'var(--mo-line-strong)' : 'var(--mo-line)';
            event.currentTarget.style.boxShadow = loggedIn ? '0 4px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none';
            event.currentTarget.style.transform = 'translateY(0)';
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