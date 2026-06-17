import { useMemo } from 'react';

import { markdownToHtml } from './visualEditor/markdownParse';

interface MarkdownPreviewContentProps {
  markdown: string;
  className?: string;
}

/** Read-only preview using the same renderer as the visual editor. */
export function MarkdownPreviewContent({ markdown, className = '' }: MarkdownPreviewContentProps) {
  const html = useMemo(() => markdownToHtml(markdown), [markdown]);

  return (
    <div
      className={`visual-editor visual-editor--preview notes-preview__body ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
