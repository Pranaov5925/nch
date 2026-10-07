'use client';

// NCH 3.0 — SideNav (ported; real auth + hash-router links)

import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, FileText, FilePlus, Search, Upload, Bell,
  User, ClipboardList, AlertTriangle, BarChart2, Building2,
  ChevronLeft, ChevronRight, LogOut, RefreshCw, FileCheck
} from 'lucide-react';
import type { UserRole } from '@/lib/nch/types';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  consumer: [
    { label: 'Dashboard',          to: '/consumer/dashboard',     icon: <LayoutDashboard size={16} /> },
    { label: 'My Complaints',      to: '/consumer/complaints',    icon: <FileText size={16} /> },
    { label: 'Register Complaint', to: '/consumer/register',      icon: <FilePlus size={16} /> },
    { label: 'Documents',          to: '/consumer/documents',     icon: <Upload size={16} /> },
    { label: 'Notifications',      to: '/consumer/notifications', icon: <Bell size={16} /> },
    { label: 'My Profile',         to: '/consumer/profile',       icon: <User size={16} /> },
  ],
  officer: [
    { label: 'Dashboard',       to: '/officer/dashboard',   icon: <LayoutDashboard size={16} /> },
    { label: 'Complaint Queue', to: '/officer/queue',       icon: <ClipboardList size={16} /> },
    { label: 'Escalations',     to: '/officer/escalations', icon: <AlertTriangle size={16} /> },
    { label: 'Follow-ups',      to: '/officer/followups',   icon: <RefreshCw size={16} /> },
    { label: 'Analytics',       to: '/officer/analytics',   icon: <BarChart2 size={16} /> },
    { label: 'My Profile',      to: '/officer/profile',     icon: <User size={16} /> },
  ],
  supervisor: [
    { label: 'Dashboard',      to: '/supervisor/dashboard',   icon: <LayoutDashboard size={16} /> },
    { label: 'Complaints',     to: '/supervisor/complaints',  icon: <FileText size={16} /> },
    { label: 'Escalations',    to: '/supervisor/escalations', icon: <AlertTriangle size={16} /> },
    { label: 'Analytics',      to: '/supervisor/analytics',   icon: <BarChart2 size={16} /> },
    { label: 'Organizations',  to: '/supervisor/companies',   icon: <Building2 size={16} /> },
    { label: 'Reports',        to: '/supervisor/reports',     icon: <FileCheck size={16} /> },
    { label: 'My Profile',     to: '/supervisor/profile',     icon: <User size={16} /> },
  ],
  company: [
    { label: 'Dashboard',           to: '/company/dashboard',  icon: <LayoutDashboard size={16} /> },
    { label: 'Received Complaints', to: '/company/complaints', icon: <FileText size={16} /> },
    { label: 'Responses',           to: '/company/responses',  icon: <FileCheck size={16} /> },
    { label: 'History',             to: '/company/history',    icon: <ClipboardList size={16} /> },
    { label: 'My Profile',          to: '/company/profile',    icon: <User size={16} /> },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  consumer: 'Consumer Portal',
  officer: 'Officer Workspace',
  supervisor: 'Supervisor Admin',
  company: 'Company Portal',
};

export function SideNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const role = user.role;
  const items = NAV_ITEMS[role];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav
      className={clsx(
        'flex flex-col h-full bg-nch-blue-800 text-white transition-all duration-200 shrink-0 z-20',
        collapsed ? 'w-16' : 'w-64'
      )}
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className={clsx(
        'h-16 flex items-center border-b border-nch-blue-700/80 shrink-0 transition-all',
        collapsed ? 'justify-center px-2' : 'justify-between px-5'
      )}>
        {!collapsed && (
          <div className="min-w-0 pr-2">
            <p className="text-xs font-bold text-nch-blue-200 uppercase tracking-wider truncate">NCH Prototype</p>
            <p className="text-xs text-nch-blue-300 font-medium truncate mt-0.5">{ROLE_LABELS[role]}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1.5 rounded-lg hover:bg-nch-blue-700 text-nch-blue-300 hover:text-white transition-colors shrink-0 cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-3">
        <ul role="list" className={clsx('space-y-1', collapsed ? 'px-2' : 'px-3')}>
          {items.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => clsx(
                  'flex items-center rounded-lg text-sm font-medium transition-all duration-150 group',
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5',
                  isActive ? 'bg-nch-blue-600 text-white shadow-xs' : 'text-nch-blue-200 hover:bg-nch-blue-700/70 hover:text-white'
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* User + Logout */}
      <div className="border-t border-nch-blue-700/80 p-3 space-y-2 shrink-0">
        {!collapsed && (
          <div className="px-3 py-2 rounded-lg bg-nch-blue-900/40 border border-nch-blue-700/40">
            <p className="text-xs font-semibold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-nch-blue-300 truncate mt-0.5">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center rounded-lg text-sm font-medium text-nch-blue-300 hover:bg-nch-blue-700 hover:text-white transition-colors w-full cursor-pointer',
            collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5'
          )}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </nav>
  );
}
