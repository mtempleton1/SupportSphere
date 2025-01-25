import { useState, useRef, useEffect } from "react";
import { UserCircle, Users, MessageSquarePlus, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";

interface HeaderProps {
  onStaffLogin: () => void;
  onUserLogin: () => void;
  accountName: string;
  showCreateTicket?: boolean;
  onCreateTicket?: () => void;
  endUserAccountCreationType: 'submit_ticket' | 'sign_up';
}

export const Header = ({
  onStaffLogin,
  onUserLogin,
  accountName,
  showCreateTicket,
  onCreateTicket,
  endUserAccountCreationType,
}: HeaderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    
    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="text-xl font-semibold text-gray-800">
            {accountName} Support Portal
          </div>
          <div className="flex gap-4">
            {showCreateTicket && (
              <button
                onClick={onCreateTicket}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <MessageSquarePlus className="w-5 h-5 mr-2" />
                Create Ticket
              </button>
            )}
            {!isAuthenticated ? (
              <>
                <button
                  onClick={onUserLogin}
                  className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <UserCircle className="w-5 h-5 mr-2" />
                  {endUserAccountCreationType === 'sign_up' ? 'Sign up / Sign in' : 'Sign in'}
                </button>
                <button
                  onClick={onStaffLogin}
                  className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Staff Login
                </button>
              </>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <UserCircle className="w-6 h-6 text-gray-600" />
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
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
