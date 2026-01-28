import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import Navigation from './components/Navigation';
import CriticalMessageBar from './components/CriticalMessageBar';
import NotificationBell from './components/NotificationBell';
import Dashboard from './components/Dashboard/Dashboard';
import EventManagement from './components/EventManagement/EventManagement';
import ImpactAnalysis from './components/ImpactAnalysis';
import AssetManagement from './components/AssetManagement';
import Reports from './components/Reports';
import ReportingPreview from './components/ReportingPreview';
import Notifications from './components/Notifications';
import TemplateManagement from './components/Notifications/TemplateManagement';
import PQServices from './components/PQServices';
import SystemHealth from './components/SystemHealth';
import CustomerTransformerMatching from './components/CustomerTransformerMatching';
import UserManagement from './components/UserManagement';
import SCADA from './components/SCADA';
import MeterHierarchy from './components/MeterHierarchy';
import WeightingFactors from './pages/DataMaintenance/WeightingFactors';
import PQBenchmarking from './pages/DataMaintenance/PQBenchmarking';
import SystemParameters from './pages/SystemParameters';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedMeterId, setSelectedMeterId] = useState<string | null>(null);

  // Handle navigation to Asset Management with selected meter
  const handleNavigateToMeter = (meterId: string) => {
    setSelectedMeterId(meterId);
    setCurrentView('assets');
  };

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
      <Navigation 
        currentView={currentView} 
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-y-auto">
        {/* Header Bar with Notification Bell */}
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end shadow-sm">
          <NotificationBell />
        </div>
        
        <CriticalMessageBar />
        {currentView === 'dashboard' && <Dashboard onNavigateToMeter={handleNavigateToMeter} />}
        {currentView === 'events' && <EventManagement />}
        {currentView === 'analytics' && <ImpactAnalysis />}
        {currentView === 'assets' && <AssetManagement selectedMeterId={selectedMeterId} onClearSelectedMeter={() => setSelectedMeterId(null)} />}
        {currentView === 'reports' && <Reports />}
        {currentView === 'reportingPreview' && <ReportingPreview />}
        {currentView === 'notifications' && <Notifications />}
        {currentView === 'templates' && <TemplateManagement />}
        {currentView === 'services' && <PQServices />}
        {currentView === 'health' && <SystemHealth />}
        {currentView === 'userManagement' && <UserManagement />}
        {currentView === 'scada' && <SCADA />}
        {currentView === 'meterHierarchy' && <MeterHierarchy />}
        {currentView === 'customerTransformerMatching' && <CustomerTransformerMatching />}
        {currentView === 'weightingFactors' && <WeightingFactors />}
        {currentView === 'pqBenchmarking' && <PQBenchmarking />}
        {currentView === 'systemParameters' && <SystemParameters />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            borderRadius: '0.75rem',
            padding: '1rem',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  );
}
