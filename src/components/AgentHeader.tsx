import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  LifeBuoy,
  BookOpen,
  Users,
  MessagesSquare,
  PhoneCall,
  Compass,
  ShoppingCart,
} from "lucide-react";
// import { useLocation } from "react-router-dom";

interface AgentHeaderProps {
  subdomain: string;
}

export function AgentHeader({ subdomain }: AgentHeaderProps) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProductsMenu, setShowProductsMenu] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const productsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle clicking outside of dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (productsMenuRef.current && !productsMenuRef.current.contains(event.target as Node)) {
        setShowProductsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('UserProfiles')
          .select('name')
          .eq('userId', user.id)
          .single();
        
        if (profile) {
          setUserName(profile.name);
        }
      }
    }

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowDropdown(false);
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

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="relative" ref={productsMenuRef}>
            <button 
              className="p-1 hover:bg-gray-100 rounded"
              onClick={() => setShowProductsMenu(!showProductsMenu)}
            >
              <Grid size={20} />
            </button>
            {showProductsMenu && (
              <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
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
        <button className="p-1 hover:bg-gray-200 rounded">
          <Search size={20} />
        </button>
        <button className="p-1 hover:bg-gray-200 rounded">
          <HelpCircle size={20} />
        </button>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
              {userName ? userName[0].toUpperCase() : <User size={20} />}
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