import { Info } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { strings } from '../../locales/es';

const PricingRules = () => {
  const { settings } = useSettings();

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <Info className="text-lof-600" size={20} />
        <h3 className="font-bold text-slate-800">{strings.home.pricingTitle}</h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-slate-50">
          <span className="text-slate-600">Adultos</span>
          <span className="font-bold text-slate-900">
            ${settings.prices.adultPerDay.toLocaleString('es-CL')} <span className="text-xs text-slate-400 font-normal">/día</span>
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-50">
          <span className="text-slate-600">Niños</span>
          <span className="font-bold text-slate-900">
            ${settings.prices.childPerDay.toLocaleString('es-CL')} <span className="text-xs text-slate-400 font-normal">/día</span>
          </span>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg mt-2">
          <p className="text-xs text-orange-700">
            * Niños menores de {settings.limits.childMaxAge} años no pagan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingRules;