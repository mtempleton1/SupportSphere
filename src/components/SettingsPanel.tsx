import { useState } from 'react';
import { X } from 'lucide-react';
import { ManageSettingsSectionOverlay } from './overlays/ManageSettingsSectionOverlay';
import { ChannelsSettingsSectionOverlay } from './overlays/ChannelsSettingsSectionOverlay';
import { BusinessRulesSettingsSectionOverlay } from './overlays/BusinessRulesSettingsSectionOverlay';
import { SettingsSectionOverlay } from './overlays/SettingsSectionOverlay';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  roleCategory: 'admin' | 'agent';
}

interface SettingsSection {
  header: string;
  items: {
    label: string;
    onClick: () => void;
  }[];
}

interface OverlayState {
  type: 'manage' | 'channels' | 'business-rules' | 'settings' | null;
  selectedTab: string | null;
}

export function SettingsPanel({ isOpen, onClose, roleCategory }: SettingsPanelProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [overlayState, setOverlayState] = useState<OverlayState>({
    type: null,
    selectedTab: null
  });

  const handleItemClick = (header: string, label: string) => {
    setSelectedSection(label);
    
    switch (header) {
      case 'MANAGE':
        setOverlayState({ type: 'manage', selectedTab: label });
        break;
      case 'CHANNELS':
        setOverlayState({ type: 'channels', selectedTab: label });
        break;
      case 'BUSINESS RULES':
        setOverlayState({ type: 'business-rules', selectedTab: label });
        break;
      case 'SETTINGS':
        setOverlayState({ type: 'settings', selectedTab: label });
        break;
    }
  };

  const handleOverlayClose = () => {
    setOverlayState({ type: null, selectedTab: null });
  };

  const adminSettings: SettingsSection[] = [
    {
      header: 'ADMIN HOME',
      items: [
        { label: 'Overview', onClick: () => {} },
      ]
    },
    {
      header: 'MANAGE',
      items: [
        { label: 'People', onClick: () => handleItemClick('MANAGE', 'People') },
        { label: 'User Fields', onClick: () => handleItemClick('MANAGE', 'User Fields') },
        { label: 'Organization Fields', onClick: () => handleItemClick('MANAGE', 'Organization Fields') },
        { label: 'Brands', onClick: () => handleItemClick('MANAGE', 'Brands') },
        { label: 'Views', onClick: () => handleItemClick('MANAGE', 'Views') },
        { label: 'Macros', onClick: () => handleItemClick('MANAGE', 'Macros') },
        { label: 'Tags', onClick: () => handleItemClick('MANAGE', 'Tags') },
        { label: 'Ticket Fields', onClick: () => handleItemClick('MANAGE', 'Ticket Fields') },
        { label: 'Ticket Forms', onClick: () => handleItemClick('MANAGE', 'Ticket Forms') },
        { label: 'Context Panel', onClick: () => handleItemClick('MANAGE', 'Context Panel') },
        { label: 'Dynamic Content', onClick: () => handleItemClick('MANAGE', 'Dynamic Content') },
      ]
    },
    {
      header: 'CHANNELS',
      items: [
        { label: 'Email', onClick: () => handleItemClick('CHANNELS', 'Email') },
        { label: 'Twitter', onClick: () => handleItemClick('CHANNELS', 'Twitter') },
        { label: 'Chat', onClick: () => handleItemClick('CHANNELS', 'Chat') },
        { label: 'Facebook', onClick: () => handleItemClick('CHANNELS', 'Facebook') },
        { label: 'Talk', onClick: () => handleItemClick('CHANNELS', 'Talk') },
        { label: 'Text', onClick: () => handleItemClick('CHANNELS', 'Text') },
        { label: 'Widget', onClick: () => handleItemClick('CHANNELS', 'Widget') },
        { label: 'API', onClick: () => handleItemClick('CHANNELS', 'API') },
        { label: 'Mobile SDK', onClick: () => handleItemClick('CHANNELS', 'Mobile SDK') },
        { label: 'Channel Integrations', onClick: () => handleItemClick('CHANNELS', 'Channel Integrations') },
      ]
    },
    {
      header: 'BUSINESS RULES',
      items: [
        { label: 'Routing', onClick: () => handleItemClick('BUSINESS RULES', 'Routing') },
        { label: 'Triggers', onClick: () => handleItemClick('BUSINESS RULES', 'Triggers') },
        { label: 'Automations', onClick: () => handleItemClick('BUSINESS RULES', 'Automations') },
        { label: 'Service Level Agreements', onClick: () => handleItemClick('BUSINESS RULES', 'Service Level Agreements') },
        { label: 'Rule Analysis', onClick: () => handleItemClick('BUSINESS RULES', 'Rule Analysis') },
        { label: 'Answer Bot', onClick: () => handleItemClick('BUSINESS RULES', 'Answer Bot') },
      ]
    },
    {
      header: 'SETTINGS',
      items: [
        { label: 'Account', onClick: () => handleItemClick('SETTINGS', 'Account') },
        { label: 'Subscription', onClick: () => handleItemClick('SETTINGS', 'Subscription') },
        { label: 'Security', onClick: () => handleItemClick('SETTINGS', 'Security') },
        { label: 'Schedules', onClick: () => handleItemClick('SETTINGS', 'Schedules') },
        { label: 'Tickets', onClick: () => handleItemClick('SETTINGS', 'Tickets') },
        { label: 'Agents', onClick: () => handleItemClick('SETTINGS', 'Agents') },
        { label: 'Customers', onClick: () => handleItemClick('SETTINGS', 'Customers') },
        { label: 'Benchmark Survey', onClick: () => handleItemClick('SETTINGS', 'Benchmark Survey') },
        { label: 'Extensions', onClick: () => handleItemClick('SETTINGS', 'Extensions') },
        { label: 'Sunshine', onClick: () => handleItemClick('SETTINGS', 'Sunshine') },
      ]
    }
  ];

  const agentSettings: SettingsSection[] = [
    {
      header: 'ADMIN HOME',
      items: [
        { label: 'Overview', onClick: () => {} },
      ]
    },
    {
      header: 'MANAGE',
      items: [
        { label: 'People', onClick: () => handleItemClick('MANAGE', 'People') },
        { label: 'User Fields', onClick: () => handleItemClick('MANAGE', 'User Fields') },
        { label: 'Organization Fields', onClick: () => handleItemClick('MANAGE', 'Organization Fields') },
        { label: 'Brands', onClick: () => handleItemClick('MANAGE', 'Brands') },
        { label: 'Views', onClick: () => handleItemClick('MANAGE', 'Views') },
        { label: 'Macros', onClick: () => handleItemClick('MANAGE', 'Macros') },
        { label: 'Tags', onClick: () => handleItemClick('MANAGE', 'Tags') },
        { label: 'Ticket Fields', onClick: () => handleItemClick('MANAGE', 'Ticket Fields') },
        { label: 'Ticket Forms', onClick: () => handleItemClick('MANAGE', 'Ticket Forms') },
        { label: 'Context Panel', onClick: () => handleItemClick('MANAGE', 'Context Panel') },
        { label: 'Dynamic Content', onClick: () => handleItemClick('MANAGE', 'Dynamic Content') },
      ]
    },
    {
      header: 'SETTINGS',
      items: [
        { label: 'Account', onClick: () => handleItemClick('SETTINGS', 'Account') },
        { label: 'Subscription', onClick: () => handleItemClick('SETTINGS', 'Subscription') },
        { label: 'Security', onClick: () => handleItemClick('SETTINGS', 'Security') },
        { label: 'Schedules', onClick: () => handleItemClick('SETTINGS', 'Schedules') },
        { label: 'Tickets', onClick: () => handleItemClick('SETTINGS', 'Tickets') },
        { label: 'Agents', onClick: () => handleItemClick('SETTINGS', 'Agents') },
        { label: 'Customers', onClick: () => handleItemClick('SETTINGS', 'Customers') },
        { label: 'Benchmark Survey', onClick: () => handleItemClick('SETTINGS', 'Benchmark Survey') },
        { label: 'Extensions', onClick: () => handleItemClick('SETTINGS', 'Extensions') },
        { label: 'Sunshine', onClick: () => handleItemClick('SETTINGS', 'Sunshine') },
      ]
    }
  ];

  const settings = roleCategory === 'admin' ? adminSettings : agentSettings;

  if (!isOpen) return null;

  return (
    <>
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {settings.map((section) => (
          <div key={section.header} className="py-2">
            <h3 className="px-3 text-xs font-bold text-gray-500 text-left uppercase tracking-wide">
              {section.header}
            </h3>
            <div className="mt-1">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setSelectedSection(item.label);
                    item.onClick();
                  }}
                  className={`w-full pl-6 pr-4 py-1.5 text-left text-sm transition-colors ${
                    selectedSection === item.label 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Overlays */}
      <ManageSettingsSectionOverlay
        isOpen={overlayState.type === 'manage'}
        onClose={handleOverlayClose}
        initialTab={overlayState.selectedTab || undefined}
      />
      <ChannelsSettingsSectionOverlay
        isOpen={overlayState.type === 'channels'}
        onClose={handleOverlayClose}
        initialTab={overlayState.selectedTab || undefined}
      />
      <BusinessRulesSettingsSectionOverlay
        isOpen={overlayState.type === 'business-rules'}
        onClose={handleOverlayClose}
        initialTab={overlayState.selectedTab || undefined}
      />
      <SettingsSectionOverlay
        isOpen={overlayState.type === 'settings'}
        onClose={handleOverlayClose}
        initialTab={overlayState.selectedTab || undefined}
      />
    </>
  );
} 