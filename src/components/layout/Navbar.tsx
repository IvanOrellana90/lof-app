import { Link } from 'react-router-dom';
import { Home, Calendar, Wallet, Menu } from 'lucide-react';
import { useState } from 'react';
import { strings } from '../../locales/es';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between h-16">
          
          {/* Logo / Nombre */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-lof-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="text-xl font-bold text-slate-800 tracking-tight">Lof</span>
            </Link>
          </div>

          {/* Menú Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-slate-600 hover:text-lof-600 font-medium flex items-center gap-2">
              <Home size={18} /> {strings.nav.home}
            </Link>
            <Link to="/bookings" className="text-slate-600 hover:text-lof-600 font-medium flex items-center gap-2">
              <Calendar size={18} /> {strings.nav.bookings}
            </Link>
            <Link to="/expenses" className="text-slate-600 hover:text-lof-600 font-medium flex items-center gap-2">
              <Wallet size={18} /> {strings.nav.expenses}
            </Link>
            <div className="w-8 h-8 rounded-full bg-lof-100 border border-lof-200 flex items-center justify-center text-lof-700 font-bold text-xs">
              JO
            </div>
          </div>

          {/* Botón Menú Móvil */}
          <div className="flex items-center md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 py-2">
          <Link to="/" className="block px-4 py-3 text-slate-600 hover:bg-slate-50">{strings.nav.home}</Link>
          <Link to="/bookings" className="block px-4 py-3 text-slate-600 hover:bg-slate-50">{strings.nav.bookings}</Link>
          <Link to="/expenses" className="block px-4 py-3 text-slate-600 hover:bg-slate-50">{strings.nav.expenses}</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;