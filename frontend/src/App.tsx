import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProviderWrapper } from './contexts/ThemeContext';
import AppLayout from './components/Layout/AppLayout';
import LoginPage from './pages/LoginPage';
import EnhancedDashboardPage from './pages/EnhancedDashboardPage';
import DraggableDashboardPage from './pages/DraggableDashboardPage';
import SmartAnalysisPage from './pages/SmartAnalysisPage';
import MyPage from './pages/MyPage';
import SharedAnalysesPage from './pages/SharedAnalysesPage';
import AnalysisDetailPage from './pages/AnalysisDetailPage';
import SettingsPage from './pages/SettingsPage';
import LoadingPage from './components/LoadingPage';
import ImageSearchPage from './pages/ImageSearchPage';


// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route component (redirect to dashboard if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProviderWrapper>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DraggableDashboardPage />} />
              <Route path="analysis" element={<SmartAnalysisPage />} />
              <Route path="image-search" element={<ImageSearchPage />} />
              <Route path="mypage" element={<MyPage />} />
              <Route path="shared" element={<SharedAnalysesPage />} />
              <Route path="analysis/:id" element={<AnalysisDetailPage />} />
              <Route path="shared/:id" element={<AnalysisDetailPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProviderWrapper>
  );
}

export default App;