import { Copy, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { strings } from '../../locales/es';

const BankCard = () => {
  const [copied, setCopied] = useState(false);
  
  // Data stays in code (or config file), Labels come from strings
  const bankDetails = {
    accountName: "JOSEFA ORELLANA VAL",
    rut: "18.392.837-6",
    bankName: "Bci / Cuenta Vista",
    accountNumber: "777018392837",
    email: "orellanav.josefa@gmail.com"
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(bankDetails.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-lof-500/20 rounded-full blur-xl"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
              {strings.bankCard.title}
            </p>
            <h3 className="text-xl font-bold mt-1">{bankDetails.accountName}</h3>
            <p className="text-slate-300 text-sm">{bankDetails.rut}</p>
          </div>
          <CreditCard className="text-lof-500" size={32} />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-slate-400 text-xs uppercase">
              {strings.bankCard.bankLabel}
            </p>
            <p className="font-medium">{bankDetails.bankName}</p>
          </div>

          <div>
            <p className="text-slate-400 text-xs uppercase mb-1">
              {strings.bankCard.accountLabel}
            </p>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-lg px-3 py-2 w-full sm:w-auto group"
            >
              <span className="font-mono text-lg tracking-widest">{bankDetails.accountNumber}</span>
              {copied ? (
                <span className="text-green-400 text-xs font-bold px-2">{strings.bankCard.copiedMsg}</span>
              ) : (
                <Copy size={16} className="text-slate-400 group-hover:text-white" />
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-slate-400">
              {strings.common.emailLabel}: {bankDetails.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankCard;