import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { saveSettings, type AppSettings } from '../services/settingsService';
import { toast } from 'sonner';
import { Save, DollarSign, Baby, CreditCard } from 'lucide-react';
import { strings } from '../locales/es';

const Settings = () => {
  const { propertyId } = useParams();
  const { settings, refreshSettings } = useSettings();
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
       ...settings,
       bankDetails: settings.bankDetails || {
         // Aseguramos que accountType exista si viene vacío
         accountName: "", rut: "", bankName: "", accountType: "", accountNumber: "", email: ""
       }
    });
  }, [settings]);

  const handleNumberChange = (section: keyof AppSettings, field: string, value: string) => {
    // @ts-ignore
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as any],
        [field]: parseInt(value) || 0
      }
    }));
  };

  const handleTextChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!propertyId) return;
    setIsSaving(true);
    const result = await saveSettings(propertyId, formData);
    
    if (result.success) {
      toast.success("Configuración actualizada");
      await refreshSettings();
    } else {
      toast.error("Error al guardar");
    }
    setIsSaving(false);
  };

  return (
    <div className="px-4 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{strings.nav.settings}</h1>
          <p className="text-slate-600">Configura los precios y reglas del Lof.</p>
        </div>

        {/* CARD 1: DATOS BANCARIOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-6 pb-2 border-b border-slate-100">
            <CreditCard className="text-blue-600" size={20} /> Datos Bancarios
          </h3>
          <div className="space-y-4">
            
            {/* Nombre Titular */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Titular</label>
              <input 
                type="text" 
                value={formData.bankDetails?.accountName || ''}
                onChange={(e) => handleTextChange('accountName', e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
              />
            </div>

            {/* RUT y Banco */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RUT</label>
                <input 
                  type="text" 
                  value={formData.bankDetails?.rut || ''}
                  onChange={(e) => handleTextChange('rut', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Banco</label>
                  <input 
                  type="text" 
                  value={formData.bankDetails?.bankName || ''}
                  onChange={(e) => handleTextChange('bankName', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                  placeholder="Ej: Banco de Chile"
                />
              </div>
            </div>

            {/* Tipo de Cuenta (NUEVO INPUT) y Número */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cuenta</label>
                  <input 
                    type="text" 
                    value={formData.bankDetails?.accountType || ''}
                    onChange={(e) => handleTextChange('accountType', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                    placeholder="Ej: Cta Corriente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de Cuenta</label>
                  <input 
                    type="text" 
                    value={formData.bankDetails?.accountNumber || ''}
                    onChange={(e) => handleTextChange('accountNumber', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                  />
                </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo para notificaciones</label>
              <input 
                type="email" 
                value={formData.bankDetails?.email || ''}
                onChange={(e) => handleTextChange('email', e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* CARD 2: PRECIOS Y REGLAS (Igual que antes) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8">
          
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
                  onChange={(e) => handleNumberChange('prices', 'adultPerDay', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Niños ($)</label>
                <input 
                  type="number" 
                  value={formData.prices.childPerDay}
                  onChange={(e) => handleNumberChange('prices', 'childPerDay', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                />
              </div>
            </div>
          </div>

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
                  onChange={(e) => handleNumberChange('limits', 'childMaxAge', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                />
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