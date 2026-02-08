import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ShoppingCartIcon,
  CubeIcon,
  TruckIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ShoppingCartIcon as ShoppingCartIconSolid,
  CubeIcon as CubeIconSolid,
  TruckIcon as TruckIconSolid,
} from '@heroicons/react/24/solid';

const navItems = [
  { name: 'Home', href: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
  { name: 'Orders', href: '/orders', icon: ShoppingCartIcon, activeIcon: ShoppingCartIconSolid },
  { name: 'Inventory', href: '/inventory', icon: CubeIcon, activeIcon: CubeIconSolid },
  { name: 'Deliveries', href: '/deliveries', icon: TruckIcon, activeIcon: TruckIconSolid },
];

export default function MobileBottomNav({ onMenuClick }) {
  const location = useLocation();

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = active ? item.activeIcon : item.icon;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors duration-150 ${
                active 
                  ? 'text-primary-600' 
                  : 'text-slate-400 active:text-slate-600'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-[11px] mt-0.5 ${active ? 'font-semibold' : 'font-medium'}`}>{item.name}</span>
              {active && (
                <div className="absolute bottom-0 w-10 h-0.5 bg-primary-600 rounded-full" />
              )}
            </NavLink>
          );
        })}
        
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-400 active:text-slate-600 transition-colors"
        >
          <Bars3Icon className="h-5 w-5" />
          <span className="text-[11px] mt-0.5 font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
