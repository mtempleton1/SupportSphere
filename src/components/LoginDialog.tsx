import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";

interface UserProfile {
  userType: 'staff' | 'end_user';
  roleId: string;
  Roles: {
    roleCategory: 'end_user' | 'agent' | 'admin' | 'owner';
  };
}

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
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset mode and form when dialog closes or type changes
  useEffect(() => {
    if (!isOpen || type === 'staff') {
      setMode('login');
      setEmail('');
      setPassword('');
      setFullName('');
      setError(null);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // First, get the account ID from the hostname
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      const { data: account, error: accountError } = await supabase
        .from('Accounts')
        .select('accountId')
        .eq('subdomain', subdomain)
        .single();

      if (accountError) throw accountError;

      // Call the login edge function
      const { data: loginData, error: loginError } = await supabase.functions.invoke('login', {
        body: {
          email,
          password,
          accountId: account.accountId,
          loginType: type
        }
      });
      console.log(loginData);
      if (loginError) throw loginError;

      // Set the session in the client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: loginData.session.access_token,
        refresh_token: loginData.session.refresh_token
      });

      if (sessionError) throw sessionError;

      // Handle navigation based on user type and role
      if (type === 'staff') {
        console.log("STAFF!")

        const roleCategory = loginData.session.user.user_metadata.roleCategory;
        console.log(roleCategory);
        if (roleCategory === 'admin' || roleCategory === 'owner') {
          navigate('/admin');
        } else if (roleCategory === 'agent') {
          navigate('/agent');
        } else {
          throw new Error('Invalid staff role');
        }
      } else {
        navigate('/user');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: { session }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!session) {
        setMode('login');
        setError('Please check your email to verify your account, then sign in.');
        return;
      }

      // Get the account ID from the hostname
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      const { data: account, error: accountError } = await supabase
        .from('Accounts')
        .select('accountId')
        .eq('subdomain', subdomain)
        .single();

      if (accountError) throw accountError;

      // Create user profile
      const { error: profileError } = await supabase
        .from('UserProfiles')
        .insert([
          {
            userId: session.user.id,
            name: fullName,
            userType: 'end_user',
            accountId: account.accountId,
            isEmailVerified: false,
          }
        ]);

      if (profileError) throw profileError;

      navigate('/user');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) throw resetError;
      setMode('login');
      setError('Please check your email for password reset instructions.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    if (mode === 'signup' && type === 'user') {
      return (
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Create a password"
              required
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Support Account'}
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
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
              required
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Reset Password'}
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
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
            required
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : type === "staff" ? "Login as Staff" : "Sign in"}
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
