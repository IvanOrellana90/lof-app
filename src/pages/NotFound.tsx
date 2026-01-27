import { Link } from 'react-router-dom';
import { MapPinOff, Home } from 'lucide-react';
import { strings } from '../locales/es'; // <--- Importamos el diccionario

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
      
      <div className="bg-slate-100 p-6 rounded-full mb-6 animate-pulse">
        <MapPinOff size={64} className="text-slate-400" />
      </div>

      <h1 className="text-6xl font-bold text-slate-900 mb-2">
        {strings.notFound.code}
      </h1>
      <h2 className="text-2xl font-bold text-slate-700 mb-4">
        {strings.notFound.title}
      </h2>
      
      <p className="text-slate-500 max-w-md mb-8 text-lg">
        {strings.notFound.description}
      </p>

      <Link 
        to="/" 
        className="flex items-center gap-2 bg-lof-600 hover:bg-lof-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-lof-500/20"
      >
        <Home size={20} />
        {strings.notFound.btnHome}
      </Link>
    </div>
  );
};

export default NotFound;