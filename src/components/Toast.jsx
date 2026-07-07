import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

let toastListeners = []
let toastId = 0

export function showToast(message, type = 'success') {
  const id = ++toastId
  toastListeners.forEach(fn => fn({ id, message, type }))
  return id
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (toast) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 2500)
    }
    toastListeners.push(handler)
    return () => { toastListeners = toastListeners.filter(fn => fn !== handler) }
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-fade-in
            ${toast.type === 'success' ? 'bg-purple-900' : 'bg-red-600'}`}
        >
          {toast.type === 'success'
            ? <CheckCircle size={16} />
            : <XCircle size={16} />}
          {toast.message}
          <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
