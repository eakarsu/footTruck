import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TruckProvider } from './context/TruckContext';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Locations from './pages/Locations';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Social from './pages/Social';
import Financial from './pages/Financial';
import Events from './pages/Events';
import Permits from './pages/Permits';
import AI from './pages/AI';
import AIAdvanced from './pages/AIAdvanced';
import Settings from './pages/Settings';
import CustomerMap from './pages/CustomerMap';
import Analytics from './pages/Analytics';
import PreOrder from './pages/PreOrder';
import Layout from './components/Layout';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/find-trucks" element={<CustomerMap />} />
      <Route path="/pre-order/:truckId" element={<PreOrder />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <TruckProvider>
              <Layout>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/social" element={<Social />} />
                    <Route path="/financial" element={<Financial />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/permits" element={<Permits />} />
                    <Route path="/ai" element={<AI />} />
                    <Route path="/ai-advanced" element={<AIAdvanced />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </ErrorBoundary>
              </Layout>
            </TruckProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
