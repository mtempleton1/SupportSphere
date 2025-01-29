import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ChevronDown,
  Grid,
  User,
  LogOut,
  Plus,
  LifeBuoy,
  BookOpen,
  Users,
  MessagesSquare,
  PhoneCall,
  Compass,
  ShoppingCart,
  FileText,
  Clock,
} from 'lucide-react';

interface Account {
  accountId: string;
  name: string;
  subdomain: string;
  endUserAccountCreationType: 'submit_ticket' | 'sign_up';
}

interface Brand {
  brandId: string;
  name: string;
}

interface Article {
  articleId: string;
  title: string;
  state: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface UserProfile {
  userType: string;
  roleId: string;
  name: string;
  Roles: {
    roleCategory: 'admin' | 'owner' | 'agent';
  };
}

export function GuidePage() {
  const navigate = useNavigate();
  const { subdomain } = useParams<{ subdomain: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showProductsMenu, setShowProductsMenu] = useState(false);
  const [showBrandsMenu, setShowBrandsMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const productsMenuRef = useRef<HTMLDivElement>(null);
  const brandsMenuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'published' | 'drafts'>('all');

  useEffect(() => {
    // Handle clicking outside of dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (productsMenuRef.current && !productsMenuRef.current.contains(event.target as Node)) {
        setShowProductsMenu(false);
      }
      if (brandsMenuRef.current && !brandsMenuRef.current.contains(event.target as Node)) {
        setShowBrandsMenu(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function checkAuthAndAccount() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate(`/${subdomain}`);
          return;
        }

        if (!subdomain) {
          setError('Invalid subdomain');
          return;
        }

        // Get account
        const { data: account, error: accountError } = await supabase
          .from('Accounts')
          .select('accountId, name, subdomain, endUserAccountCreationType')
          .eq('subdomain', subdomain)
          .single();

        if (accountError) throw accountError;
        setAccount(account);

        // Verify user is an admin for this account
        const { data: userProfile, error: userError } = await supabase
          .from('UserProfiles')
          .select('userType, roleId, name, Roles!inner(roleCategory)')
          .eq('userId', session.user.id)
          .eq('accountId', account.accountId)
          .single();

        if (userError) throw userError;

        // Set the user name
        setUserName(userProfile.name);

        // Only allow admin access
        const hasAdminAccess = userProfile.userType === 'staff';
        
        if (!hasAdminAccess) {
          navigate(`/${subdomain}/agent`);
          return;
        }

        // Fetch brands for the account
        const { data: brands, error: brandsError } = await supabase
          .from('Brands')
          .select('brandId, name')
          .eq('accountId', account.accountId);

        if (brandsError) throw brandsError;
        setBrands(brands || []);

      } catch (err) {
        console.log(err)
        setError(err instanceof Error ? err.message : 'Failed to fetch account');
        navigate(`/${subdomain}`);
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndAccount();
  }, [navigate, subdomain]);

  useEffect(() => {
    async function fetchArticles() {
      try {
        let query = supabase
          .from('KBArticles')
          .select('articleId, title, state, createdAt, updatedAt, publishedAt')
          .eq('accountId', account?.accountId);

        if (selectedFilter === 'published') {
          query = query.eq('state', 'published');
        } else if (selectedFilter === 'drafts') {
          query = query.eq('state', 'draft');
        }

        const { data, error } = await query;
        if (error) throw error;
        setArticles(data || []);
      } catch (err) {
        console.error('Error fetching articles:', err);
      }
    }

    if (account?.accountId) {
      fetchArticles();
    }
  }, [account?.accountId, selectedFilter]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowUserDropdown(false);
    window.location.href = `/${subdomain}`;
  };

  const products = [
    { name: 'Support', icon: <LifeBuoy size={18} />, path: '/agent' },
    { name: 'Guide', icon: <BookOpen size={18} />, path: '/guide' },
    { name: 'Gather', icon: <Users size={18} />, path: '/gather' },
    { name: 'Chat', icon: <MessagesSquare size={18} />, path: '/chat' },
    { name: 'Talk', icon: <PhoneCall size={18} />, path: '/talk' },
    { name: 'Explore', icon: <Compass size={18} />, path: '/explore' },
    { name: 'Sell', icon: <ShoppingCart size={18} />, path: '/sell' },
  ];

  const handleProductSelect = (path: string) => {
    setShowProductsMenu(false);
    navigate(`/${subdomain}${path}`);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!account) return <div>Account not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Custom Header */}
      <header className="bg-white border-b">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            {/* Brands dropdown */}
            <div className="relative" ref={brandsMenuRef}>
              <button
                onClick={() => setShowBrandsMenu(!showBrandsMenu)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                <span>{brands[0]?.name || 'Select Brand'}</span>
                <ChevronDown size={16} />
              </button>
              {showBrandsMenu && (
                <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {brands.map((brand) => (
                      <button
                        key={brand.brandId}
                        className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                      >
                        {brand.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Add dropdown */}
            <div className="relative" ref={addMenuRef}>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                <Plus size={16} />
                <span>Add</span>
                <ChevronDown size={16} />
              </button>
              {showAddMenu && (
                <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left">
                      New Article
                    </button>
                    <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left">
                      New Section
                    </button>
                    <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left">
                      New Category
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Products Menu */}
            <div className="relative" ref={productsMenuRef}>
              <button 
                className="p-1 hover:bg-gray-100 rounded"
                onClick={() => setShowProductsMenu(!showProductsMenu)}
              >
                <Grid size={20} />
              </button>
              {showProductsMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {products.map((product) => (
                      <button
                        key={product.name}
                        className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        onClick={() => handleProductSelect(product.path)}
                      >
                        <span className="mr-3 text-gray-500">{product.icon}</span>
                        {product.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                  {userName ? userName[0].toUpperCase() : <User size={20} />}
                </div>
                <ChevronDown size={16} />
              </button>
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
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
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Left Panel */}
        <div className="w-64 bg-gray-100 border-r flex-shrink-0">
          <nav className="p-4">
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`w-full px-4 py-2 text-sm rounded-md text-left flex items-center ${
                    selectedFilter === 'all'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-700 hover:bg-white/50'
                  }`}
                >
                  All articles
                </button>
              </li>
              <li>
                <button
                  onClick={() => setSelectedFilter('published')}
                  className={`w-full px-4 py-2 text-sm rounded-md text-left flex items-center ${
                    selectedFilter === 'published'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-700 hover:bg-white/50'
                  }`}
                >
                  Published
                </button>
              </li>
              <li>
                <button
                  onClick={() => setSelectedFilter('drafts')}
                  className={`w-full px-4 py-2 text-sm rounded-md text-left flex items-center ${
                    selectedFilter === 'drafts'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-700 hover:bg-white/50'
                  }`}
                >
                  Drafts
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-8 py-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  Knowledge Base Articles
                </h1>
                <button
                  onClick={() => setShowAddMenu(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus size={16} className="mr-2" />
                  New Article
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-8">Loading articles...</div>
              ) : error ? (
                <div className="text-center text-red-600 py-8">{error}</div>
              ) : articles.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No articles found. Create your first article to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <div
                      key={article.articleId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="text-gray-400" size={20} />
                        <div>
                          <h3 className="font-medium text-gray-900">{article.title}</h3>
                          <p className="text-sm text-gray-500 flex items-center">
                            <Clock size={14} className="mr-1" />
                            {new Date(article.updatedAt).toLocaleDateString()}
                            <span className="mx-2">•</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              article.state === 'published' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {article.state}
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/${subdomain}/guide/articles/${article.articleId}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 