import React, { createContext, useContext, useState } from 'react';

type ViewType = 'home' | 'customer' | 'merchant' | 'merchantDashboard' | 'admin' | 'customerProfileEdit' | 'customerProfile' | null;

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  currentView: 'home',
  setCurrentView: () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('home');

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        currentView,
        setCurrentView,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};