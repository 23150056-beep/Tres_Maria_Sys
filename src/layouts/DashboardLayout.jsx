import { useState } from 'react';
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
  BanknotesIcon
} from '@heroicons/react/24/outline';
import useAuthStore from '../stores/authStore';

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
          className="w-full flex items-center justify-between px-4 py-2.5 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
        >
          <div className="flex items-center">
            <item.icon className="h-5 w-5 mr-3" />
            <span className="text-sm font-medium">{item.name}</span>
          </div>
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isOpen && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
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
        `flex items-center px-4 py-2.5 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 bg-gray-800 flex-shrink-0">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">TM</span>
            </div>
            <div className="ml-3">
              <h1 className="text-white font-semibold text-sm">Tres Marias</h1>
              <p className="text-gray-400 text-xs">Distribution System</p>
            </div>
          </div>
          <button
            className="lg:hidden text-gray-400 hover:text-white"
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
        <div className="border-t border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-white text-sm font-medium">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-gray-400 text-xs">{user?.role_name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white p-2"
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
        <header className="sticky top-0 z-40 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <button
              className="lg:hidden text-gray-600 hover:text-gray-900"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex-1 flex items-center justify-end space-x-4">
              {/* Quick actions */}
              <button className="text-gray-500 hover:text-gray-700">
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
