import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  MessageCircle,
  Search,
  Phone,
  Bell,
  Grid,
  HelpCircle,
  User,
  ChevronDown,
  LogOut,
} from "lucide-react";

export function AgentHeader() {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle clicking outside of dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowDropdown(false);
    window.location.href = '/';
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white border-b">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button className="p-1 hover:bg-gray-100 rounded">
            <Grid size={20} />
          </button>
          <div className="flex items-center space-x-1 px-3 py-1 bg-gray-100 rounded text-sm">
            <MessageCircle size={16} />
            <span>Conversations</span>
            <span className="bg-gray-200 px-1.5 rounded">0</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1 hover:bg-gray-100 rounded">
            <Phone size={20} />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Bell size={20} />
          </button>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="p-1 hover:bg-gray-100 rounded">
          <Search size={20} />
        </button>
        <button className="p-1 hover:bg-gray-100 rounded">
          <HelpCircle size={20} />
        </button>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
              <User size={20} />
            </div>
            <ChevronDown size={16} />
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 