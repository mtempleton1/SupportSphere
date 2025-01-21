import { X } from 'lucide-react';

interface NewTabDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewTabDialog({ isOpen, onClose }: NewTabDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-[500px] max-w-full">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-medium">Add New Tab</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-gray-600">Placeholder content for new tab dialog</p>
        </div>
        <div className="px-4 py-3 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
} 