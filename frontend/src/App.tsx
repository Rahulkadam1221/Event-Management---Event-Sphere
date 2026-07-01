import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { useAuth } from './context/AuthContext';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

// Lazy-load pages
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(m => ({ default: m.EventsPage })));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then(m => ({ default: m.EventDetailPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage').then(m => ({ default: m.DesignSystemPage })));
const BookingPage = lazy(() => import('./pages/BookingPage').then(m => ({ default: m.BookingPage })));

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/:mode" element={<AuthPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout/:eventId"
            element={
              <ProtectedRoute>
                <BookingPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: { background: 'var(--toast-bg)', color: 'var(--toast-color)', borderRadius: '12px', border: '1px solid var(--toast-border)' },
                }}
              />
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
