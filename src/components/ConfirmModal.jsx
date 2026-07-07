import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

export function ConfirmModal({ open, onClose, onConfirm, title = 'Confirmar', message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="" size="sm">
      <div className="flex flex-col items-center text-center gap-5 py-2">
        <div className="flex items-center justify-center w-12 h-12" style={{ background: 'var(--danger-soft)', borderRadius: 2 }}>
          <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
        </div>
        <div>
          <p className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>{title}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{message || 'Esta ação não pode ser desfeita.'}</p>
        </div>
        <div className="flex gap-3 w-full">
          <button className="btn-ghost flex-1 justify-center" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-danger flex-1 justify-center" onClick={onConfirm} disabled={loading}>
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
