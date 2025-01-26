import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ChannelsSettingsSectionOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

const TABS = [
  'Email',
  'Twitter',
  'Chat',
  'Facebook',
  'Talk',
  'Text',
  'Widget',
  'API',
  'Mobile SDK',
  'Channel Integrations'
];

export function ChannelsSettingsSectionOverlay({ isOpen, onClose, initialTab = 'Email' }: ChannelsSettingsSectionOverlayProps) {
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Update selectedTab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setSelectedTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-6">
      <div 
        ref={overlayRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-[1200px] h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-medium">Channel Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  selectedTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-xl font-medium">{selectedTab}</h3>
        </div>
      </div>
    </div>
  );
} 