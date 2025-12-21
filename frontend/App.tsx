import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';
import { ToastProvider } from './hooks/useToast';
import Sidebar from './components/Sidebar';
import { NavigationItem } from './types';
import OP from './pages/OP';
import Pharmacy from './pages/Pharmacy';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import ViewSales from './pages/ViewSales';
import Returns from './pages/Returns';
import Payments from './pages/Payments';
import Login from './pages/Login';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainApp />
                </ProtectedRoute>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const MainApp: React.FC = () => {
  const [activeItem, setActiveItem] = useState<NavigationItem>('OP');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeItem) {
      case 'OP':
        return <OP />;
      case 'Pharmacy':
        return <Pharmacy />;
      case 'Inventory':
        return <Inventory />;
      case 'Reports':
        return <Reports />;
      case 'View Sales':
        return <ViewSales />;
      case 'Returns':
        return <Returns />;
      case 'Payments':
        return <Payments />;
      default:
        return <OP />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-surface-100 via-surface-50 to-surface-100">
      <Sidebar 
        activeItem={activeItem} 
        onNavigate={setActiveItem}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <main 
        className={`
          flex-1 p-6 lg:p-8 
          transition-all duration-300 ease-out
          ${isSidebarCollapsed ? 'ml-[76px]' : 'ml-72'}
        `}
      >
        <div className="max-w-7xl mx-auto animate-fade-in">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
