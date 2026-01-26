import { Users, Info } from 'lucide-react';
import { strings } from '../../locales/es';
import { BUSINESS_RULES } from '../../config/rules';

const PricingRules = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Info size={20} className="text-lof-600" />
        {strings.pricing.title}
      </h3>

      <div className="space-y-6">
        
        {/* Fixed Costs */}
        <div>
          <h4 className="text-sm font-semibold text-slate-500 uppercase mb-3">
            {strings.pricing.sectionFixed}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="block text-xs text-slate-500">{strings.pricing.gen1}</span>
              <span className="block text-lg font-bold text-slate-800">$160.133</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="block text-xs text-slate-500">{strings.pricing.gen2}</span>
              <span className="block text-lg font-bold text-slate-800">$17.157</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{strings.pricing.noteFixed}</p>
        </div>

        {/* Variable Costs */}
        <div>
          <h4 className="text-sm font-semibold text-slate-500 uppercase mb-3">
            {strings.pricing.sectionVariable}
          </h4>
          <div className="flex items-center justify-between p-4 bg-lof-50 rounded-lg border border-lof-100">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-full text-lof-600">
                <Users size={20} />
              </div>
              <div>
                <p className="font-bold text-lof-900">{strings.pricing.adults}</p>
                <p className="text-xs text-lof-700">{strings.pricing.perDay}</p>
              </div>
            </div>
            {/* PRECIO DINÁMICO */}
            <span className="text-2xl font-bold text-lof-700">
              ${BUSINESS_RULES.prices.adultPerDay.toLocaleString()}
            </span>
          </div>
          
          {/* REGLA DE NIÑOS DINÁMICA */}
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <span>👶</span> 
            {BUSINESS_RULES.prices.childPerDay === 0 
              ? `Niños menores de ${BUSINESS_RULES.limits.childMaxAge} años no pagan.`
              : `Niños pagan $${BUSINESS_RULES.prices.childPerDay} desde los ${BUSINESS_RULES.limits.childMaxAge} años.`
            }
          </p>
        </div>

      </div>
    </div>
  );
};

export default PricingRules;