import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  CubeIcon,
  ShoppingCartIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
  UserGroupIcon,
  BanknotesIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import useAuthStore from '../stores/authStore';
import NotificationDropdown from '../components/NotificationDropdown';
import { startNotificationPolling, stopNotificationPolling } from '../services/notificationService';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  {
    name: 'Distribution',
    icon: TruckIcon,
    children: [
      { name: 'Distribution Plans', href: '/distribution' },
      { name: 'Create Plan', href: '/distribution/create' },
    ]
  },
  {
    name: 'Inventory',
    icon: CubeIcon,
    children: [
      { name: 'Stock Overview', href: '/inventory' },
      { name: 'Transactions', href: '/inventory/transactions' },
      { name: 'Stock Alerts', href: '/inventory/alerts' },
    ]
  },
  {
    name: 'Orders',
    icon: ShoppingCartIcon,
    children: [
      { name: 'All Orders', href: '/orders' },
      { name: 'New Order', href: '/orders/create' },
    ]
  },
  {
    name: 'Products',
    icon: ClipboardDocumentListIcon,
    children: [
      { name: 'Product List', href: '/products' },
      { name: 'Categories', href: '/products/categories' },
    ]
  },
  {
    name: 'Clients',
    icon: UserGroupIcon,
    children: [
      { name: 'Client List', href: '/clients' },
      { name: 'Add Client', href: '/clients/new' },
    ]
  },
  {
    name: 'Suppliers',
    icon: BuildingStorefrontIcon,
    children: [
      { name: 'Supplier List', href: '/suppliers' },
      { name: 'Add Supplier', href: '/suppliers/new' },
    ]
  },
  {
    name: 'Purchasing',
    icon: DocumentTextIcon,
    children: [
      { name: 'Purchase Orders', href: '/purchasing' },
      { name: 'Create PO', href: '/purchasing/create' },
      { name: 'Goods Receipts', href: '/purchasing/receipts' },
    ]
  },
  {
    name: 'Deliveries',
    icon: TruckIcon,
    children: [
      { name: 'Delivery List', href: '/deliveries' },
      { name: 'Routes', href: '/deliveries/routes' },
    ]
  },
  {
    name: 'Warehouse',
    icon: BuildingOffice2Icon,
    href: '/warehouse'
  },
  {
    name: 'Reports',
    icon: ChartBarIcon,
    children: [
      { name: 'Sales Report', href: '/reports/sales' },
      { name: 'Inventory Report', href: '/reports/inventory' },
      { name: 'Delivery Report', href: '/reports/delivery' },
      { name: 'Financial Report', href: '/reports/financial' },
    ]
  },
  {
    name: 'Users',
    icon: UsersIcon,
    href: '/users'
  },
];

function NavItem({ item }) {
  const [isOpen, setIsOpen] = useState(false);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
        >
          <div className="flex items-center">
            <item.icon className="h-5 w-5 mr-3" />
            <span className="text-sm font-medium">{item.name}</span>
          </div>
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isOpen && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {child.name}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.href}
      end={item.href === '/'}
      className={({ isActive }) =>
        `flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <item.icon className="h-5 w-5 mr-3" />
      <span className="text-sm font-medium">{item.name}</span>
    </NavLink>
  );
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Start notification polling when layout mounts
  useEffect(() => {
    const cleanup = startNotificationPolling(60000); // Check every 60 seconds
    return () => {
      cleanup();
      stopNotificationPolling();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/80 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="text-white font-bold text-xl">TM</span>
            </div>
            <div className="ml-3">
              <h1 className="text-white font-semibold text-sm">Tres Marias</h1>
              <p className="text-white/50 text-xs">Distribution System</p>
            </div>
          </div>
          <button
            className="lg:hidden text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-4 flex-shrink-0">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-bold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-white text-sm font-medium">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-white/50 text-xs">{user?.role_name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/50 hover:text-red-400 p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-40 bg-slate-900/50 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <button
              className="lg:hidden text-white/70 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex-1 flex items-center justify-end space-x-3">
              {/* Search */}
              <div className="hidden md:flex items-center bg-white/10 rounded-xl px-3 py-2">
                <MagnifyingGlassIcon className="h-5 w-5 text-white/50" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="bg-transparent border-none outline-none text-white text-sm ml-2 w-40 placeholder-white/50"
                />
              </div>
              
              {/* Notifications */}
              <NotificationDropdown />
              
              {/* Settings */}
              <button className="text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors">
                <Cog6ToothIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
