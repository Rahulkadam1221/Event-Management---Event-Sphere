import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/layout/AuthLayout';
import { api } from '../lib/axios';
import axios from 'axios';
import toast from 'react-hot-toast';

// Zod schemas for all forms
const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['ATTENDEE', 'ORGANIZER']).default('ATTENDEE'),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

const resetSchema = z.object({
  email: z.string().email('Enter a valid email'),
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export const AuthPage: React.FC = () => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const { login, register, googleLogin } = useAuth();

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Forms setup
  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'ATTENDEE' },
  });
  const forgotForm = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  // Mode helpers
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';

  // Google Sign In integration (supporting both real OAuth and simulated Sandbox mode)
  const handleGoogleSignIn = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // Sandbox Fallback if environment variables are not yet configured
    if (!clientId || clientId === 'your-google-client-id.apps.googleusercontent.com') {
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1200)),
        {
          loading: 'Connecting to Google Accounts (Sandbox Mode)...',
          success: 'Successfully authenticated with Google Sandbox!',
          error: 'Google Sign-in failed.',
        }
      ).then(async () => {
        try {
          await login('attendee@eventsphere.com', 'password123');
          navigate('/dashboard');
        } catch (err: any) {
          toast.error('Simulation login failed. Make sure the backend is active.');
        }
      });
      return;
    }

    // Live Google Identity Services OAuth 2.0 Integration
    try {
      if (!(window as any).google?.accounts?.oauth2) {
        toast.error('Google accounts library loading. Please try again in a moment.');
        return;
      }

      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            toast.error(`Google authentication error: ${tokenResponse.error_description || tokenResponse.error}`);
            return;
          }

          const loadId = toast.loading('Retrieving Google user profile...');
          try {
            const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });

            await googleLogin(profile.email, profile.name, profile.sub, profile.picture);
            toast.dismiss(loadId);
            toast.success(`Welcome to EventSphere, ${profile.name}! 🌟`);
            navigate('/dashboard');
          } catch (err: any) {
            toast.dismiss(loadId);
            toast.error(err?.response?.data?.message || 'Failed to authenticate Google user with backend.');
          }
        },
      });

      client.requestAccessToken();
    } catch (error) {
      console.error(error);
      toast.error('Failed to initialize Google Sign-in popup');
    }
  };

  // Submit handlers
  const handleLogin = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back! 👋');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid email or password');
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    try {
      await register(data.email, data.password, data.name, data.role);
      toast.success('Account created! Welcome to EventSphere 🎉');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    }
  };

  const handleForgot = async (data: ForgotForm) => {
    try {
      const response = await api.post('/auth/forgot-password', data);
      const mockToken = response.data?.data?.token;

      toast.success(response.data?.message || 'Reset instructions dispatched!');

      if (mockToken) {
        // Displaying reset token immediately in a toast for easy developer testing
        toast(`🔑 Testing Token: ${mockToken} (Autofilled in Reset View)`, {
          icon: '⚙️',
          duration: 6000,
        });
        // Redirect to reset form and prepopulate email
        navigate(`/auth/reset?email=${encodeURIComponent(data.email)}&token=${mockToken}`);
      } else {
        navigate(`/auth/reset?email=${encodeURIComponent(data.email)}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to request reset token');
    }
  };

  const handleReset = async (data: ResetForm) => {
    try {
      const response = await api.post('/auth/reset-password', {
        email: data.email,
        token: data.token,
        newPassword: data.password,
      });
      toast.success(response.data?.message || 'Password reset successfully! Please login.');
      navigate('/auth/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Password reset failed');
    }
  };

  // Layout parameters
  const layoutProps = {
    login: {
      title: 'Sign In',
      subtitle: (
        <>
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-brand-500 font-semibold hover:underline">
            Create one free
          </Link>
        </>
      ),
      leftPanelTitle: 'Welcome back to EventSphere 🌐',
      leftPanelDesc: 'Your organized events, registration rosters, and chat channels are waiting.',
    },
    register: {
      title: 'Create Account',
      subtitle: (
        <>
          Already have an account?{' '}
          <Link to="/auth/login" className="text-brand-500 font-semibold hover:underline">
            Sign In
          </Link>
        </>
      ),
      leftPanelTitle: 'Join 10,000+ experience creators 🚀',
      leftPanelDesc: 'Create events, distribute QR tickets, accept payments, and build communities.',
    },
    forgot: {
      title: 'Password Recovery',
      subtitle: (
        <>
          Remembered your password?{' '}
          <Link to="/auth/login" className="text-brand-500 font-semibold hover:underline">
            Sign In
          </Link>
        </>
      ),
      leftPanelTitle: 'Keep your credentials secure 🔒',
      leftPanelDesc: 'Enter your email address and we will dispatch password recovery token instructions.',
    },
    reset: {
      title: 'Reset Password',
      subtitle: (
        <>
          Cancel and return to{' '}
          <Link to="/auth/login" className="text-brand-500 font-semibold hover:underline">
            Sign In
          </Link>
        </>
      ),
      leftPanelTitle: 'Establish a new passcode 🔑',
      leftPanelDesc: 'Create a strong password that you do not use anywhere else to protect your account.',
    },
  };

  const activeLayout = isRegister
    ? layoutProps.register
    : isForgot
    ? layoutProps.forgot
    : isReset
    ? layoutProps.reset
    : layoutProps.login;

  // Prepopulate query parameters on Reset mode
  React.useEffect(() => {
    if (isReset) {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');
      const token = params.get('token');
      if (email) resetForm.setValue('email', email);
      if (token) resetForm.setValue('token', token);
    }
  }, [isReset, resetForm]);

  return (
    <AuthLayout {...activeLayout}>
      {/* Forms switch */}
      {isRegister && (
        <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            leftIcon={<User className="w-4 h-4" />}
            error={registerForm.formState.errors.name?.message}
            {...registerForm.register('name')}
          />
          <Input
            label="Email"
            placeholder="you@example.com"
            leftIcon={<Mail className="w-4 h-4" />}
            error={registerForm.formState.errors.email?.message}
            {...registerForm.register('email')}
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            }
            error={registerForm.formState.errors.password?.message}
            {...registerForm.register('password')}
          />
          <Input
            label="Confirm Password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repeat your password"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            }
            error={registerForm.formState.errors.confirmPassword?.message}
            {...registerForm.register('confirmPassword')}
          />

          {/* Role selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wide uppercase">I want to...</label>
            <div className="grid grid-cols-2 gap-3">
              {(['ATTENDEE', 'ORGANIZER'] as const).map((role) => (
                <label key={role} className="cursor-pointer">
                  <input type="radio" value={role} {...registerForm.register('role')} className="sr-only" />
                  <div
                    className={`p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                      registerForm.watch('role') === role
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-transparent'
                    }`}
                  >
                    <div className="text-2xl mb-1">{role === 'ATTENDEE' ? '🎟️' : '🎤'}</div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {role === 'ATTENDEE' ? 'Attend Events' : 'Host Events'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" size="lg" isLoading={registerForm.formState.isSubmitting}>
            Create Account
          </Button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-x-0 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="relative bg-white dark:bg-[#0f0f11] px-3 text-xs text-gray-400 uppercase tracking-wider font-semibold">Or continue with</span>
          </div>

          {/* Google Login button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full h-11 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-center gap-3 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors font-semibold text-sm"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.29 1.945 15.42 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.6 0 11-4.65 11-11.2 0-.756-.08-1.333-.26-1.8H12.24z"
              />
            </svg>
            Sign up with Google
          </button>
        </form>
      )}

      {isForgot && (
        <form onSubmit={forgotForm.handleSubmit(handleForgot)} className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Provide your account email address. We will verify it and display a temporary recovery token code for you.
          </p>
          <Input
            label="Email Address"
            placeholder="you@example.com"
            leftIcon={<Mail className="w-4 h-4" />}
            error={forgotForm.formState.errors.email?.message}
            {...forgotForm.register('email')}
          />
          <Button type="submit" className="w-full mt-2" size="lg" isLoading={forgotForm.formState.isSubmitting}>
            Send Recovery Code
          </Button>
        </form>
      )}

      {isReset && (
        <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
          <Input
            label="Email Address"
            placeholder="you@example.com"
            leftIcon={<Mail className="w-4 h-4" />}
            error={resetForm.formState.errors.email?.message}
            {...resetForm.register('email')}
          />
          <Input
            label="Reset Token"
            placeholder="Ex. 3DF9A1"
            leftIcon={<KeyRound className="w-4 h-4" />}
            error={resetForm.formState.errors.token?.message}
            {...resetForm.register('token')}
          />
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimum 8 characters"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            }
            error={resetForm.formState.errors.password?.message}
            {...resetForm.register('password')}
          />
          <Input
            label="Confirm New Password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repeat new password"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            }
            error={resetForm.formState.errors.confirmPassword?.message}
            {...resetForm.register('confirmPassword')}
          />
          <Button type="submit" className="w-full mt-2" size="lg" isLoading={resetForm.formState.isSubmitting}>
            Reset Password
          </Button>
        </form>
      )}

      {!isRegister && !isForgot && !isReset && (
        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
          <Input
            label="Email"
            placeholder="you@example.com"
            leftIcon={<Mail className="w-4 h-4" />}
            error={loginForm.formState.errors.email?.message}
            {...loginForm.register('email')}
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            }
            error={loginForm.formState.errors.password?.message}
            {...loginForm.register('password')}
          />

          <div className="flex items-center justify-end">
            <Link
              to="/auth/forgot"
              className="text-xs sm:text-sm text-brand-500 hover:text-brand-600 font-semibold transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full mt-1" size="lg" isLoading={loginForm.formState.isSubmitting}>
            Sign In
          </Button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-x-0 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="relative bg-white dark:bg-[#0f0f11] px-3 text-xs text-gray-400 uppercase tracking-wider font-semibold">Or continue with</span>
          </div>

          {/* Google Login button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full h-11 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-center gap-3 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors font-semibold text-sm"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>
        </form>
      )}
    </AuthLayout>
  );
};
