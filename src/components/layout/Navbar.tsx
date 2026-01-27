import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Wallet, Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import { strings } from '../../locales/es';
import { useAuth } from '../../context/AuthContext';
import { Settings as SettingsIcon } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  
  // Estado para el menú móvil y el dropdown de usuario
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Referencia para detectar clicks fuera del menú y cerrarlo
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path 
    ? "text-lof-600 bg-lof-50 font-bold" 
    : "text-slate-600 hover:text-lof-600 hover:bg-slate-50 font-medium";

  // Cerrar dropdown si hago click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-lof-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-xl font-bold text-slate-800">Lof</span>
          </div>

          {/* Menú Escritorio (Centro) */}
          <div className="hidden md:flex items-center space-x-2">
            <Link to="/" className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive('/')}`}>
              <Home size={18} /> {strings.nav.home}
            </Link>
            <Link to="/bookings" className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive('/bookings')}`}>
              <Calendar size={18} /> {strings.nav.bookings}
            </Link>
            <Link to="/expenses" className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive('/expenses')}`}>
              <Wallet size={18} /> {strings.nav.expenses}
            </Link>
          </div>

          {/* Perfil / Dropdown (Derecha) */}
          <div className="flex items-center gap-4">
            
            {/* DROPDOWN DE USUARIO */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition-opacity"
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-100 overflow-hidden">
                  {/* LÓGICA: ¿Tiene foto? */}
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="User" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    // Si no tiene, mostramos inicial
                    <div className="w-full h-full flex items-center justify-center bg-lof-100 text-lof-700 font-bold">
                      {user?.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
              </button>

              {/* Menú Flotante */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 animation-fade-in-down">
                  <div className="px-4 py-2 border-b border-slate-50">
                    <p className="text-sm font-bold text-slate-800 truncate">{user?.displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  
                  <Link 
                    to="/profile" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-lof-600"
                  >
                    <UserIcon size={16} /> {strings.nav.profile}
                  </Link>

                  {isAdmin && (
                    <Link 
                      to="/admin/settings" 
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-lof-600"
                    >
                      <SettingsIcon size={16} /> {strings.nav.settings}
                    </Link>
                  )}

                  <button 
                    onClick={() => {
                        logout();
                        setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                  >
                    <LogOut size={16} /> {strings.nav.logout}
                  </button>
                </div>
              )}
            </div>

            {/* Botón Menú Móvil (Hamburguesa) */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setIsMobileOpen(!isMobileOpen)} 
                className="text-slate-600 hover:text-slate-900 focus:outline-none"
              >
                {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {isMobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-2 shadow-lg">
          <Link to="/" onClick={() => setIsMobileOpen(false)} className={`block px-4 py-2 rounded-lg ${isActive('/')}`}>
            {strings.nav.home}
          </Link>
          <Link to="/bookings" onClick={() => setIsMobileOpen(false)} className={`block px-4 py-2 rounded-lg ${isActive('/bookings')}`}>
            {strings.nav.bookings}
          </Link>
          <Link to="/expenses" onClick={() => setIsMobileOpen(false)} className={`block px-4 py-2 rounded-lg ${isActive('/expenses')}`}>
            {strings.nav.expenses}
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;