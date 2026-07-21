import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTruck } from '../context/TruckContext';
import {
  LayoutDashboard,
  MapPin,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  DollarSign,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Truck,
  Plus,
  Bell,
  BarChart3
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/find-trucks', label: 'Customer Map', icon: Truck },
  { path: '/locations', label: 'Locations', icon: MapPin },
  { path: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/financial', label: 'Financial', icon: DollarSign },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/events', label: 'Events', icon: Calendar },
  { path: '/permits', label: 'Permits', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { trucks, selectedTruck, selectTruck } = useTruck();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [truckDropdownOpen, setTruckDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link to="/" className="flex items-center gap-2">
              <Truck className="h-8 w-8 text-primary-600" />
              <span className="font-bold text-xl text-gray-900">FoodTruck Ops</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Truck Selector */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <button
                onClick={() => setTruckDropdownOpen(!truckDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="font-medium text-gray-900 truncate">
                  {selectedTruck?.name || 'Select Truck'}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${truckDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {truckDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {trucks.map(truck => (
                    <button
                      key={truck.id}
                      onClick={() => {
                        selectTruck(truck);
                        setTruckDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                        selectedTruck?.id === truck.id ? 'bg-primary-50 text-primary-700' : ''
                      }`}
                    >
                      {truck.name}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setTruckDropdownOpen(false);
                      navigate('/settings?tab=trucks');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-t border-gray-200 text-primary-600 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Truck
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  {Icon ? <Icon className="h-5 w-5" /> : <span className="h-5 w-5 inline-block" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 lg:flex-initial">
              <h1 className="text-xl font-semibold text-gray-900 lg:hidden text-center">
                {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell className="h-6 w-6 text-gray-600" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {selectedTruck ? (
            children
          ) : (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Truck Selected</h2>
              <p className="text-gray-600 mb-4">Create or select a food truck to get started</p>
              <button
                onClick={() => navigate('/settings?tab=trucks')}
                className="btn btn-primary"
              >
                Add Your First Truck
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
