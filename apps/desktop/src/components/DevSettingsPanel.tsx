import { useState } from 'react';

import { useAppStore } from '@2xko/core';

import { BlockingModal } from './BlockingModal';
import { useI18n } from '@/hooks/useI18n';
import { fetchAnnouncements } from '@/services/remote';
import { getDevSettings, setDevSettings } from '@/utils/devSettings';

import {
  clearCaches,
  logAppState,
  resetAllAppData,
  resetStartupModals,
  seedBetaTestData,
} from '@/utils/devTools';

export function DevSettingsPanel() {
  const { t } = useI18n();
  const setAnnouncements = useAppStore((s) => s.setAnnouncements);
  const [debugOverlay, setDebugOverlay] = useState(getDevSettings().debugOverlay);
  const [verboseLogs, setVerboseLogs] = useState(getDevSettings().verboseLogs);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [previewLink, setPreviewLink] = useState<string | undefined>();

  const toggle = (key: 'debugOverlay' | 'verboseLogs', value: boolean) => {
    setDevSettings({ [key]: value });
    if (key === 'debugOverlay') setDebugOverlay(value);
    if (key === 'verboseLogs') setVerboseLogs(value);
  };

  async function handlePreviewAnnouncement() {
    const list = await fetchAnnouncements(true);
    setAnnouncements(list);
    const top = [...list].sort((a, b) => a.priority - b.priority)[0];
    if (!top) {
      alert(t('dev.noAnnouncement'));
      return;
    }
    setPreviewTitle(top.title);
    setPreviewBody(top.body);
    setPreviewLink(top.link ?? undefined);
    setPreviewOpen(true);
  }

  return (
    <section className="xko-panel dev-panel">
      <h2 className="dev-panel__title">Opciones de desarrollador</h2>
      <p className="dev-panel__hint">Temporal — para testear como dev o beta tester.</p>

      <label className="dev-toggle">
        <input
          type="checkbox"
          checked={debugOverlay}
          onChange={(e) => toggle('debugOverlay', e.target.checked)}
        />
        <span>Overlay de debug (estado guardado, revisiones)</span>
      </label>

      <label className="dev-toggle">
        <input
          type="checkbox"
          checked={verboseLogs}
          onChange={(e) => toggle('verboseLogs', e.target.checked)}
        />
        <span>Logs verbosos en consola</span>
      </label>

      <div className="dev-panel__actions">
        <button type="button" className="xko-btn xko-btn--ghost" onClick={() => void handlePreviewAnnouncement()}>
          {t('dev.previewAnnouncement')}
        </button>
        <button type="button" className="xko-btn xko-btn--ghost" onClick={seedBetaTestData}>
          Cargar datos de prueba
        </button>
        <button type="button" className="xko-btn xko-btn--ghost" onClick={logAppState}>
          Volcar estado → consola
        </button>
        <button type="button" className="xko-btn xko-btn--ghost" onClick={clearCaches}>
          Limpiar caché imágenes
        </button>
        <button type="button" className="xko-btn xko-btn--ghost" onClick={resetStartupModals}>
          Reset modales inicio
        </button>
        <button type="button" className="xko-btn xko-btn--pink" onClick={resetAllAppData}>
          Reset total (borrar todo)
        </button>
      </div>

      <BlockingModal open={previewOpen} onClose={() => setPreviewOpen(false)} title={previewTitle}>
        <p className="text-sm text-text-muted">{previewBody}</p>
        {previewLink && (
          <a
            href={previewLink}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            {t('startup.learnMore')}
          </a>
        )}
      </BlockingModal>
    </section>
  );
}
