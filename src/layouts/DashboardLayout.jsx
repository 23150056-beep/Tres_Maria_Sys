import { useState, useEffect, useMemo } from 'react';
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
  MagnifyingGlassIcon,
  MapPinIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import useAuthStore from '../stores/authStore';
import NotificationDropdown from '../components/NotificationDropdown';
import MobileBottomNav from '../components/MobileBottomNav';
import { startNotificationPolling, stopNotificationPolling } from '../services/notificationService';
import socketService from '../services/socketService';

// Full navigation structure with role-based access
const fullNavigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: HomeIcon,
    roles: ['Admin', 'Manager', 'Sales', 'Warehouse Staff', 'Driver']
  },
  {
    name: 'Order Visibility',
    icon: EyeIcon,
    roles: ['Admin', 'Manager', 'Sales'],
    children: [
      { name: 'Order Dashboard', href: '/orders/dashboard' },
      { name: 'All Orders', href: '/orders' },
      { name: 'Pending Orders', href: '/orders?status=pending' },
      { name: 'New Order', href: '/orders/create' },
    ]
  },
  {
    name: 'Delivery Tracking',
    icon: MapPinIcon,
    roles: ['Admin', 'Manager', 'Sales'],
    children: [
      { name: 'Live Tracking', href: '/deliveries/tracking' },
      { name: 'All Deliveries', href: '/deliveries' },
      { name: 'Routes', href: '/deliveries/routes' },
    ]
  },
  {
    name: 'Distribution',
    icon: TruckIcon,
    roles: ['Admin', 'Manager', 'Warehouse Staff'],
    children: [
      { name: 'Distribution Plans', href: '/distribution' },
      { name: 'Create Plan', href: '/distribution/create' },
    ]
  },
  {
    name: 'Inventory',
    icon: CubeIcon,
    roles: ['Admin', 'Manager', 'Warehouse Staff'],
    children: [
      { name: 'Stock Overview', href: '/inventory' },
      { name: 'Transactions', href: '/inventory/transactions' },
      { name: 'Stock Alerts', href: '/inventory/alerts' },
    ]
  },
  {
    name: 'Orders',
    icon: ShoppingCartIcon,
    roles: ['Admin', 'Manager', 'Sales'],
    children: [
      { name: 'All Orders', href: '/orders' },
      { name: 'New Order', href: '/orders/create' },
    ]
  },
  {
    name: 'Products',
    icon: ClipboardDocumentListIcon,
    roles: ['Admin', 'Manager', 'Sales', 'Warehouse Staff'],
    children: [
      { name: 'Product List', href: '/products' },
      { name: 'Categories', href: '/products/categories' },
    ]
  },
  {
    name: 'Clients',
    icon: UserGroupIcon,
    roles: ['Admin', 'Manager', 'Sales'],
    children: [
      { name: 'Client List', href: '/clients' },
      { name: 'Add Client', href: '/clients/new' },
    ]
  },
  {
    name: 'Suppliers',
    icon: BuildingStorefrontIcon,
    roles: ['Admin', 'Manager'],
    children: [
      { name: 'Supplier List', href: '/suppliers' },
      { name: 'Add Supplier', href: '/suppliers/new' },
    ]
  },
  {
    name: 'Purchasing',
    icon: DocumentTextIcon,
    roles: ['Admin', 'Manager'],
    children: [
      { name: 'Purchase Orders', href: '/purchasing' },
      { name: 'Create PO', href: '/purchasing/create' },
      { name: 'Goods Receipts', href: '/purchasing/receipts' },
    ]
  },
  {
    name: 'Deliveries',
    icon: TruckIcon,
    roles: ['Admin', 'Manager', 'Warehouse Staff'],
    children: [
      { name: 'Delivery List', href: '/deliveries' },
      { name: 'Routes', href: '/deliveries/routes' },
    ]
  },
  {
    name: 'Warehouse',
    icon: BuildingOffice2Icon,
    roles: ['Admin', 'Manager', 'Warehouse Staff'],
    href: '/warehouse'
  },
  {
    name: 'Reports',
    icon: ChartBarIcon,
    roles: ['Admin', 'Manager'],
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
    roles: ['Admin'],
    href: '/users'
  },
];

// Normalize role name for comparison
function normalizeRole(role) {
  if (!role) return 'Staff';
  const roleMap = {
    'admin': 'Admin',
    'manager': 'Manager',
    'sales': 'Sales',
    'warehouse_staff': 'Warehouse Staff',
    'driver': 'Driver'
  };
  return roleMap[role.toLowerCase()] || role;
}

// Filter navigation based on user role
function getFilteredNavigation(userRole) {
  const normalizedRole = normalizeRole(userRole);
  return fullNavigation.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(normalizedRole);
  });
}

function NavItem({ item }) {
  const [isOpen, setIsOpen] = useState(false);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors duration-150"
        >
          <div className="flex items-center">
            <item.icon className="h-5 w-5 mr-3 text-slate-400" />
            <span className="text-sm font-medium">{item.name}</span>
          </div>
          <ChevronDownIcon
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isOpen && (
          <div className="ml-8 mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href}
                className={({ isActive }) =>
                  `block px-3 py-1.5 text-sm rounded-md transition-colors duration-150 ${
                    isActive
                      ? 'text-primary-700 bg-primary-50 font-medium'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
        `flex items-center px-3 py-2 rounded-lg transition-colors duration-150 ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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

  // Filter navigation based on user role
  const navigation = useMemo(() => {
    const userRole = user?.role_name || user?.role || 'Staff';
    return getFilteredNavigation(userRole);
  }, [user?.role_name, user?.role]);

  // Start notification polling and socket connection when layout mounts
  useEffect(() => {
    const cleanup = startNotificationPolling(60000);
    
    if (user?.id) {
      socketService.connect(user.id);
    }
    
    return () => {
      cleanup();
      stopNotificationPolling();
      socketService.disconnect();
    };
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-slate-200 shadow-sidebar transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center">
            <div className="h-9 w-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base">TM</span>
            </div>
            <div className="ml-3">
              <h1 className="text-slate-900 font-semibold text-sm leading-tight">Tres Marias</h1>
              <p className="text-slate-400 text-[11px] leading-tight">Distribution & Delivery Ops</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto min-h-0">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-200 p-3 flex-shrink-0">
          <div className="flex items-center">
            <div className="h-9 w-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 text-sm font-semibold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-slate-900 text-sm font-medium truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-slate-400 text-xs truncate">{user?.role_name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-slate-100 transition-colors flex-shrink-0"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[260px]">
        {/* Top header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden text-slate-500 hover:text-slate-700 transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              
              {/* Search */}
              <div className="hidden md:flex items-center bg-slate-100 rounded-lg px-3 py-2">
                <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="bg-transparent border-none outline-none text-slate-700 text-sm ml-2 w-48 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Notifications */}
              <NotificationDropdown />
              
              {/* Settings */}
              <button className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
}
