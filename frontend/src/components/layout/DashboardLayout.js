import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Building2, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  Sparkles,
  ClipboardList,
  BarChart3,
  Shield,
  Upload
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const DashboardLayout = ({ children }) => {
  const { user, logout, isSatyaAdmin, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const mainNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['all'] },
    { path: '/authorizations', icon: FileText, label: 'Autorizações', roles: ['all'] },
    { path: '/recommendations', icon: Sparkles, label: 'Recomendações', roles: ['all'] },
    { path: '/providers', icon: Building2, label: 'Prestadores', roles: ['all'] },
    { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['all'] },
  ];

  const adminNavItems = [
    { path: '/users', icon: Users, label: 'Usuários', roles: ['satya_admin', 'operator_admin'] },
    { path: '/import', icon: Upload, label: 'Importar Dados', roles: ['satya_admin', 'operator_admin'] },
    { path: '/audit', icon: Shield, label: 'Auditoria', roles: ['satya_admin', 'operator_admin'] },
    { path: '/settings', icon: Settings, label: 'Configurações', roles: ['satya_admin', 'operator_admin'] },
  ];

  const satyaNavItems = [
    { path: '/tenants', icon: ClipboardList, label: 'Operadoras', roles: ['satya_admin'] },
  ];

  const filterByRole = (items) => {
    return items.filter(item => {
      if (item.roles.includes('all')) return true;
      if (item.roles.includes('satya_admin') && isSatyaAdmin) return true;
      if (item.roles.includes('operator_admin') && isAdmin) return true;
      return false;
    });
  };

  const NavLink = ({ item }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        className={`sidebar-link flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive 
            ? 'bg-cyan-50 text-cyan-700 border-r-2 border-cyan-600' 
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
        onClick={() => setSidebarOpen(false)}
      >
        <item.icon className="w-5 h-5" strokeWidth={1.5} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="dashboard-layout">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Satya
            </span>
          </Link>
          <button 
            className="lg:hidden p-1 hover:bg-slate-100 rounded"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6 overflow-y-auto h-[calc(100%-4rem)]">
          {/* Main Nav */}
          <div className="space-y-1">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Principal
            </p>
            {filterByRole(mainNavItems).map(item => (
              <NavLink key={item.path} item={item} />
            ))}
          </div>

          {/* Admin Nav */}
          {isAdmin && (
            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Administração
              </p>
              {filterByRole(adminNavItems).map(item => (
                <NavLink key={item.path} item={item} />
              ))}
            </div>
          )}

          {/* Satya Admin Nav */}
          {isSatyaAdmin && (
            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Satya Admin
              </p>
              {filterByRole(satyaNavItems).map(item => (
                <NavLink key={item.path} item={item} />
              ))}
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-30">
          <div className="h-full px-4 lg:px-8 flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
                onClick={() => setSidebarOpen(true)}
                data-testid="mobile-menu-btn"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              
              <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar..."
                  className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-slate-100 rounded-lg relative" data-testid="notifications-btn">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg" data-testid="user-menu-btn">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-cyan-100 text-cyan-700 text-sm font-medium">
                        {user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-sm font-medium text-slate-700">
                      {user?.name || 'Usuário'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-rose-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
