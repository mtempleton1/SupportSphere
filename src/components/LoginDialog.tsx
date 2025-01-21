import { useState, useEffect } from "react";
import { X, ArrowRight } from "lucide-react";

export const LoginDialog = ({
  isOpen,
  onClose,
  type,
  accountType,
}: {
  isOpen: boolean;
  onClose: () => void;
  type: "staff" | "user";
  accountType: 'submit_ticket' | 'sign_up';
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');

  // Reset mode when dialog closes or type changes
  useEffect(() => {
    if (!isOpen || type === 'staff') {
      setMode('login');
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const renderForm = () => {
    if (mode === 'signup' && type === 'user') {
      return (
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Create a password"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Support Account
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className="w-full text-sm text-blue-600 hover:text-blue-500"
          >
            Already have an account? Sign in
          </button>
        </form>
      );
    }

    if (mode === 'reset' && type === 'user') {
      return (
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reset Password
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className="w-full text-sm text-blue-600 hover:text-blue-500"
          >
            Back to sign in
          </button>
        </form>
      );
    }

    return (
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {type === "staff" ? "Login as Staff" : "Sign in"}
        </button>
        {type === 'user' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setMode('reset')}
              className="w-full text-sm text-blue-600 hover:text-blue-500"
            >
              Forgot your password?
            </button>
            {accountType === 'sign_up' && mode === 'login' && (
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="w-full text-sm text-blue-600 hover:text-blue-500"
              >
                Need an account? Create one now
              </button>
            )}
          </div>
        )}
      </form>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold mb-6">
          {type === "staff" 
            ? "Staff Login" 
            : mode === 'signup'
              ? "Create Support Account"
              : mode === 'reset'
                ? "Reset Password"
                : accountType === 'submit_ticket'
                  ? "Check on Existing Ticket"
                  : "Sign in to Support"}
        </h2>
        {renderForm()}
      </div>
    </div>
  );
};
