import { Fragment, ReactNode } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <Fragment>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={clsx(
            'w-full bg-white rounded-xl shadow-xl overflow-hidden',
            sizeClasses[size]
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
                      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-200">
                        <h2 id="modal-title" className="text-lg font-semibold text-dark-900">
                          {title}
                        </h2>
                        <button
                          onClick={onClose}
                          className="p-1 rounded-lg text-dark-500 hover:bg-dark-100 hover:text-dark-700 transition-colors"
                          aria-label="Fechar modal"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {!title && onClose && (
                      <div className="flex justify-end px-6 py-4 border-b border-dark-200">
                        <button
                          onClick={onClose}
                          className="p-1 rounded-lg text-dark-500 hover:bg-dark-100 hover:text-dark-700 transition-colors"
                          aria-label="Fechar modal"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </Fragment>,
    document.body
  );
}
