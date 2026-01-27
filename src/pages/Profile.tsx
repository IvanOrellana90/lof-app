import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore'; // <--- Importante para la BD
import { auth, db } from '../services/firebase';     // <--- Importamos db
import { toast } from 'sonner';
import { User, Mail, Save, Loader2 } from 'lucide-react';
import { strings } from '../locales/es';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  // Estado local para el input del nombre
  const [name, setName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async () => {
    if (!auth.currentUser || !user?.uid) return;
    
    // Validación simple
    if (name.trim() === '') {
      toast.error("El nombre no puede estar vacío");
      return;
    }

    setIsSaving(true);
    
    try {
      // 1. Actualizar en Firebase Authentication (Sesión actual)
      await updateProfile(auth.currentUser, {
        displayName: name
      });

      // 2. Actualizar en Firestore (Base de datos persistente)
      // Esto es CRUCIAL porque tu AuthContext lee de aquí al iniciar
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { 
        displayName: name 
      });

      toast.success(strings.profile.successUpdate);
      
      await refreshUser();

    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      toast.error("Error al actualizar. Inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-4 py-8">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        
        {/* Encabezado con Foto */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden mb-4 flex items-center justify-center">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-slate-400">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{strings.profile.title}</h1>
          <p className="text-slate-500">{strings.profile.subtitle}</p>
        </div>

        {/* Formulario */}
        <div className="space-y-6">
          
          {/* Campo: Correo (Deshabilitado) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {strings.profile.lblEmail}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="email" 
                disabled 
                value={user?.email || ''} 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              El correo está vinculado a tu cuenta de Google.
            </p>
          </div>

          {/* Campo: Nombre (Editable) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {strings.profile.lblName}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-lof-500 focus:border-lof-500 outline-none transition-all text-slate-900"
                placeholder="Tu nombre completo"
              />
            </div>
          </div>

          {/* Botón Guardar */}
          <button 
            onClick={handleUpdate}
            disabled={isSaving || name === user?.displayName}
            className="w-full flex items-center justify-center gap-2 bg-lof-600 hover:bg-lof-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-lof-500/20 disabled:shadow-none"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={18} />
                {strings.profile.btnSave}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Profile;