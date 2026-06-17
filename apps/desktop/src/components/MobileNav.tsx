import { Link, useLocation } from 'react-router-dom';

import { useI18n } from '@/hooks/useI18n';
import { useIsMobile } from '@/hooks/useIsMobile';
import { withMobilePreview } from '@/utils/mobilePreview';

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="mobile-nav__icon" viewBox="0 0 24 24" aria-hidden fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ITEMS = [
  { to: '/', labelKey: 'nav.home', icon: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z' },
  { to: '/combos', labelKey: 'nav.combos', icon: 'M6 6h12v4H6zm0 8h8v4H6z' },
  { to: '/matchups', labelKey: 'nav.matchups', icon: 'M8 4h8v16H8zm-4 4h4v8H4zm12 0h4v8h-4z' },
  { to: '/settings', labelKey: 'nav.settings', icon: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7.4-2a7.4 7.4 0 0 0 .1-3l2-1.2-2-3.5-2.3 1a7.6 7.6 0 0 0-2.6-1.5L14.5 2h-5l-.1 3.3a7.6 7.6 0 0 0-2.6 1.5l-2.3-1-2 3.5 2 1.2a7.4 7.4 0 0 0 0 3l-2 1.2 2 3.5 2.3-1a7.6 7.6 0 0 0 2.6 1.5L9.5 22h5l.1-3.3a7.6 7.6 0 0 0 2.6-1.5l2.3 1 2-3.5-2-1.2Z' },
] as const;

export function MobileNav() {
  const mobile = useIsMobile();
  const { pathname } = useLocation();
  const { t } = useI18n();

  if (!mobile) return null;

  const isNoteDetail =
    /^\/combos\/[^/]+/.test(pathname) ||
    /^\/matchups\/[^/]+/.test(pathname) ||
    /^\/team-notes\/[^/]+\/[^/]+/.test(pathname);

  if (isNoteDetail) return null;

  return (
    <nav className="mobile-nav" aria-label={t('nav.menu')}>
      {ITEMS.map((item) => {
        const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={withMobilePreview(item.to)}
            className={`mobile-nav__item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <NavIcon d={item.icon} />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
