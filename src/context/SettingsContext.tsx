import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getSettings, type AppSettings } from '../services/settingsService';
import { BUSINESS_RULES } from '../config/rules';

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(BUSINESS_RULES as AppSettings);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    setLoading(true);
    const data = await getSettings();
    setSettings(data);
    setLoading(false);
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook para usar las reglas
// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings debe usarse dentro de SettingsProvider');
  }
  return context;
};