import React from 'react';
import { BarChart3, Calendar, Settings, FileText, Users, Search, Database } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigationItems = [
  { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
  { id: 'inspector', name: 'Data Inspector', icon: Search },
  { id: 'dataviewer', name: 'Database Viewer', icon: Database },
  { id: 'trends', name: 'Trends', icon: Calendar },
  { id: 'reports', name: 'Reports', icon: FileText },
  { id: 'team', name: 'Team', icon: Users },
  { id: 'settings', name: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen">
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                {item.name}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};