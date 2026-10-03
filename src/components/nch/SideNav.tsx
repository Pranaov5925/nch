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
    { label: 'Track Complaint',    to: '/consumer/track',         icon: <Search size={16} /> },
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
        'flex flex-col h-full bg-nch-blue-800 text-white transition-all duration-200 shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className={clsx(
        'flex items-center border-b border-nch-blue-700 py-3',
        collapsed ? 'justify-center px-2' : 'justify-between px-4'
      )}>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-semibold text-nch-blue-200 uppercase tracking-wide truncate">NCH Prototype</p>
            <p className="text-xs text-nch-blue-300 truncate">{ROLE_LABELS[role]}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1 rounded hover:bg-nch-blue-700 text-nch-blue-300 hover:text-white shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-2">
        <ul role="list" className="space-y-0.5 px-2">
          {items.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => clsx(
                  'flex items-center rounded text-sm transition-colors group',
                  collapsed ? 'justify-center px-1 py-2' : 'gap-2.5 px-2.5 py-2',
                  isActive ? 'bg-nch-blue-600 text-white' : 'text-nch-blue-200 hover:bg-nch-blue-700 hover:text-white'
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
      <div className="border-t border-nch-blue-700 p-2 space-y-1">
        {!collapsed && (
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-nch-blue-300 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center rounded text-sm text-nch-blue-300 hover:bg-nch-blue-700 hover:text-white transition-colors w-full',
            collapsed ? 'justify-center px-1 py-2' : 'gap-2.5 px-2.5 py-2'
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
