import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { DataInspector } from './components/DataInspector';
import { GoogleSheetsService } from './services/googleSheets';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const handleSettingsClick = () => {
    setActiveTab('settings');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'trends':
        return (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-gray-900">Trends Analysis</h2>
            <p className="text-gray-600 mt-2">Advanced trend analysis coming soon...</p>
          </div>
        );
      case 'reports':
        return (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-gray-900">Reports</h2>
            <p className="text-gray-600 mt-2">Custom report generation coming soon...</p>
          </div>
        );
      case 'team':
        return (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-gray-900">Team Performance</h2>
            <p className="text-gray-600 mt-2">Individual technician metrics coming soon...</p>
          </div>
        );
      case 'settings':
        return <Settings />;
      case 'inspector':
        return <DataInspector />;
      default:
        return <Dashboard />;
    }
  };

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onRefresh={handleRefresh} 
          isRefreshing={isRefreshing} 
          onSettingsClick={handleSettingsClick} 
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;