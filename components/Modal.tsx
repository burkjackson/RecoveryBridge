'use client'

import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  type?: 'alert' | 'confirm' | 'custom'
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
  confirmStyle?: 'primary' | 'danger' | 'success'
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  type = 'alert',
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel',
  confirmStyle = 'primary',
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const getConfirmButtonClass = () => {
    const baseClass = 'px-6 py-2 rounded-full font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2'

    switch (confirmStyle) {
      case 'danger':
        return `${baseClass} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500`
      case 'success':
        return `${baseClass} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500`
      default:
        return `${baseClass} bg-rb-blue hover:bg-rb-blue-hover text-white focus:ring-rb-blue`
    }
  }

  return (
    <div
      role="dialog"
      aria-labelledby="modal-title"
      aria-modal="true"
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h2
            id="modal-title"
            className="text-xl sm:text-2xl font-bold text-rb-dark pr-8"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-rb-gray hover:text-rb-dark text-2xl leading-none transition focus:outline-none focus:ring-2 focus:ring-rb-blue rounded"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="mb-6 text-rb-dark">
          {children}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {type === 'confirm' && (
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-full font-semibold border-2 border-rb-gray/30 text-rb-dark hover:bg-rb-gray/10 transition focus:outline-none focus:ring-2 focus:ring-rb-blue focus:ring-offset-2"
            >
              {cancelText}
            </button>
          )}

          <button
            onClick={() => {
              if (onConfirm) onConfirm()
              if (type !== 'custom') onClose()
            }}
            className={getConfirmButtonClass()}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
