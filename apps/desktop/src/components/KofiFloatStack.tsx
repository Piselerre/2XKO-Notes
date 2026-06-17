import { useLocation } from 'react-router-dom';

import { useAppStore } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';
import { useIsMobile } from '@/hooks/useIsMobile';

import { AnnouncementFloat } from './AnnouncementFloat';
import { KofiButton } from './KofiButton';
import { UpdateStatus } from './UpdateStatus';

const EDITOR_ROUTE = /^\/(players|combos\/[^/]+|matchups\/[^/]+|team-notes\/[^/]+)/;

function useHideOnMobileEditor(): boolean {
  const mobile = useIsMobile();
  const { pathname } = useLocation();
  const viewMode = useAppStore((s) => s.notesViewMode);
  if (!mobile || !EDITOR_ROUTE.test(pathname)) return false;
  return pathname === '/players' || viewMode === 'edit';
}

/** Ko-fi + anuncio + updates apilados en la esquina inferior derecha. */
export function KofiFloatStack() {
  const { t } = useI18n();
  const mobile = useIsMobile();
  if (useHideOnMobileEditor()) return null;

  return (
    <div className="kofi-float-stack">
      {!mobile && <UpdateStatus />}
      <AnnouncementFloat />
      <KofiButton />
      {!mobile && <span className="beta-badge beta-badge--float">{t('common.betaEdition')}</span>}
    </div>
  );
}
