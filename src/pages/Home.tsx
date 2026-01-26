import { ArrowRight, CalendarPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import BankCard from '../features/dashboard/BankCard';
import PricingRules from '../features/dashboard/PricingRules';
import { strings } from '../locales/es';

const Home = () => {
  return (
    <div className="px-4 py-8 pb-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{strings.common.welcomeTitle}</h1>
        <p className="text-slate-600 mt-1">{strings.common.welcomeSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Left Column */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">{strings.home.houseStatusTitle}</h3>
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                {strings.home.statusAvailable}
              </span>
            </div>
            <p className="text-slate-500 text-sm mb-6">{strings.home.nobodyHome}</p>
            
            <Link to="/bookings" className="w-full flex items-center justify-center gap-2 bg-lof-600 hover:bg-lof-700 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-lg shadow-lof-500/20">
              <CalendarPlus size={20} />
              {strings.home.btnNewBooking}
            </Link>
          </div>

          <BankCard />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <PricingRules />
          
          <Link to="/gastos" className="block p-4 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors group">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800">{strings.home.btnHistory}</h4>
                <p className="text-xs text-slate-500">{strings.home.historySubtitle}</p>
              </div>
              <ArrowRight size={20} className="text-slate-400 group-hover:text-slate-600" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;