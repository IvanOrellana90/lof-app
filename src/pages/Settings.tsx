import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { saveSettings, type AppSettings } from '../services/settingsService';
import { toast } from 'sonner';
import { Save, DollarSign, Baby } from 'lucide-react';
import { strings } from '../locales/es';

const Settings = () => {
  const { settings, refreshSettings } = useSettings();
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar formulario cuando carguen las reglas
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (section: keyof AppSettings, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: parseInt(value) || 0
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveSettings(formData);
    
    if (result.success) {
      toast.success("Configuración actualizada", {
        description: "Los nuevos precios ya están activos."
      });
      await refreshSettings(); // Actualizar toda la app
    } else {
      toast.error("Error al guardar");
    }
    setIsSaving(false);
  };

  return (
    <div className="px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{strings.nav.settings}</h1>
          <p className="text-slate-600">Configura los precios y reglas del Lof.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8">
          
          {/* SECCIÓN PRECIOS */}
          <div>
            <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-4 pb-2 border-b border-slate-100">
              <DollarSign className="text-lof-600" size={20} /> Precios por Día
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adultos ($)</label>
                <input 
                  type="number" 
                  value={formData.prices.adultPerDay}
                  onChange={(e) => handleChange('prices', 'adultPerDay', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Niños ($)</label>
                <input 
                  type="number" 
                  value={formData.prices.childPerDay}
                  onChange={(e) => handleChange('prices', 'childPerDay', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN REGLAS */}
          <div>
            <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-4 pb-2 border-b border-slate-100">
              <Baby className="text-orange-500" size={20} /> Reglas y Límites
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Edad límite niño gratis (Años)</label>
                <input 
                  type="number" 
                  value={formData.limits.childMaxAge}
                  onChange={(e) => handleChange('limits', 'childMaxAge', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">Menores de esta edad pagan $0 (o el precio de niño).</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-lof-600 hover:bg-lof-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-lof-500/20"
          >
            <Save size={20} />
            {isSaving ? "Guardando..." : "Guardar Configuración"}
          </button>

        </div>
      </div>
    </div>
  );
};

export default Settings;