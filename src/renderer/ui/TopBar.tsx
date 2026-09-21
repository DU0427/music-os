import { motion } from 'motion/react';
import { Search, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccountStore } from '../store/account';

/* ——— Chrome 悬停纪律（design-language-v2 v2.2）：亮度阶梯，不用 accent 发光 ——— */
function circleHover(event: React.MouseEvent<HTMLButtonElement>) {
  const el = event.currentTarget;
  el.style.borderColor = 'var(--mo-line-strong)';
  el.style.background = 'rgba(255,255,255,0.07)';
  el.style.color = 'var(--mo-ink)';
  el.style.transform = 'translateY(-1px)';
}

function circleLeave(event: React.MouseEvent<HTMLButtonElement>, loggedIn = false) {
  const el = event.currentTarget;
  el.style.borderColor = loggedIn ? 'var(--mo-line-strong)' : 'var(--mo-line)';
  el.style.background = loggedIn ? 'transparent' : 'rgba(255,255,255,0.04)';
  el.style.color = 'var(--mo-ink-muted)';
  el.style.transform = 'translateY(0)';
}

export default function TopBar({ onSearch, onAccount }: { onSearch?: () => void; onAccount?: () => void }) {
  const loggedIn = useAccountStore((s) => s.loggedIn);
  const account = useAccountStore((s) => s.account);
  /* Chrome 滚动退场：WaveHome 滚动时广播，静止 650ms 后恢复（与左下入口同一节奏） */
  const [chromeHidden, setChromeHidden] = useState(false);

  useEffect(() => {
    const onVisibility = (event: Event) => {
      const detail = (event as CustomEvent<{ hidden?: boolean }>).detail;
      setChromeHidden(Boolean(detail?.hidden));
    };
    window.addEventListener('mo-chrome-visibility', onVisibility);
    return () => window.removeEventListener('mo-chrome-visibility', onVisibility);
  }, []);

  return (
    <motion.header
      className="fixed top-0 left-0 w-full px-8 py-6 flex items-center justify-end pointer-events-none z-20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.8 }}
    >
      {/* Right: search orb + account（同规格 34px 圆钮，组成控件组） */}
      <div
        className="flex items-center gap-2 relative"
        style={{
          opacity: chromeHidden ? 0 : 1,
          transition: 'opacity 260ms var(--mo-ease)',
          pointerEvents: chromeHidden ? 'none' : undefined,
        }}
      >
        <button
          type="button"
          aria-label="搜索"
          title="搜索 (⌘K)"
          onClick={onSearch}
          className="pointer-events-auto grid place-items-center rounded-full"
          style={{
            width: 34,
            height: 34,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--mo-line)',
            color: 'var(--mo-ink-muted)',
            cursor: 'pointer',
            transition:
              'color 240ms var(--mo-ease), border-color 240ms var(--mo-ease), background 240ms var(--mo-ease), transform 240ms var(--mo-ease)',
          }}
          onMouseEnter={circleHover}
          onMouseLeave={(event) => circleLeave(event)}
        >
          <Search className="h-[15px] w-[15px]" strokeWidth={1.75} />
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
            color: 'var(--mo-ink-muted)',
            cursor: 'pointer',
            transition:
              'border-color 240ms var(--mo-ease), background 240ms var(--mo-ease), transform 240ms var(--mo-ease)',
          }}
          onMouseEnter={circleHover}
          onMouseLeave={(event) => circleLeave(event, loggedIn)}
        >
          {loggedIn && account?.avatarUrl ? (
            <img src={account.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <UserRound className="h-[15px] w-[15px]" strokeWidth={1.75} />
          )}
        </button>
      </div>
    </motion.header>
  );
}
