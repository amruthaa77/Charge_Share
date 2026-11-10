import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CookieConsent } from './components/common/CookieConsent';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileNav } from './components/layout/MobileNav';
import { RiderHostGuard } from './components/common/RiderHostGuard';

// Core Pages
import { LandingPage } from './pages/LandingPage';
import { ExplorePage } from './pages/ExplorePage';
import { ChargerDetailPage } from './pages/ChargerDetailPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { HostOnboardPage } from './pages/HostOnboardPage';
import { HostDashboardPage } from './pages/HostDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Admin Back-Office Portal & Pages
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminKYCPage } from './pages/admin/AdminKYCPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage';
import { AdminListingsPage } from './pages/admin/AdminListingsPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminMessagesPage } from './pages/admin/AdminMessagesPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';

// Legal & Informational Pages
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { RefundPolicyPage } from './pages/RefundPolicyPage';
import { CookiePolicyPage } from './pages/CookiePolicyPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { HelpPage } from './pages/HelpPage';
import { CreditsPage } from './pages/CreditsPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// Scroll to top helper on route navigation
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Route-scoped error boundary that automatically resets on navigation
const RouteErrorBoundary = ({ children }) => {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKeys={[pathname]}>{children}</ErrorBoundary>;
};

const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className={`flex flex-col min-h-screen min-h-[100dvh] ${isAdminRoute ? '' : 'pb-16 md:pb-0'} overflow-x-clip`}>
      {!isAdminRoute && <Navbar />}
      <main id="main-content" tabIndex="-1" className="flex-1 focus:outline-none">
        <RouteErrorBoundary>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/chargers/:id" element={<ChargerDetailPage />} />
            <Route
              path="/my-bookings"
              element={
                <RiderHostGuard flowName="booking management">
                  <MyBookingsPage />
                </RiderHostGuard>
              }
            />
            <Route
              path="/vehicles"
              element={
                <RiderHostGuard flowName="vehicle management">
                  <VehiclesPage />
                </RiderHostGuard>
              }
            />
            <Route
              path="/become-a-host"
              element={
                <RiderHostGuard flowName="host onboarding">
                  <HostOnboardPage />
                </RiderHostGuard>
              }
            />
            <Route
              path="/host/dashboard"
              element={
                <RiderHostGuard flowName="host dashboard">
                  <HostDashboardPage />
                </RiderHostGuard>
              }
            />

            {/* Dedicated Unauthenticated Admin Sign-In Portal */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Protected Admin Back-Office Portal */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="kyc" element={<AdminKYCPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:id" element={<AdminUserDetailPage />} />
              <Route path="listings" element={<AdminListingsPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="messages" element={<AdminMessagesPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
            </Route>

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Legal, Support & Auth Routes */}
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/credits" element={<CreditsPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </RouteErrorBoundary>
      </main>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <MobileNav />}
      <CookieConsent />
    </div>
  );
};

export function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <ScrollToTop />
              {/* Accessible Skip to Content Link */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[99999] focus:px-4 focus:py-2 focus:bg-brand focus:text-brand-contrast focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand font-semibold text-xs transition-all"
              >
                Skip to main content
              </a>
              <AppContent />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
