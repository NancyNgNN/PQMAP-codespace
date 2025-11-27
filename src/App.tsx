import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard/Dashboard';
import EventManagement from './components/EventManagement/EventManagement';
import DataAnalytics from './components/DataAnalytics';
import AssetManagement from './components/AssetManagement';
import Reports from './components/Reports';
import Notifications from './components/Notifications';
import PQServices from './components/PQServices';
import SystemHealth from './components/SystemHealth';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-y-auto">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'events' && <EventManagement />}
        {currentView === 'analytics' && <DataAnalytics />}
        {currentView === 'assets' && <AssetManagement />}
        {currentView === 'reports' && <Reports />}
        {currentView === 'notifications' && <Notifications />}
        {currentView === 'services' && <PQServices />}
        {currentView === 'health' && <SystemHealth />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
