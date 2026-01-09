import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { MyAuctionsPage } from './pages/MyAuctionsPage';
import { ActiveAuctionsPage } from './pages/ActiveAuctionsPage';
import { MyGiftsPage } from './pages/MyGiftsPage';
import { AuctionPage } from './pages/AuctionPage';
import './index.css';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <span>Загрузка...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <span>Загрузка...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/my-auctions"
        element={
          <PrivateRoute>
            <MyAuctionsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/active-auctions"
        element={
          <PrivateRoute>
            <ActiveAuctionsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/my-gifts"
        element={
          <PrivateRoute>
            <MyGiftsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/auctions/:id"
        element={
          <PrivateRoute>
            <AuctionPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
