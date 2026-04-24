import { X, Edit2, Trash2 } from 'lucide-react';

export default function RowDetailModal({ isOpen, title, data, fields, onClose, onEdit, onDelete }) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {fields.map(field => (
            <div key={field.key} className="flex flex-col">
              <span className="text-sm font-medium text-gray-500">{field.label}</span>
              <span className="text-gray-900 mt-0.5">
                {field.render ? field.render(data[field.key], data) : (data[field.key] ?? '-')}
              </span>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          {onDelete && (
            <button onClick={() => onDelete(data)} className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          {onEdit && (
            <button onClick={() => onEdit(data)} className="btn btn-primary flex items-center gap-2">
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
