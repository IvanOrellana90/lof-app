import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom'; // <--- Necesitamos esto
import { getSettings, type AppSettings } from '../services/settingsService';
import { BUSINESS_RULES } from '../config/rules';

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { propertyId } = useParams(); // <--- Capturamos el ID de la URL
  const [settings, setSettings] = useState<AppSettings>(BUSINESS_RULES as AppSettings);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    if (!propertyId) return; // Si no hay ID, no hacemos nada
    
    setLoading(true);
    const data = await getSettings(propertyId);
    setSettings(data);
    setLoading(false);
  };

  // Cada vez que cambiamos de propiedad, recargamos las reglas
  useEffect(() => {
    refreshSettings();
  }, [propertyId]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings debe usarse dentro de SettingsProvider');
  }
  return context;
};