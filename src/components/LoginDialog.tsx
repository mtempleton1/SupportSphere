import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Circle, UserCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { createClient } from '@supabase/supabase-js';
import type { PresenceState } from '../types/realtime';

// Determine if we're in Vite or Node environment
const isViteEnvironment = typeof import.meta?.env !== 'undefined';

// Get environment variables based on environment
const supabaseUrl = isViteEnvironment ? 
  import.meta.env.VITE_SUPABASE_PROJECT_URL : 
  process.env.VITE_SUPABASE_PROJECT_URL;

const serviceKey = isViteEnvironment ? 
  import.meta.env.VITE_SUPABASE_SERVICE_KEY : 
  process.env.SUPABASE_SERVICE_KEY;

// interface UserProfile {
//   userType: 'staff' | 'end_user';
//   roleId: string;
//   Roles: {
//     roleCategory: 'end_user' | 'agent' | 'admin' | 'owner';
//   };
// }

interface StaffMember {
  userId: string;
  email: string;
  name: string;
  isOnline: boolean;
}

interface EndUser {
  userId: string;
  email: string;
  name: string;
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
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [endUsers, setEndUsers] = useState<EndUser[]>([]);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

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

  // Load staff members or end users when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (type === 'staff') {
        loadStaffMembers();
      } else if (type === 'user' && import.meta.env.DEV) {
        loadEndUsers();
      }
    }
  }, [isOpen, type]);

  const loadStaffMembers = async () => {
    try {
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      // Get account
      const { data: account, error: accountError } = await supabase
        .from('Accounts')
        .select('accountId')
        .eq('subdomain', subdomain)
        .single();

      if (accountError) throw accountError;

      // Create admin client
      const adminClient = createClient(supabaseUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });

      // Get current presence state
      const presenceChannel = supabase.channel('agents_presence');
      await presenceChannel.subscribe();
      const presenceState = presenceChannel.presenceState() as PresenceState;
      
      // Get all online user IDs
      const onlineUserIds = new Set(
        Object.values(presenceState)
          .flat()
          .map(presence => presence.userId)
      );

      // Get all staff members
      const { data: staffProfiles, error: profileError } = await adminClient
        .from('UserProfiles')
        .select('userId, email, name')
        .eq('accountId', account.accountId)
        .eq('userType', 'staff');

      if (profileError || !staffProfiles) {
        throw new Error('No staff members found');
      }

      // Map staff profiles with online status
      const members = staffProfiles.map(profile => ({
        userId: profile.userId,
        email: profile.email,
        name: profile.name,
        isOnline: onlineUserIds.has(profile.userId)
      }));

      setStaffMembers(members);

      // Cleanup presence channel
      await supabase.removeChannel(presenceChannel);

    } catch (err) {
      console.error('Failed to load staff members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load staff members');
    }
  };

  const handleStaffLogin = async (staffMember: StaffMember) => {
    setLoadingUserId(staffMember.userId);
    setError(null);
    
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: staffMember.email,
        password: 'Password123!'
      });

      if (loginError) throw loginError;

      navigate('/agent');
      onClose();
    } catch (err) {
      console.error('Auto-login failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingUserId(null);
    }
  };

  const loadEndUsers = async () => {
    try {
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      // Get account
      const { data: account, error: accountError } = await supabase
        .from('Accounts')
        .select('accountId')
        .eq('subdomain', subdomain)
        .single();

      if (accountError) throw accountError;

      // Create admin client
      const adminClient = createClient(supabaseUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });

      // Get all end users
      const { data: userProfiles, error: profileError } = await adminClient
        .from('UserProfiles')
        .select('userId, email, name')
        .eq('accountId', account.accountId)
        .eq('userType', 'end_user');

      if (profileError || !userProfiles) {
        throw new Error('No end users found');
      }

      setEndUsers(userProfiles);

    } catch (err) {
      console.error('Failed to load end users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load end users');
    }
  };

  const handleEndUserLogin = async (endUser: EndUser) => {
    setLoadingUserId(endUser.userId);
    setError(null);
    
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: endUser.email,
        password: 'Password123!'
      });

      if (loginError) throw loginError;

      navigate('/user');
      onClose();
    } catch (err) {
      console.error('Auto-login failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingUserId(null);
    }
  };

  if (!isOpen) return null;

  // Render staff selection buttons in development mode
  if (import.meta.env.DEV && type === 'staff') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Select Staff Member</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {staffMembers.map(member => (
              <button
                key={member.userId}
                onClick={() => handleStaffLogin(member)}
                disabled={member.isOnline || loadingUserId === member.userId}
                className={`w-full flex items-center justify-between p-3 rounded-md border text-left ${
                  member.isOnline 
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Circle 
                    size={8} 
                    className={`fill-current ${member.isOnline ? 'text-green-500' : 'text-yellow-500'}`} 
                  />
                  <span>{member.name}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {member.isOnline ? 'Online' : 
                   loadingUserId === member.userId ? 'Logging in...' : 'Available'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render end user selection buttons in development mode
  if (import.meta.env.DEV && type === 'user') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Select End User</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {endUsers.map(user => (
              <button
                key={user.userId}
                onClick={() => handleEndUserLogin(user)}
                disabled={loadingUserId === user.userId}
                className="w-full flex items-center justify-between p-3 rounded-md border text-left hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <UserCircle size={16} className="text-gray-400" />
                  <span>{user.name}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {loadingUserId === user.userId ? 'Logging in...' : 'Click to login'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

      if (loginError) throw loginError;

      // Set the session in the client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: loginData.session.access_token,
        refresh_token: loginData.session.refresh_token
      });

      if (sessionError) throw sessionError;

      // Handle navigation based on user type and role
      if (type === 'staff') {
        const roleCategory = loginData.session.user.user_metadata.roleCategory;
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
