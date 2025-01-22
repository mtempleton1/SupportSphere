import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { LoginDialog } from "../components/LoginDialog";
import { ChevronDown } from "lucide-react";

interface Account {
  accountId: string
  name: string
  subdomain: string
  endUserAccountCreationType: 'submit_ticket' | 'sign_up'
}

interface FormState {
  email: string
  reason: string
  customSubject: string
  content: string
}

interface FormErrors {
  email?: string
  reason?: string
  customSubject?: string
  content?: string
}

interface SupabaseError {
  code: string
  details: string | null
  hint: string | null
  message: string
}

interface CreateTicketResponse {
  data: string | null  // ticketId if successful, null if error
  error: SupabaseError | null
}

const TICKET_REASONS = [
  "Technical Issue",
  "Billing Question",
  "Feature Request",
  "Account Access",
  "Other"
];

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export function TicketCreate() {
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loginType, setLoginType] = useState<"staff" | "user" | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Form state
  const [formState, setFormState] = useState<FormState>({
    email: '',
    reason: '',
    customSubject: '',
    content: ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Add submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenStaffLogin = () => setLoginType("staff");
  const handleOpenUserLogin = () => setLoginType("user");
  const handleCloseLogin = () => setLoginType(null);

  useEffect(() => {
    async function checkAuthAndAccount() {
      try {
        // Get subdomain from hostname
        const hostname = window.location.hostname
        const subdomain = hostname.split('.')[0]

        const { data: account, error: accountError } = await supabase
          .from('Accounts')
          .select('accountId, name, subdomain, endUserAccountCreationType')
          .eq('subdomain', subdomain)
          .single()

        if (accountError) throw accountError
        setAccount(account)

        // If account type is 'sign_up', check authentication
        if (account.endUserAccountCreationType === 'sign_up') {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            // Redirect if not authenticated
            navigate('/')
            return
          }
          // Set user email if authenticated
          if (session?.user?.email) {
            setUserEmail(session.user.email);
            setFormState(prev => ({ ...prev, email: session.user.email || '' }));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch account')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndAccount()
  }, [navigate])

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Email validation
    if (!formState.email) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(formState.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Reason validation
    if (!formState.reason) {
      errors.reason = 'Please select a reason';
    }

    // Custom subject validation for "Other" reason
    if (formState.reason === 'Other' && !formState.customSubject.trim()) {
      errors.customSubject = 'Please enter a subject';
    }

    // Content validation
    if (!formState.content.trim()) {
      errors.content = 'Please describe your issue';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Get subdomain from hostname
      const subdomain = window.location.hostname.split('.')[0];

      const response = await supabase.functions.invoke<CreateTicketResponse>('create-ticket', {
        body: {
          email: formState.email,
          reason: formState.reason === 'Other' ? formState.customSubject : formState.reason,
          content: formState.content,
          channelType: 'help_center'
        },
        headers: {
          'x-subdomain': subdomain
        }
      });

      // Handle the response
      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data) {
        throw new Error('No response data received');
      }

      const { data, error } = response.data;
      
      if (error) {
        // Handle RLS or other Supabase errors
        console.log(error)
        alert(error.message || 'Failed to create ticket');
        return;
      }

      if (data) {
        // Reset form
        setFormState({
          email: userEmail || '',
          reason: '',
          customSubject: '',
          content: ''
        });

        // Show success message
        alert(`Ticket #${data} has been created successfully!`);
        navigate('/');
      }
      
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert(error instanceof Error ? error.message : 'Failed to create ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!account) return <div>Account not found</div>

  const isFormValid = 
    formState.email && 
    isValidEmail(formState.email) && 
    formState.reason && 
    (formState.reason !== 'Other' || formState.customSubject.trim()) && 
    formState.content.trim();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        onStaffLogin={handleOpenStaffLogin}
        onUserLogin={handleOpenUserLogin}
        accountName={account.name}
        showCreateTicket={false}
        onCreateTicket={() => {}}
        endUserAccountCreationType={account.endUserAccountCreationType}
      />
      <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Submit a Support Request
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email field - shown if user is not authenticated or account type is submit_ticket */}
            {(!userEmail || account.endUserAccountCreationType === 'submit_ticket') && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formState.email}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Enter your email address"
                  disabled={!!userEmail}
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>
            )}

            {/* Reason selection */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                What can we help you with?
              </label>
              <div className="relative">
                <select
                  id="reason"
                  name="reason"
                  value={formState.reason}
                  onChange={handleInputChange}
                  className={`block w-full pl-3 pr-10 py-2 text-base border ${
                    formErrors.reason ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md appearance-none bg-white`}
                >
                  <option value="">Select a reason for your request...</option>
                  {TICKET_REASONS.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <ChevronDown className="h-5 w-5" />
                </div>
              </div>
              {formErrors.reason && (
                <p className="mt-1 text-sm text-red-600">{formErrors.reason}</p>
              )}
            </div>

            {/* Custom subject for "Other" reason */}
            {formState.reason === 'Other' && (
              <div>
                <label htmlFor="customSubject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  id="customSubject"
                  name="customSubject"
                  value={formState.customSubject}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border ${
                    formErrors.customSubject ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Enter a subject for your request"
                />
                {formErrors.customSubject && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.customSubject}</p>
                )}
              </div>
            )}

            {/* Ticket content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                How can we help?
              </label>
              <textarea
                id="content"
                name="content"
                value={formState.content}
                onChange={handleInputChange}
                rows={6}
                className={`block w-full px-3 py-2 border ${
                  formErrors.content ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Please describe your issue in detail..."
              />
              {formErrors.content && (
                <p className="mt-1 text-sm text-red-600">{formErrors.content}</p>
              )}
            </div>

            {/* Submit button - update to show loading state */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isFormValid && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </main>
      <Footer accountName={account.name} />
      <LoginDialog
        isOpen={loginType !== null}
        onClose={handleCloseLogin}
        type={loginType || "user"}
        accountType={account.endUserAccountCreationType}
      />
    </div>
  );
} 