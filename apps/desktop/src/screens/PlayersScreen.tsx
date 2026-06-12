import { useMemo, useState } from 'react';

import { Layout } from '@/components/Layout';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { ChecklistEditor } from '@/components/ChecklistEditor';
import { BlockingModal } from '@/components/BlockingModal';
import { NotesFullPreview } from '@/components/NotesFullPreview';
import { NotesViewToolbar } from '@/components/NotesViewToolbar';
import { useAppStore } from '@2xko/core';
import type { NoteSection } from '@2xko/core';
import { useI18n } from '@/hooks/useI18n';

export function PlayersScreen() {
  const players = useAppStore((s) => s.players);
  const addPlayer = useAppStore((s) => s.addPlayer);
  const updatePlayer = useAppStore((s) => s.updatePlayer);
  const deletePlayer = useAppStore((s) => s.deletePlayer);
  const [selectedId, setSelectedId] = useState<string | null>(players[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { t, locale } = useI18n();

  const viewMode = useAppStore((s) => s.notesViewMode);
  const filtered = players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const selected = players.find((p) => p.id === selectedId);
  const targetPlayer = players.find((p) => p.id === deleteTarget);
  const isPreview = viewMode === 'preview';

  const playerTabs = useMemo(
    () => [
      { id: 'tendencies', label: t('players.tendencies') },
      { id: 'habits', label: t('players.habits') },
      { id: 'setNotes', label: t('players.setNotes') },
      { id: 'checklist', label: t('editor.checklist') },
    ],
    [t]
  );

  const playerSections = useMemo((): Record<string, NoteSection> => {
    if (!selected) return {};
    return {
      tendencies: { id: 'tendencies', markdown: selected.tendencies, checklist: [], updatedAt: '' },
      habits: { id: 'habits', markdown: selected.habits, checklist: [], updatedAt: '' },
      setNotes: { id: 'setNotes', markdown: selected.setNotes, checklist: [], updatedAt: '' },
      checklist: { id: 'checklist', markdown: '', checklist: selected.checklist, updatedAt: '' },
    };
  }, [selected]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deletePlayer(deleteTarget);
    setSelectedId(players.find((p) => p.id !== deleteTarget)?.id ?? null);
    setDeleteTarget(null);
  };

  return (
    <Layout title={t('players.title')} backTo="/" backLabel={t('nav.menu')}>
      <div className="page-strip">
        <span className="page-strip__label">{t('players.strip')}</span>
        <div className="page-strip__line" />
      </div>

      <div className="players-layout">
        <aside>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="xko-input mb-3"
          />
          <button
            type="button"
            onClick={() => { const p = addPlayer(); setSelectedId(p.id); }}
            className="xko-btn xko-btn--lime mb-3 w-full"
          >
            + {t('players.add')}
          </button>
          <div className="roster-rail">
            {filtered.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedId(player.id)}
                className={`roster-chip${selectedId === player.id ? ' is-active' : ''}`}
              >
                {player.name}
              </button>
            ))}
          </div>
        </aside>

        {selected ? (
          <div className="note-panel min-w-0">
            <NotesViewToolbar />
            {isPreview ? (
              <NotesFullPreview tabs={playerTabs} sections={playerSections} />
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="font-display text-[10px] tracking-widest text-text-muted uppercase">
                      {t('players.name')}
                    </label>
                    <input
                      type="text"
                      value={selected.name}
                      onChange={(e) => updatePlayer(selected.id, { name: e.target.value })}
                      className="xko-input mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-display text-[10px] tracking-widest text-text-muted uppercase">
                      {t('players.team')}
                    </label>
                    <input
                      type="text"
                      value={selected.mainTeam}
                      onChange={(e) => updatePlayer(selected.id, { mainTeam: e.target.value })}
                      className="xko-input mt-1"
                    />
                  </div>
                </div>
                <MarkdownEditor
                  value={selected.tendencies}
                  onChange={(v) => updatePlayer(selected.id, { tendencies: v })}
                  placeholder={t('players.tendenciesPlaceholder')}
                />
                <MarkdownEditor
                  value={selected.habits}
                  onChange={(v) => updatePlayer(selected.id, { habits: v })}
                  placeholder={t('players.habitsPlaceholder')}
                />
                <MarkdownEditor
                  value={selected.setNotes}
                  onChange={(v) => updatePlayer(selected.id, { setNotes: v })}
                  placeholder={t('players.setNotesPlaceholder')}
                />
                <ChecklistEditor
                  items={selected.checklist}
                  onChange={(c) => updatePlayer(selected.id, { checklist: c })}
                />
              </div>
            )}
            {!isPreview && (
              <button type="button" onClick={() => setDeleteTarget(selected.id)} className="link-pink mt-5">
                {t('players.deletePlayer')}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center py-16 font-display text-sm tracking-wider text-text-muted uppercase">
            {t('players.select')}
          </div>
        )}
      </div>

      <BlockingModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('players.deleteTitle')}>
        <p className="text-sm text-text-muted">
          {locale === 'es' ? (
            <>
              {t('players.deleteBody')}{' '}
              <strong className="text-accent">{targetPlayer?.name}</strong>{' '}
              {t('players.deleteSuffix')}
            </>
          ) : (
            <>
              <strong className="text-accent">{targetPlayer?.name}</strong>{' '}
              {t('players.deleteBody')}
            </>
          )}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setDeleteTarget(null)} className="xko-btn xko-btn--lime flex-1">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={confirmDelete} className="xko-btn xko-btn--pink flex-1">
            {t('common.delete')}
          </button>
        </div>
      </BlockingModal>
    </Layout>
  );
}
