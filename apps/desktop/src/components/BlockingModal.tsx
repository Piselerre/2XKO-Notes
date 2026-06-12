import { createPortal } from 'react-dom';

interface BlockingModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  hideClose?: boolean;
  modalClassName?: string;
}

export function BlockingModal({ open, onClose, title, children, hideClose, modalClassName }: BlockingModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="xko-modal-bg">
      <button
        type="button"
        className="xko-modal-bg__backdrop"
        aria-label="Close"
        onClick={hideClose ? undefined : onClose}
        tabIndex={-1}
      />
      <div role="dialog" aria-modal="true" className={['xko-modal', modalClassName].filter(Boolean).join(' ')}>
        <div className="xko-modal__head">
          <h2 className="xko-modal__title">{title}</h2>
          {!hideClose && (
            <button type="button" onClick={onClose} className="xko-modal__close" aria-label="Close">
              ×
            </button>
          )}
        </div>
        <div className="xko-modal__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
