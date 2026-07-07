import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

export function ConfirmModal({ open, onClose, onConfirm, title = 'Confirmar', message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="" size="sm">
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-lg">{title}</p>
          <p className="text-gray-500 text-sm mt-1">{message || 'Esta ação não pode ser desfeita.'}</p>
        </div>
        <div className="flex gap-3 w-full">
          <button className="flex-1 btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="flex-1 btn-danger justify-center" onClick={onConfirm} disabled={loading}>
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
