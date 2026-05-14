import { HiOutlineExclamationTriangle } from 'react-icons/hi2'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onCancel }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-100' : 'bg-teal-100'}`}>
            <HiOutlineExclamationTriangle className={`text-xl ${danger ? 'text-red-600' : 'text-mindwell'}`} />
          </div>
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-mindwell hover:bg-mindwell-dark'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
