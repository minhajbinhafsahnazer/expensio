import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './core/theme/variables.css';

// Providers
import { QueryProvider } from './core/providers/QueryProvider';
import { AuthProvider } from './core/providers/AuthContext';
import { SyncProvider } from './core/sync/SyncEngine';

// Layout
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Pages — authenticated
import { HomePage } from './pages/home';
import { PortfolioPage } from './pages/portfolio';
import { DevUIPage } from './pages/dev-ui';
import ProfilePage from './pages/profile';
import AnalyticsPage from './pages/analytics';

// Pages — auth
import { LoginPage } from './pages/auth/login';
import { RegisterPage } from './pages/auth/register';

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* ── Public auth routes ─────────────────────────────────── */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ── Protected routes ───────────────────────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route path="/"          element={<HomePage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/profile"   element={<ProfilePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/dev/ui"    element={<DevUIPage />} />
      </Route>

      {/* ── Fallback ───────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <AuthProvider>
        <SyncProvider>
          <App />
        </SyncProvider>
      </AuthProvider>
    </QueryProvider>
  </React.StrictMode>,
);
