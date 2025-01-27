import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Building2 } from 'lucide-react';

interface Account {
  accountId: string;
  subdomain: string;
  name: string;
}

export function SupportSphereHome() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const { data, error } = await supabase
          .from('Accounts')
          .select('accountId, subdomain, name')
          .order('name');

        if (error) throw error;
        setAccounts(data || []);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load accounts');
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading accounts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to SupportSphere
          </h1>
          <p className="text-lg text-gray-600">
            Select an organization to access their support portal
          </p>
        </div>

        <div className="space-y-2">
          {accounts.map((account) => (
            <button
              key={account.accountId}
              onClick={() => navigate(`/${account.subdomain}`)}
              className="w-full text-left px-4 py-3 hover:bg-white rounded-lg transition-colors flex items-center"
            >
              <Building2 className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">{account.name}</div>
                <div className="text-sm text-gray-500">{account.subdomain}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 