import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { APP_VERSION } from '@/constants/version';
import { SyncStatus } from './SyncStatus';
import { useI18n } from '@/hooks/useI18n';
import { openExternal } from '@/utils/openExternal';

const LOGO = '/img/logo/LogoApp.png';

function SettingsIcon() {
  return (
    <svg className="app-header__icon-svg" viewBox="0 0 24 24" aria-hidden fill="none">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.65"
      />
      <path
        d="M19.4 13.5a7.4 7.4 0 0 0 .1-3l2-1.2-2-3.5-2.3 1a7.6 7.6 0 0 0-2.6-1.5L14.5 2h-5l-.1 3.3a7.6 7.6 0 0 0-2.6 1.5l-2.3-1-2 3.5 2 1.2a7.4 7.4 0 0 0 0 3l-2 1.2 2 3.5 2.3-1a7.6 7.6 0 0 0 2.6 1.5L9.5 22h5l.1-3.3a7.6 7.6 0 0 0 2.6-1.5l2.3 1 2-3.5-2-1.2Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface AppHeaderProps {
  title?: string;
  headerContent?: ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function AppHeader({ title, headerContent, backTo, backLabel }: AppHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="app-header">
      <div className="app-header__left">
        {backTo && (
          <Link to={backTo} className="app-header__back">
            <span aria-hidden>◂</span>
            <span>{backLabel}</span>
          </Link>
        )}
        <Link to="/" className="app-header__brand" title={t('nav.home')}>
          <img src={LOGO} alt="2XKO Notes" className="app-header__logo" decoding="async" />
        </Link>
        <button
          type="button"
          className="app-header__credit"
          onClick={() => openExternal('https://twitter.com/PixelR_')}
        >
          <span className="app-header__credit-tag" aria-hidden>✦</span>
          <span className="app-header__credit-text">
            <span className="app-header__credit-label">{t('common.madeBy')}</span>
            <span className="app-header__credit-handle">@PixelR_</span>
          </span>
        </button>
        {headerContent ? (
          <div className="app-header__custom">{headerContent}</div>
        ) : (
          title && <h1 className="app-header__page-title">{title}</h1>
        )}
      </div>
      <div className="app-header__right">
        <SyncStatus />
        <div className="app-header__settings-wrap">
          <Link to="/settings" className="app-header__icon" title={t('nav.settings')}>
            <SettingsIcon />
          </Link>
          <span className="app-header__version" aria-label={`Version ${APP_VERSION}`}>
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </header>
  );
}
