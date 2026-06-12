import { useEffect, useMemo, useState } from 'react';

import type { Character } from '@2xko/core';

import { useI18n } from '@/hooks/useI18n';

import { CharacterCard } from './CharacterCard';
import { MiniFighter } from './MiniFighter';
import { BlockingModal } from './BlockingModal';

interface TeamCreatorModalProps {
  open: boolean;
  characters: Character[];
  onClose: () => void;
  onSave: (char1Id: string, char2Id: string) => void;
}

export function TeamCreatorModal({ open, characters, onClose, onSave }: TeamCreatorModalProps) {
  const { t } = useI18n();
  const [char1Id, setChar1Id] = useState<string | null>(null);
  const [char2Id, setChar2Id] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setChar1Id(null);
    setChar2Id(null);
    setSearch('');
  }, [open]);

  const char1 = char1Id ? characters.find((c) => c.id === char1Id) : undefined;
  const char2 = char2Id ? characters.find((c) => c.id === char2Id) : undefined;

  const filtered = useMemo(
    () => characters.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [characters, search]
  );

  function handlePick(id: string) {
    if (id === char1Id) {
      setChar1Id(null);
      return;
    }
    if (id === char2Id) {
      setChar2Id(null);
      return;
    }
    if (!char1Id) {
      setChar1Id(id);
      return;
    }
    if (!char2Id) {
      setChar2Id(id);
      return;
    }
    setChar2Id(id);
  }

  function handleSave() {
    if (!char1Id || !char2Id) return;
    onSave(char1Id, char2Id);
    onClose();
  }

  const selectedCount = (char1Id ? 1 : 0) + (char2Id ? 1 : 0);

  return (
    <BlockingModal
      open={open}
      onClose={onClose}
      title={t('teams.createTitle')}
      modalClassName="xko-modal--team-creator"
    >
      <div className="team-creator">
        <div className="team-creator__slots">
          <div className={`team-creator__slot ${char1 ? 'team-creator__slot--filled' : ''}`}>
            {char1 ? (
              <MiniFighter character={char1} size="lg" />
            ) : (
              <span className="team-creator__placeholder"><span>1</span></span>
            )}
          </div>
          <span className="team-creator__plus" aria-hidden>
            +
          </span>
          <div className={`team-creator__slot ${char2 ? 'team-creator__slot--filled' : ''}`}>
            {char2 ? (
              <MiniFighter character={char2} size="lg" />
            ) : (
              <span className="team-creator__placeholder"><span>2</span></span>
            )}
          </div>
        </div>

        <p className="team-creator__hint">
          {selectedCount}/2 · {t('teams.hint')}
        </p>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('combos.search')}
          className="xko-input team-creator__search"
        />

        <div className="team-creator__grid-scroll">
          <div className="team-creator__grid">
            {filtered.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                onSelect={() => handlePick(char.id)}
                selected={char.id === char1Id || char.id === char2Id}
                hideName
              />
            ))}
          </div>
        </div>

        <div className="team-creator__actions">
          <button type="button" onClick={onClose} className="xko-btn xko-btn--ghost">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!char1Id || !char2Id}
            className="xko-btn xko-btn--lime"
          >
            {t('teams.save')}
          </button>
        </div>
      </div>
    </BlockingModal>
  );
}
