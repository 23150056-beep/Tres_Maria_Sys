import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './stores/authStore';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import Login from './pages/auth/Login';

// Dashboard
import Dashboard from './pages/Dashboard';

// Distribution Module
import DistributionPlans from './pages/distribution/DistributionPlans';
import CreateDistributionPlan from './pages/distribution/CreateDistributionPlan';
import DistributionPlanDetail from './pages/distribution/DistributionPlanDetail';

// Inventory Module
import Inventory from './pages/inventory/Inventory';
import InventoryTransactions from './pages/inventory/InventoryTransactions';
import StockAlerts from './pages/inventory/StockAlerts';

// Orders Module
import Orders from './pages/orders/Orders';
import CreateOrder from './pages/orders/CreateOrder';
import OrderDetail from './pages/orders/OrderDetail';

// Products Module
import Products from './pages/products/Products';
import ProductForm from './pages/products/ProductForm';
import Categories from './pages/products/Categories';

// Clients Module
import Clients from './pages/clients/Clients';
import ClientForm from './pages/clients/ClientForm';
import ClientDetail from './pages/clients/ClientDetail';

// Suppliers Module
import Suppliers from './pages/suppliers/Suppliers';
import SupplierForm from './pages/suppliers/SupplierForm';

// Purchase Orders Module
import PurchaseOrders from './pages/purchasing/PurchaseOrders';
import CreatePurchaseOrder from './pages/purchasing/CreatePurchaseOrder';
import GoodsReceipts from './pages/purchasing/GoodsReceipts';

// Deliveries Module
import Deliveries from './pages/deliveries/Deliveries';
import DeliveryRoutes from './pages/deliveries/DeliveryRoutes';
import DeliveryDetail from './pages/deliveries/DeliveryDetail';

// Warehouse Module
import Warehouses from './pages/warehouse/Warehouses';
import WarehouseDetail from './pages/warehouse/WarehouseDetail';

// Reports Module
import SalesReport from './pages/reports/SalesReport';
import InventoryReport from './pages/reports/InventoryReport';
import DeliveryReport from './pages/reports/DeliveryReport';
import FinancialReport from './pages/reports/FinancialReport';

// Users Module
import Users from './pages/users/Users';
import UserForm from './pages/users/UserForm';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      await checkAuth();
      setLoading(false);
    };
    verify();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#059669',
            },
          },
          error: {
            style: {
              background: '#DC2626',
            },
          },
        }}
      />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          
          {/* Distribution */}
          <Route path="distribution">
            <Route index element={<DistributionPlans />} />
            <Route path="create" element={<CreateDistributionPlan />} />
            <Route path=":id" element={<DistributionPlanDetail />} />
          </Route>

          {/* Inventory */}
          <Route path="inventory">
            <Route index element={<Inventory />} />
            <Route path="transactions" element={<InventoryTransactions />} />
            <Route path="alerts" element={<StockAlerts />} />
          </Route>

          {/* Orders */}
          <Route path="orders">
            <Route index element={<Orders />} />
            <Route path="create" element={<CreateOrder />} />
            <Route path=":id" element={<OrderDetail />} />
          </Route>

          {/* Products */}
          <Route path="products">
            <Route index element={<Products />} />
            <Route path="new" element={<ProductForm />} />
            <Route path=":id/edit" element={<ProductForm />} />
            <Route path="categories" element={<Categories />} />
          </Route>

          {/* Clients */}
          <Route path="clients">
            <Route index element={<Clients />} />
            <Route path="new" element={<ClientForm />} />
            <Route path=":id" element={<ClientDetail />} />
            <Route path=":id/edit" element={<ClientForm />} />
          </Route>

          {/* Suppliers */}
          <Route path="suppliers">
            <Route index element={<Suppliers />} />
            <Route path="new" element={<SupplierForm />} />
            <Route path=":id/edit" element={<SupplierForm />} />
          </Route>

          {/* Purchase Orders */}
          <Route path="purchasing">
            <Route index element={<PurchaseOrders />} />
            <Route path="create" element={<CreatePurchaseOrder />} />
            <Route path="receipts" element={<GoodsReceipts />} />
          </Route>

          {/* Deliveries */}
          <Route path="deliveries">
            <Route index element={<Deliveries />} />
            <Route path="routes" element={<DeliveryRoutes />} />
            <Route path=":id" element={<DeliveryDetail />} />
          </Route>

          {/* Warehouse */}
          <Route path="warehouse">
            <Route index element={<Warehouses />} />
            <Route path=":id" element={<WarehouseDetail />} />
          </Route>

          {/* Reports */}
          <Route path="reports">
            <Route path="sales" element={<SalesReport />} />
            <Route path="inventory" element={<InventoryReport />} />
            <Route path="delivery" element={<DeliveryReport />} />
            <Route path="financial" element={<FinancialReport />} />
          </Route>

          {/* Users */}
          <Route path="users">
            <Route index element={<Users />} />
            <Route path="new" element={<UserForm />} />
            <Route path=":id/edit" element={<UserForm />} />
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
