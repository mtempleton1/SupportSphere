import React from "react";
import { UserCircle, Users, MessageSquarePlus } from "lucide-react";

export const Header = ({
  onStaffLogin,
  onUserLogin,
  accountName,
  showCreateTicket,
  onCreateTicket,
  endUserAccountCreationType,
}: {
  onStaffLogin: () => void;
  onUserLogin: () => void;
  accountName: string;
  showCreateTicket?: boolean;
  onCreateTicket?: () => void;
  endUserAccountCreationType: 'submit_ticket' | 'sign_up';
}) => {
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
          </div>
        </div>
      </div>
    </header>
  );
};
