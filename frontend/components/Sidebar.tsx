import React from 'react';
import { 
  Users, 
  Pill, 
  ShoppingCart, 
  RotateCcw, 
  BarChart3, 
  Package, 
  CreditCard, 
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { NavigationItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeItem: NavigationItem;
  onNavigate: (item: NavigationItem) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, onNavigate, isCollapsed, onToggleCollapse }) => {
  const { logout, username } = useAuth();

  const menuItems: { id: NavigationItem; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'OP', label: 'OP Registration', icon: <Users size={20} />, color: 'from-blue-500 to-blue-600' },
    { id: 'Pharmacy', label: 'Pharmacy', icon: <Pill size={20} />, color: 'from-primary-500 to-primary-600' },
    { id: 'View Sales', label: 'View Sales', icon: <ShoppingCart size={20} />, color: 'from-violet-500 to-violet-600' },
    { id: 'Returns', label: 'Returns', icon: <RotateCcw size={20} />, color: 'from-orange-500 to-orange-600' },
    { id: 'Reports', label: 'Reports', icon: <BarChart3 size={20} />, color: 'from-emerald-500 to-emerald-600' },
    { id: 'Inventory', label: 'Inventory', icon: <Package size={20} />, color: 'from-indigo-500 to-indigo-600' },
    { id: 'Payments', label: 'Payments', icon: <CreditCard size={20} />, color: 'from-rose-500 to-rose-600' },
  ];

  return (
    <div 
      className={`
        bg-gradient-to-b from-surface-900 via-surface-900 to-surface-950
        text-white flex flex-col h-screen fixed left-0 top-0 
        shadow-2xl shadow-surface-900/50 z-50 
        transition-all duration-300 ease-out
        ${isCollapsed ? 'w-[76px]' : 'w-72'}
      `}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600/5 via-transparent to-violet-600/5 pointer-events-none" />
      
      {/* Header */}
      <div className={`relative p-5 flex items-center border-b border-white/5 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
          <div className="relative">
            <div className="p-2.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-600/30">
              <Activity size={22} className="text-white" />
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-primary-500 rounded-xl blur-xl opacity-30 -z-10" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white to-surface-300 bg-clip-text text-transparent">
                PharmaFlow
              </h1>
              <p className="text-[10px] text-surface-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={10} className="text-primary-400" />
                IMS Pro v2.0
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="
          absolute -right-3 top-[72px] 
          bg-surface-800 hover:bg-surface-700 
          border border-surface-600/50 
          p-1.5 rounded-full shadow-xl
          transition-all duration-200 z-10
          hover:scale-110 active:scale-95
        "
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight size={14} className="text-surface-300" />
        ) : (
          <ChevronLeft size={14} className="text-surface-300" />
        )}
      </button>

      {/* Navigation */}
      <nav className="relative flex-1 py-4 px-3 space-y-1.5 overflow-y-auto dark-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`
                relative w-full flex items-center rounded-xl 
                transition-all duration-200 ease-out group
                ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'}
                ${isActive 
                  ? `bg-gradient-to-r ${item.color} text-white shadow-lg` 
                  : 'text-surface-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {/* Active indicator */}
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
              )}
              
              {/* Icon with glow on active */}
              <span className={`
                relative shrink-0 transition-transform duration-200
                ${isActive ? '' : 'group-hover:scale-110'}
              `}>
                {item.icon}
                {isActive && (
                  <div className="absolute inset-0 blur-lg opacity-50">{item.icon}</div>
                )}
              </span>
              
              {!isCollapsed && (
                <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
              )}
              
              {/* Hover glow effect */}
              {!isActive && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="relative border-t border-white/5 p-3">
        {!isCollapsed && username && (
          <div className="px-4 py-3 mb-2 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{username}</p>
                <p className="text-[10px] text-surface-400 uppercase tracking-wider">Administrator</p>
              </div>
            </div>
          </div>
        )}
        <button 
          onClick={logout}
          title={isCollapsed ? 'Logout' : undefined}
          className={`
            flex items-center w-full rounded-xl
            text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 
            transition-all duration-200 group
            ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-2.5'}
          `}
        >
          <LogOut size={20} className="shrink-0 transition-transform group-hover:-translate-x-0.5" />
          {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
