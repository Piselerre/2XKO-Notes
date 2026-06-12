import { AnnouncementFloat } from './AnnouncementFloat';
import { KofiButton } from './KofiButton';

/** Ko-fi + anuncio apilados en la esquina inferior derecha. */
export function KofiFloatStack() {
  return (
    <div className="kofi-float-stack">
      <AnnouncementFloat />
      <KofiButton />
    </div>
  );
}
