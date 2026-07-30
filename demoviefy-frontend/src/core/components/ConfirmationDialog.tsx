import { useState } from "react"
import 'src/core/styles/ConfirmationDialog.css'
import { Warning } from 'src/assets/Warning'

interface ConfirmationDialogProps {
    title?: string
  message?: string
  onConfirm: () => void | Promise<void>
  children: (openDialog: () => void) => React.ReactNode
}

export function ConfirmationDialog({
    title = "Excluir item",
    message = "Tem certeza de que deseja excluir este item? Esta ação é irreversível",
  onConfirm,
  children,
}: ConfirmationDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {children(() => setIsOpen(true))}

      {isOpen && (
        <div className="dialog-overlay">
          <div className="dialog-content">

            <div className="dialog-icon-container">
                <Warning />
            </div>

            <h2>{title}</h2>
            <p>{message}</p>

            <div className="dialog-actions">
              <button
                className="cancel-btn"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </button>

              <button
                className="confirm-btn"
                onClick={async () => {
                  await onConfirm()
                  setIsOpen(false)
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}