import type { ReactNode } from 'react';

import { AppHeader } from './AppHeader';
import { useI18n } from '@/hooks/useI18n';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  headerContent?: ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function Layout({
  children,
  title,
  headerContent,
  backTo = '/',
  backLabel,
}: LayoutProps) {
  const { t } = useI18n();

  return (
    <div className="hud-shell">
      <AppHeader
        title={title}
        headerContent={headerContent}
        backTo={backTo}
        backLabel={backLabel ?? t('nav.menu')}
      />
      <main className="hud-main">
        <div className="hud-main__inner">{children}</div>
      </main>
    </div>
  );
}
