import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Home, Calendar, Wallet, Menu, X, LogOut, User as UserIcon, LayoutDashboard, Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from '../ui/Avatar';
import NotificationItem from '../ui/NotificationItem';
import logo from '../../../public/images/logo.png';

const Navbar = () => {
  const location = useLocation();
  const { propertyId } = useParams();
  const { user, logout } = useAuth();
  const { strings } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Determina si estamos dentro de una propiedad específica
  const isInsideProperty = !!propertyId;

  const isActive = (path: string) => location.pathname === path
    ? "text-lof-600 bg-lof-50 font-bold"
    : "text-slate-600 hover:text-lof-600 hover:bg-slate-50 font-medium";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
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
          <Link to="/" className="flex items-center">
            <img
              src={logo}
              alt="Lof App"
              className="h-12 w-auto"
            />
          </Link>

          {/* Menú Escritorio (Centro) */}
          <div className="hidden md:flex items-center space-x-2">
            <Link to="/" className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${location.pathname === '/' ? 'text-lof-600 bg-lof-50 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Home size={18} /> Mis Propiedades
            </Link>

            {isInsideProperty && (
              <>
                <div className="h-6 w-px bg-slate-300 mx-2"></div>
                <Link to={`/property/${propertyId}`} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive(`/property/${propertyId}`)}`}>
                  <LayoutDashboard size={18} /> {strings.nav.dashboard || "Panel"}
                </Link>
                <Link to={`/property/${propertyId}/bookings`} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive(`/property/${propertyId}/bookings`)}`}>
                  <Calendar size={18} /> {strings.nav.bookings}
                </Link>
                <Link to={`/property/${propertyId}/expenses`} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive(`/property/${propertyId}/expenses`)}`}>
                  <Wallet size={18} /> {strings.nav.expenses}
                </Link>
              </>
            )}
          </div>

          {/* Acciones (Derecha) */}
          <div className="flex items-center gap-2 md:gap-4">

            {/* Notificaciones */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-2 rounded-full transition-all relative ${isNotificationsOpen ? 'bg-slate-100 text-lof-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 py-0 overflow-hidden animation-fade-in-down max-h-[400px] flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-800">{strings.notifications.title}</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="text-xs text-lof-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <CheckCheck size={14} /> {strings.notifications.markAllAsRead}
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <NotificationItem
                          key={n.id}
                          notification={n}
                          onMarkAsRead={markAsRead}
                        />
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm text-slate-400">{strings.notifications.empty}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Perfil */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition-opacity"
              >
                <Avatar src={user?.photoURL} name={user?.displayName || 'U'} size="md" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 animation-fade-in-down">
                  <div className="px-4 py-3 border-b border-slate-50">
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

                  <button
                    onClick={() => {
                      logout();
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left border-t border-slate-50 mt-1"
                  >
                    <LogOut size={16} /> {strings.nav.logout}
                  </button>
                </div>
              )}
            </div>

            {/* Botón Menú Móvil */}
            <div className="md:hidden flex items-center ml-1">
              <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="text-slate-600 hover:text-slate-900 focus:outline-none p-1"
              >
                {isMobileOpen ? <X size={26} /> : <Menu size={26} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {isMobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-2 shadow-lg">
          <Link to="/" onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-50 font-bold text-slate-700`}>
            <Home size={18} /> Mis Propiedades
          </Link>

          {isInsideProperty && (
            <>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 mb-2 pl-4">Propiedad Actual</div>
              <Link to={`/property/${propertyId}`} onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isActive(`/property/${propertyId}`)}`}>
                <LayoutDashboard size={18} /> {strings.nav.dashboard || "Panel"}
              </Link>
              <Link to={`/property/${propertyId}/bookings`} onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isActive(`/property/${propertyId}/bookings`)}`}>
                <Calendar size={18} /> {strings.nav.bookings}
              </Link>
              <Link to={`/property/${propertyId}/expenses`} onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isActive(`/property/${propertyId}/expenses`)}`}>
                <Wallet size={18} /> {strings.nav.expenses}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;