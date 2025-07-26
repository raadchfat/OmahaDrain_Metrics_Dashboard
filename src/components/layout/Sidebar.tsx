import React from 'react';
import { BarChart3, Calendar, Settings, FileText, Users, Search, Database } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigationItems = [
  { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
  { id: 'trends', name: 'Trends', icon: Calendar },
  { id: 'reports', name: 'Reports', icon: FileText },
  { id: 'team', name: 'Team', icon: Users },
  { 
    id: 'settings', 
    name: 'Settings', 
    icon: Settings,
    subItems: [
      { id: 'inspector', name: 'Data Inspector', icon: Search },
      { id: 'dataviewer', name: 'Database Viewer', icon: Database },
    ]
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['settings']);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen">
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeTab));
            const isExpanded = expandedItems.includes(item.id);
            const Icon = item.icon;
            
            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.subItems) {
                      toggleExpanded(item.id);
                      if (!isExpanded) {
                        onTabChange(item.id);
                      }
                    } else {
                      onTabChange(item.id);
                    }
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  {item.name}
                  {item.subItems && (
                    <svg
                      className={`ml-auto h-4 w-4 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
                
                {item.subItems && isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.subItems.map((subItem) => {
                      const isSubActive = activeTab === subItem.id;
                      const SubIcon = subItem.icon;
                      
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => onTabChange(subItem.id)}
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            isSubActive
                              ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-500'
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          <SubIcon className={`mr-3 h-4 w-4 ${isSubActive ? 'text-blue-500' : 'text-gray-400'}`} />
                          {subItem.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};