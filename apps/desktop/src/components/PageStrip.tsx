import type { ReactNode } from 'react';

interface PageStripProps {
  label: string;
  action?: ReactNode;
}

export function PageStrip({ label, action }: PageStripProps) {
  return (
    <div className="page-strip">
      <span className="page-strip__label">{label}</span>
      <div className="page-strip__line" />
      {action ? <div className="page-strip__actions">{action}</div> : null}
    </div>
  );
}
