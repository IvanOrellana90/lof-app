import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { saveSettings, type AppSettings } from '../services/settingsService';
// Importamos las funciones de propiedad
import { getPropertyById, updateAllowedEmails } from '../services/propertyService';
import { toast } from 'sonner';
import { Save, DollarSign, Baby, CreditCard, Users, Plus, Trash2, Mail, Receipt } from 'lucide-react'; // Nuevos iconos
import { useLanguage } from '../context/LanguageContext';

const Settings = () => {
  const { propertyId } = useParams();
  const { settings, refreshSettings } = useSettings();
  const { strings, language, setLanguage } = useLanguage();

  // Estado para la configuración normal
  const [formData, setFormData] = useState<AppSettings>(settings);

  // Estado para los correos (Miembros)
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // 1. Cargar Settings y Correos al inicio
  useEffect(() => {
    // A. Cargar Settings del contexto
    setFormData({
      ...settings,
      fixedCosts: settings.fixedCosts || [],  // Asegurar que existe el array
      bankDetails: settings.bankDetails || {
        accountName: "", rut: "", bankName: "", accountType: "", accountNumber: "", email: ""
      }
    });

    // B. Cargar Correos de la Propiedad (Esto viene del documento raíz, no de settings)
    const loadEmails = async () => {
      if (propertyId) {
        const prop = await getPropertyById(propertyId);
        if (prop && prop.allowedEmails) {
          setAllowedEmails(prop.allowedEmails);
        }
      }
    };
    loadEmails();
  }, [settings, propertyId]);

  // Manejadores existentes...
  const handleNumberChange = <
    S extends keyof AppSettings,
    F extends keyof AppSettings[S]
  >(
    section: S,
    field: F,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: Number(value) || 0,
      },
    }));
  };

  const handleTextChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, [field]: value }
    }));
  };

  // --- MANEJADORES DE COSTOS FIJOS ---
  const addFixedCost = () => {
    const newCost = {
      id: `fc-${Date.now()}`,
      name: "",
      value: 0
    };
    setFormData(prev => ({
      ...prev,
      fixedCosts: [...prev.fixedCosts, newCost]
    }));
  };

  const removeFixedCost = (id: string) => {
    setFormData(prev => ({
      ...prev,
      fixedCosts: prev.fixedCosts.filter(cost => cost.id !== id)
    }));
  };

  const handleFixedCostChange = (id: string, field: 'name' | 'value', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      fixedCosts: prev.fixedCosts.map(cost =>
        cost.id === id ? { ...cost, [field]: value } : cost
      )
    }));
  };

  // --- LÓGICA DE CORREOS ---
  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    // Validación simple de correo
    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      toast.error("Ingresa un correo válido");
      return;
    }

    // Evitar duplicados
    if (allowedEmails.includes(newEmail.trim())) {
      toast.error("Este correo ya está en la lista");
      return;
    }

    setAllowedEmails([...allowedEmails, newEmail.trim()]);
    setNewEmail(""); // Limpiar input
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setAllowedEmails(allowedEmails.filter(email => email !== emailToRemove));
  };
  // -------------------------

  const handleSave = async () => {
    if (!propertyId) return;
    setIsSaving(true);

    try {
      // 1. Guardar Configuración (Precios, etc)
      const resultSettings = await saveSettings(propertyId, formData);

      // 2. Guardar Correos
      const resultEmails = await updateAllowedEmails(propertyId, allowedEmails);

      if (resultSettings.success && resultEmails.success) {
        toast.success(strings.settings.successMsg);
        await refreshSettings();
      } else {
        toast.error(strings.settings.errorMsg);
      }
    } catch (error) {
      toast.error("Error crítico al guardar");
    }

    setIsSaving(false);
  };

  return (
    <div className="px-4 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{strings.nav.settings}</h1>
            <p className="text-slate-600">{strings.settings.subtitle}</p>
          </div>

          {/* LANGUAGE SWITCHER */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex items-center">
            <button
              onClick={() => setLanguage('es')}
              className={`p-2 rounded-lg transition-all ${language === 'es' ? 'bg-lof-100 text-lof-700 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              🇪🇸 ES
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button
              onClick={() => setLanguage('en')}
              className={`p-2 rounded-lg transition-all ${language === 'en' ? 'bg-lof-100 text-lof-700 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              🇺🇸 EN
            </button>
          </div>
        </div>

        {/* CARD 1: MIEMBROS (NUEVA) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-6 pb-2 border-b border-slate-100">
            <Users className="text-purple-600" size={20} /> {strings.settings.membersTitle}
          </h3>

          <div className="space-y-6">
            <p className="text-sm text-slate-500">
              {strings.settings.membersDesc}
            </p>

            {/* Input para agregar */}
            <form onSubmit={handleAddEmail} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="email"
                  placeholder="ejemplo@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!newEmail}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white p-3 rounded-xl transition-colors"
              >
                <Plus size={20} />
              </button>
            </form>

            {/* Lista de Correos */}
            <div className="space-y-2">
              {allowedEmails.length === 0 && (
                <p className="text-center text-slate-400 text-sm italic py-4">
                  {strings.settings.noMembers}
                </p>
              )}

              {allowedEmails.map((email) => (
                <div key={email} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                      {email.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-slate-700 font-medium text-sm">{email}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveEmail(email)}
                    className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                    title="Eliminar acceso"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 2: DATOS BANCARIOS (Igual que antes) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-6 pb-2 border-b border-slate-100">
            <CreditCard className="text-blue-600" size={20} /> {strings.settings.bankDetailsTitle}
          </h3>
          {/* ... (Contenido de datos bancarios igual que antes) ... */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Titular</label>
              <input type="text" value={formData.bankDetails?.accountName || ''} onChange={(e) => handleTextChange('accountName', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RUT</label>
                <input type="text" value={formData.bankDetails?.rut || ''} onChange={(e) => handleTextChange('rut', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Banco</label>
                <input type="text" value={formData.bankDetails?.bankName || ''} onChange={(e) => handleTextChange('bankName', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none" placeholder="Ej: Banco de Chile" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cuenta</label>
                <input type="text" value={formData.bankDetails?.accountType || ''} onChange={(e) => handleTextChange('accountType', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none" placeholder="Ej: Cta Corriente" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número de Cuenta</label>
                <input type="text" value={formData.bankDetails?.accountNumber || ''} onChange={(e) => handleTextChange('accountNumber', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{strings.settings.notificationEmail}</label>
              <input type="email" value={formData.bankDetails?.email || ''} onChange={(e) => handleTextChange('email', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none" />
            </div>
          </div>
        </div>

        {/* CARD 3: PRECIOS Y REGLAS (Igual que antes) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8">
          {/* ... (Contenido de precios y reglas igual que antes) ... */}
          <div>
            <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-4 pb-2 border-b border-slate-100">
              <DollarSign className="text-lof-600" size={20} /> {strings.settings.pricesTitle}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{strings.settings.adults}</label>
                <input type="number" value={formData.prices.adultPerDay} onChange={(e) => handleNumberChange('prices', 'adultPerDay', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{strings.settings.children}</label>
                <input type="number" value={formData.prices.childPerDay} onChange={(e) => handleNumberChange('prices', 'childPerDay', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none" />
              </div>
            </div>
          </div>

          {/* NUEVA SECCIÓN: COSTOS FIJOS POR ARRIENDO */}
          <div>
            <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-4 pb-2 border-b border-slate-100">
              <Receipt className="text-blue-600" size={20} /> {strings.settings.fixedCostsTitle}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {strings.settings.fixedCostsDesc}
            </p>

            {/* Lista de costos fijos */}
            <div className="space-y-3 mb-4">
              {(formData.fixedCosts || []).map((cost) => (
                <div key={cost.id} className="flex gap-3">
                  <input
                    type="text"
                    value={cost.name}
                    onChange={(e) => handleFixedCostChange(cost.id, 'name', e.target.value)}
                    placeholder="Nombre (ej: Limpieza)"
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                  />
                  <input
                    type="number"
                    value={cost.value}
                    onChange={(e) => handleFixedCostChange(cost.id, 'value', Number(e.target.value))}
                    placeholder="Monto"
                    className="w-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none"
                  />
                  <button
                    onClick={() => removeFixedCost(cost.id)}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {(!formData.fixedCosts || formData.fixedCosts.length === 0) && (
                <p className="text-center text-slate-400 text-sm italic py-4">
                  {strings.settings.noFixedCosts}
                </p>
              )}
            </div>

            {/* Botón agregar */}
            <button
              onClick={addFixedCost}
              className="flex items-center gap-2 text-lof-600 hover:text-lof-700 font-medium text-sm"
            >
              <Plus size={16} /> {strings.settings.addFixedCost}
            </button>
          </div>

          <div>
            <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-4 pb-2 border-b border-slate-100">
              <Baby className="text-orange-500" size={20} /> {strings.settings.rulesTitle}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{strings.settings.childMaxAge}</label>
                <input type="number" value={formData.limits.childMaxAge} onChange={(e) => handleNumberChange('limits', 'childMaxAge', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lof-500 outline-none" />
                <p className="text-xs text-slate-400 mt-1">{strings.settings.childMaxAgeDesc}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-lof-600 hover:bg-lof-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-lof-500/20"
          >
            <Save size={20} />
            {isSaving ? strings.settings.savingBtn : strings.settings.saveBtn}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;