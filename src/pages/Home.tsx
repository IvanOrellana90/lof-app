import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Calendar, Wallet, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getPropertyById, checkPropertyAdmin } from '../services/propertyService';

// Importamos los componentes nuevos
import BankCard from '../features/dashboard/BankCard';
import PricingRules from '../features/dashboard/PricingRules';
import HouseStatus from '../features/dashboard/HouseStatus';

const Home = () => {
  const { propertyId } = useParams();
  const { user } = useAuth();
  const { strings } = useLanguage();
  const [propertyName, setPropertyName] = useState("");
  const [isPropertyAdmin, setIsPropertyAdmin] = useState(false);

  // Recuperamos el nombre de la propiedad para el título
  useEffect(() => {
    const loadPropertyData = async () => {
      if (!propertyId || !user) return;

      // 1. Obtener datos de la propiedad (Nombre)
      const property = await getPropertyById(propertyId);
      if (property) {
        setPropertyName(property.name);
      }

      // 2. Verificar permisos (Admin) usando el servicio
      const isAdmin = await checkPropertyAdmin(propertyId, user.uid);
      setIsPropertyAdmin(isAdmin);
    };

    loadPropertyData();
  }, [propertyId, user]);
  return (
    <div className="px-4 py-8 pb-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          {strings.common.welcomeTitle}
        </h1>
        <p className="text-slate-600 mt-1">
          {strings.common.welcomeSubtitle(propertyName || "el Lof")}
        </p>
      </div>

      {/* Grid de Accesos Directos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

        {/* Card: Reservas */}
        <Link to="bookings" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-lof-300 transition-all group">
          <div className="w-12 h-12 bg-lof-100 rounded-xl flex items-center justify-center mb-4 text-lof-600 group-hover:scale-110 transition-transform">
            <Calendar size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Reservas</h3>
          <p className="text-slate-500 text-sm mt-1">Gestionar calendario y solicitudes.</p>
        </Link>

        {/* Card: Gastos */}
        <Link to="expenses" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-purple-300 transition-all group">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 text-purple-600 group-hover:scale-110 transition-transform">
            <Wallet size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Gastos</h3>
          <p className="text-slate-500 text-sm mt-1">Registrar gastos y ver balances.</p>
        </Link>

        {/* Card: Configuración (Solo Admin) */}
        {isPropertyAdmin && (
          <Link to="settings" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-400 transition-all group">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-600 group-hover:scale-110 transition-transform">
              <Settings size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Configuración</h3>
            <p className="text-slate-500 text-sm mt-1">Editar precios y reglas de la casa.</p>
          </Link>
        )}
      </div>

      {/* Grid de Información (2 Columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Columna Izquierda */}
        <div className="space-y-6">
          {/* Status Card */}
          <HouseStatus />

          <BankCard />
        </div>

        {/* Columna Derecha */}
        <div className="space-y-6">
          <PricingRules />

          <Link to="expenses" className="block p-4 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors group">
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