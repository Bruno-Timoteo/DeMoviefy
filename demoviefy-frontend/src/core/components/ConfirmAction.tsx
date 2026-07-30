import { useState } from "react";
import type { ReactNode } from "react";
import "src/core/styles/ConfirmAction.css"

interface ConfirmActionProps {
  children: ReactNode;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmAction({
  children,
  title = "Confirmar ação",
  message = "Essa ação é irreversível. Tem certeza de que deseja continuar?",
  confirmText = "Sim",
  cancelText = "Não",
  disabled = false,
  onConfirm,
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <span
        onClick={handleOpen}
        style={{
          display: "inline-flex",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {children}
      </span>

      {open && (
        <div
          className="confirm-overlay"
          onClick={handleClose}
        >
          <div
            className="confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{title}</h3>

            <p>{message}</p>

            <div className="confirm-actions">
              <button
                onClick={handleClose}
                disabled={loading}
              >
                {cancelText}
              </button>

              <button
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "Processando..." : confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}