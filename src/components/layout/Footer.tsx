import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Heart } from 'lucide-react';

const Footer = () => {
  const { strings } = useLanguage();
  const currentYear = new Date().getFullYear();
  const [isBeating, setIsBeating] = useState(false);

  const handleHeartClick = () => {
    setIsBeating(true);
    setTimeout(() => setIsBeating(false), 700);
  };

  const getHeartContent = () => {
    const text = strings.footer.madeWithLove;
    const splitKey = text.includes('amor') ? 'amor' : 'love';
    const parts = text.split(splitKey);

    return (
      <div className="flex items-center gap-1">
        <span>{parts[0]}</span>
        <button
          onClick={handleHeartClick}
          className={`transition-all duration-500 transform outline-none focus:outline-none ${isBeating ? 'scale-125' : 'hover:scale-110 active:scale-95'}`}
          aria-label="Made with love"
        >
          <Heart
            size={16}
            className={`fill-current text-lof-600 transition-all duration-500 ${isBeating ? 'animate-pulse scale-110 drop-shadow-[0_0_8px_rgba(2,132,199,0.5)]' : ''}`}
          />
        </button>
        <span>{parts[1]}</span>
      </div>
    );
  };

  return (
    <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
          <div className="flex items-center gap-1">
            <span>&copy; {currentYear} Lof App.</span>
            <span>{strings.footer.rights}</span>
          </div>

          {getHeartContent()}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
