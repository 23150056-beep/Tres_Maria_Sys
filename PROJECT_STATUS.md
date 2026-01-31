# Tres Marias Warehouse Distribution System - Project Status

## Last Updated: February 1, 2026

---

## 📐 UI Design Principles (Knowledge Reference)

### The 7 Golden Rules of UI Design (Ben Shneiderman)

1. **Consistency** - Maintain uniform actions, terminology, and visual elements
2. **Shortcuts for Experts** - Allow experienced users to speed up interactions
3. **Informative Feedback** - Provide meaningful responses to user actions
4. **Closure in Dialogues** - Design sequences with clear beginning, middle, and end
5. **Error Prevention** - Design to prevent errors before they occur
6. **Easy Reversal of Actions** - Allow users to undo/redo actions easily
7. **Internal Locus of Control** - Support user's sense of mastery and control

**Modern Additions:** Accessibility, Clarity, Visual Hierarchy

**Goal:** Reduce cognitive load and improve user satisfaction.

---

## 🤖 AI ASSISTANT INSTRUCTIONS

> **READ THIS FIRST** when starting a new session with this project.

### Automatic Workflow - ALWAYS DO THESE:

1. **After making ANY code changes:**
   ```
   git add . ; git commit -m "Description of change" ; git push
   ```

2. **After fixing bugs or adding features:**
   - Update the "Recent Changes" section in this file
   - Update the "Last Updated" date at the top
   - Commit and push the updated PROJECT_STATUS.md

3. **When user reports an error:**
   - Check if dev server is running (`npm run dev`)
   - If not running, start it
   - Check browser console for errors
   - Fix and push to GitHub

4. **Project uses MOCK DATA (no real database):**
   - All API calls are intercepted in `src/services/api.js`
   - Data persists in memory during session only
   - No PostgreSQL needed

5. **GitHub Repository:**
   - URL: https://github.com/23150056-beep/Tres_Maria_Sys
   - Always push after changes

### Key Commands:
```bash
# Start dev server
npm run dev

# Push to GitHub
git add . ; git commit -m "message" ; git push

# Check git status
git status
```

---

## Project Overview
A full-stack Warehouse Distribution Management System for **Tres Marias Marketing**, a wholesale distribution warehouse in San Fernando City, La Union, Philippines.

## Current State: ✅ FULLY FUNCTIONAL (Mock Data Mode)

The system runs WITHOUT a real database - using an in-memory mock data layer that simulates all backend operations.

---

## Technology Stack
- **Frontend**: React 19, Vite 7.3.1, TailwindCSS 3.4.1
- **Charts**: Recharts
- **State**: Zustand
- **Forms**: React Hook Form
- **Icons**: @heroicons/react
- **Mock API**: Custom axios interceptor with in-memory store
- **PWA**: vite-plugin-pwa, workbox-window (Service Worker)
- **Deployment**: GitHub Pages

---

## 📱 PWA (Progressive Web App) - Mobile Access

### Live URL
**https://23150056-beep.github.io/Tres_Maria_Sys**

### Install on Mobile
**iOS (Safari):**
1. Open the URL in Safari
2. Tap Share button (📤)
3. Select "Add to Home Screen"

**Android (Chrome):**
1. Open the URL in Chrome
2. Tap "Install" or Menu → "Add to Home Screen"

### PWA Features
- Installable as native app
- Offline capable (cached assets)
- Mobile bottom navigation bar
- Touch-optimized interface
- iOS safe area support

---

## How to Run
```bash
cd tresmaria_system
npm install
npm run dev
```
Open: http://localhost:5173

## Demo Login Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@tresmarias.ph | admin123 |
| Manager | manager@tresmarias.ph | manager123 |
| Sales | sales@tresmarias.ph | sales123 |

---

## Modules Implemented

### 1. Dashboard
- KPIs calculated from actual order/inventory data
- Revenue charts (last 7 days)
- Top selling products
- Recent activity feed
- Stock alerts summary

### 2. Products & Categories
- Full CRUD operations
- Category management
- Product listing with filters

### 3. Clients
- Client management with pricing tiers (Regular, Wholesale, Distributor, VIP)
- Credit limits and balances
- Contact information

### 4. Suppliers
- Supplier directory
- Payment terms tracking

### 5. Orders
- Order creation with product selection
- Order status tracking (pending → confirmed → processing → delivered)
- Order details view

### 6. Inventory
- Stock levels per warehouse
- Inventory transactions log
- Stock alerts (low stock, out of stock)
- Reorder level tracking

### 7. Distribution Plans (PRIMARY FEATURE)
- Create distribution plans from pending orders
- Plan optimization
- Route planning
- Status workflow (draft → approved → executing → completed)

### 8. Deliveries
- Delivery scheduling
- Route management
- **Live Tracking Modal** with:
  - Simulated map with route visualization
  - Delivery stops with status
  - Driver contact (Call Driver button)
  - ETA tracking

### 9. Purchasing
- Purchase order creation
- Goods receipt processing
- Supplier selection

### 10. Reports (All Dynamic)
- **Sales Report**: Revenue trends, top products, top clients, sales by category
- **Inventory Report**: Stock status, value by category, low stock items
- **Delivery Report**: Success rates, driver performance
- **Financial Report**: Revenue vs expenses, profit margins, cash flow, receivables/payables

### 11. Users
- User management
- Role-based access (admin, manager, sales)

### 12. Warehouses
- Multiple warehouse support
- Warehouse details and capacity

---

## Key Files

### Mock Data System
- `src/services/api.js` - Main API with mock interceptors (700+ lines)
- `src/services/mockData.js` - Base mock data definitions

### Important Components
- `src/layouts/DashboardLayout.jsx` - Main layout with sidebar
- `src/pages/Dashboard.jsx` - Dashboard with KPIs
- `src/pages/deliveries/DeliveryRoutes.jsx` - Route planning with Live Tracking

---

## Architecture (Optimization Layer)

### Centralized Configuration (`src/config/index.js`)
- Single source of truth for all app settings
- API config, auth settings, storage config, UI settings
- Business rules and validation rules
- Feature flags for easy toggling
- Helper functions: formatCurrency, formatNumber, formatDate, getStatusColor

### Error Handling (`src/components/ErrorBoundary.jsx`)
- Graceful error catching with user-friendly recovery UI
- "Try Again" and "Go to Dashboard" buttons
- Wraps entire app in App.jsx

### Reusable UI Components (`src/components/ui/index.jsx`)
- Spinner, PageLoader, StatusBadge
- Card, CardHeader, Button, Input, Select
- EmptyState, ConfirmModal, StatCard
- Consistent styling across the app

### Data Persistence (`src/services/storage.js`)
- localStorage persistence layer with version control
- `saveMockStore()` / `loadMockStore()` for state management
- Data survives browser refresh (was #1 Known Limitation - NOW FIXED!)

### Utility Helpers (`src/utils/helpers.js`)
- debounce, throttle, deepClone, generateId
- formatters, validators, date utilities
- DRY principle - common functions in one place

---

## Recent Changes (Session History)

### Session: February 1, 2026 - PWA Implementation

1. **PWA Plugin Setup** - Installed `vite-plugin-pwa` and `workbox-window`
2. **Web App Manifest** - Configured in vite.config.js with app name, colors, icons
3. **Service Worker** - Workbox with NetworkFirst caching for API calls
4. **PWA Icons Generated** - Created using pwa-asset-generator:
   - `public/favicon.svg` - SVG favicon with TM logo
   - `public/favicon-196.png` - Browser favicon
   - `public/apple-icon-180.png` - iOS home screen icon
   - `public/manifest-icon-192.maskable.png` - Android icon (192x192)
   - `public/manifest-icon-512.maskable.png` - Android icon (512x512)
5. **Mobile Bottom Navigation** - Created `src/components/MobileBottomNav.jsx`:
   - Home, Orders, Inventory, Deliveries quick access
   - Menu button to open sidebar
   - Only visible on mobile (< 1024px)
6. **Mobile CSS Optimizations** - Updated `src/index.css`:
   - iOS safe area support (notch handling)
   - Touch-friendly tap targets (44px minimum)
   - Pull-to-refresh prevention
   - Hidden scrollbars on mobile
   - PWA standalone mode styles
7. **GitHub Pages Deployment** - Configured `gh-pages` for hosting:
   - Added `base` path in vite.config.js
   - Added `homepage` and `deploy` script in package.json
   - Live at: https://23150056-beep.github.io/Tres_Maria_Sys

### Session: System Optimization

1. **Centralized Config** - Created `src/config/index.js` with all app settings, formatters, and feature flags
2. **Error Boundary** - Added `src/components/ErrorBoundary.jsx` for graceful error recovery
3. **Reusable UI Components** - Created `src/components/ui/index.jsx` with 11 reusable components
4. **Data Persistence** - Implemented localStorage persistence in `src/services/storage.js`
5. **API Persistence** - Modified `src/services/api.js` to auto-save to localStorage after mutations
6. **Utility Helpers** - Created `src/utils/helpers.js` with common utility functions
7. **App Wrapper** - Modified `src/App.jsx` to wrap with ErrorBoundary

### Session: January 31, 2026

1. **Fixed Tailwind CSS** - Added proper directives to index.css
2. **Created Mock Data System** - Full API interception without PostgreSQL
3. **Fixed Distribution Plans** - Added persistence with mockStore
4. **Fixed Form Components** - Updated response handling for ClientForm, ProductForm, SupplierForm, OrderDetail, ClientDetail
5. **Fixed Stock Alerts** - Corrected data structure for alerts page
6. **Fixed Sidebar Scrolling** - Added flex layout for proper overflow
7. **Implemented Live Tracking** - Added tracking modal with map, stops, driver contact
8. **Made Analytics Dynamic** - All reports now calculate from actual mockStore data
9. **Fixed Financial Report** - Added missing data fields (revenueBySource, expensesByCategory, cashFlow, recentTransactions)

---

## GitHub Repository
**URL**: https://github.com/23150056-beep/Tres_Maria_Sys

---

## Known Limitations (Mock Mode)
1. ~~Data resets when browser refreshes~~ **FIXED!** - Now persists to localStorage
2. No real authentication (token is simulated)
3. Export buttons download mock CSV files
4. Live tracking is simulated (not real GPS)

---

## To Continue Development

When starting a new chat, you can tell the AI:
> "I'm working on the Tres Marias Warehouse System. Please read PROJECT_STATUS.md for context on what's been implemented."

Or copy relevant sections from this file into your prompt.

---

## Pending/Future Improvements
- [ ] Add real PostgreSQL backend connection
- [ ] Implement real authentication with JWT
- [x] ~~Add data persistence (localStorage or IndexedDB)~~ **COMPLETED!**
- [ ] Real GPS integration for live tracking
- [ ] Print functionality for reports
- [x] ~~Mobile responsive improvements~~ **COMPLETED! (PWA with mobile nav)**
- [ ] Email notifications
- [ ] Migrate pages to use reusable UI components from `src/components/ui/index.jsx`
- [ ] Use centralized config formatters throughout the app
- [ ] Add splash screen for PWA loading
- [ ] Implement push notifications
