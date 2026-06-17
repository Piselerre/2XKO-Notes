import { useState } from 'react';

import { useI18n } from '@/hooks/useI18n';
import { openExternal } from '@/utils/openExternal';

import { BlockingModal } from './BlockingModal';

const DISCORD_URL = 'https://discord.gg/Z78Ayzs6Es';

type HelpView = 'menu' | 'faq' | 'roadmap' | 'discord';

export function HelpHubButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<HelpView>('menu');

  function close() {
    setOpen(false);
    setView('menu');
  }

  const title =
    view === 'faq'
      ? t('help.faq')
      : view === 'roadmap'
        ? t('help.roadmap')
        : view === 'discord'
          ? t('help.discord')
          : t('help.title');

  return (
    <>
      <button
        type="button"
        className="help-hub-btn"
        onClick={() => setOpen(true)}
        title={t('help.title')}
        aria-label={t('help.title')}
      >
        ?
      </button>

      <BlockingModal open={open} onClose={close} title={title} modalClassName="xko-modal--help">
        {view === 'menu' && (
          <div className="help-hub-menu">
            <button type="button" className="help-hub-menu__item" onClick={() => setView('faq')}>
              <span className="help-hub-menu__label">{t('help.faq')}</span>
              <span className="help-hub-menu__hint">{t('help.faqHint')}</span>
            </button>
            <button type="button" className="help-hub-menu__item" onClick={() => setView('roadmap')}>
              <span className="help-hub-menu__label">{t('help.roadmap')}</span>
              <span className="help-hub-menu__hint">{t('help.roadmapHint')}</span>
            </button>
            <button type="button" className="help-hub-menu__item help-hub-menu__item--discord" onClick={() => setView('discord')}>
              <svg className="help-hub-menu__discord-icon" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 12.3 12.3 0 0 0-.608 1.25 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                />
              </svg>
              <span className="help-hub-menu__label">{t('help.discord')}</span>
              <span className="help-hub-menu__hint">{t('help.discordHint')}</span>
            </button>
          </div>
        )}

        {view === 'faq' && (
          <div className="help-faq">
            <p className="help-faq__lead">{t('help.faqLead')}</p>
            <div className="help-faq__placeholder">
              <span className="help-faq__tag">{t('help.comingSoon')}</span>
              <p>{t('help.faqPlaceholder')}</p>
            </div>
            <button type="button" className="xko-btn xko-btn--ghost mt-4" onClick={() => setView('menu')}>
              ← {t('common.back')}
            </button>
          </div>
        )}

        {view === 'roadmap' && (
          <div className="help-roadmap">
            <section className="roadmap-priority">
              <h3 className="roadmap-priority__title">{t('help.priorityTitle')}</h3>
              <div className="roadmap-priority__grid">
                <div className="roadmap-priority__col roadmap-priority__col--high">
                  <span className="roadmap-priority__badge">{t('help.priorityHigh')}</span>
                  <ul>
                    <li>{t('help.roadHigh1')}</li>
                    <li>{t('help.roadHigh2')}</li>
                  </ul>
                </div>
                <div className="roadmap-priority__col roadmap-priority__col--med">
                  <span className="roadmap-priority__badge">{t('help.priorityMed')}</span>
                  <ul>
                    <li>{t('help.roadMed1')}</li>
                    <li>{t('help.roadMed2')}</li>
                  </ul>
                </div>
                <div className="roadmap-priority__col roadmap-priority__col--low">
                  <span className="roadmap-priority__badge">{t('help.priorityLow')}</span>
                  <ul>
                    <li>{t('help.roadLow1')}</li>
                    <li>{t('help.roadLow2')}</li>
                  </ul>
                </div>
              </div>
            </section>
            <section className="roadmap-versions">
              <h3 className="roadmap-versions__title">{t('help.versionsTitle')}</h3>
              <div className="roadmap-version">
                <span className="roadmap-version__num">v0.5</span>
                <p>{t('help.v05')}</p>
              </div>
              <div className="roadmap-version">
                <span className="roadmap-version__num">v0.6</span>
                <p>{t('help.v06')}</p>
              </div>
              <div className="roadmap-version">
                <span className="roadmap-version__num">v0.7</span>
                <p>{t('help.v07')}</p>
              </div>
              <div className="roadmap-version roadmap-version--final">
                <span className="roadmap-version__num">{t('help.final')}</span>
                <p>{t('help.finalDesc')}</p>
              </div>
            </section>
            <button type="button" className="xko-btn xko-btn--ghost mt-4" onClick={() => setView('menu')}>
              ← {t('common.back')}
            </button>
          </div>
        )}

        {view === 'discord' && (
          <div className="help-discord">
            <div className="help-discord__card">
              <svg className="help-discord__icon" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 12.3 12.3 0 0 0-.608 1.25 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                />
              </svg>
              <p className="help-discord__text">{t('help.discordBody')}</p>
              <button
                type="button"
                className="xko-btn xko-btn--outline w-full"
                onClick={() => void openExternal(DISCORD_URL)}
              >
                {t('help.discordJoin')}
              </button>
            </div>
            <button type="button" className="xko-btn xko-btn--ghost mt-4" onClick={() => setView('menu')}>
              ← {t('common.back')}
            </button>
          </div>
        )}
      </BlockingModal>
    </>
  );
}
