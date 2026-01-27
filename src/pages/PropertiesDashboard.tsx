import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createProperty, getUserProperties, type Property } from '../services/propertyService';
import { Plus, Home, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const PropertiesDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newPropName, setNewPropName] = useState("");

  // Cargar propiedades al entrar
  useEffect(() => {
    if (user?.uid) {
      loadProperties();
    }
  }, [user]);

  const loadProperties = async () => {
    if (!user?.uid) return;
    setLoading(true);
    const data = await getUserProperties(user.uid);
    setProperties(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim() || !user?.email) return;

    setIsCreating(true);
    const result = await createProperty(newPropName, { uid: user.uid, email: user.email });
    
    if (result.success) {
      toast.success("¡Propiedad creada!");
      setNewPropName("");
      loadProperties(); // Recargar lista
    } else {
      toast.error("Error al crear propiedad");
    }
    setIsCreating(false);
  };

  const handleSelectProperty = (id: string) => {
    // Aquí redirigimos al dashboard interno de esa propiedad
    // IMPORTANTE: Guardaremos el ID en la URL
    navigate(`/property/${id}`);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mis Propiedades</h1>
            <p className="text-slate-600">Bienvenido, {user?.displayName}</p>
          </div>
          {/* Aquí podrías poner el botón de logout o perfil si no hay Navbar global */}
        </div>

        {/* Lista de Propiedades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Card: Crear Nueva */}
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col justify-center items-center text-center hover:border-lof-500 transition-colors group">
            <div className="bg-slate-100 p-4 rounded-full mb-4 group-hover:bg-lof-50 transition-colors">
              <Plus className="text-slate-400 group-hover:text-lof-600" size={32} />
            </div>
            <h3 className="font-bold text-slate-700 mb-2">Crear nueva propiedad</h3>
            <form onSubmit={handleCreate} className="w-full mt-2 space-y-2">
                <input 
                  type="text" 
                  placeholder="Nombre (ej: Casa Playa)" 
                  value={newPropName}
                  onChange={e => setNewPropName(e.target.value)}
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-lof-500 outline-none"
                />
                <button 
                  disabled={isCreating || !newPropName}
                  className="w-full py-2 bg-lof-600 text-white rounded-lg text-sm font-bold hover:bg-lof-700 disabled:opacity-50"
                >
                  {isCreating ? "Creando..." : "Crear"}
                </button>
            </form>
          </div>

          {/* Cards: Propiedades Existentes */}
          {properties.map(prop => (
            <div key={prop.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 bg-lof-100 rounded-xl flex items-center justify-center mb-4 text-lof-700">
                  <Home size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{prop.name}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {prop.admins.length} Administrador{prop.admins.length > 1 ? 'es' : ''}
                </p>
              </div>
              
              <button 
                onClick={() => handleSelectProperty(prop.id)}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl transition-colors"
              >
                Entrar <ArrowRight size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertiesDashboard;