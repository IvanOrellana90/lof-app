import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../services/firebase';
import { toast } from 'sonner';
import { User, Mail, Save, Loader2, Camera, Upload } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Avatar from '../components/ui/Avatar';
import React from 'react';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const { strings } = useLanguage();
  // Estado local para los inputs
  const [name, setName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona una imagen válida");
      return;
    }

    // Validar tamaño (ej modulo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen es muy pesada (max 2MB)");
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      toast.success("Foto subida. No olvides guardar los cambios.");
    } catch (error) {
      console.error("Error al subir imagen:", error);
      toast.error("Error al subir la imagen");
    } finally {
      setIsUploading(false);
    }
  };

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
        displayName: name,
        photoURL: photoURL
      });

      // 2. Actualizar en Firestore (Base de datos persistente)
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: name,
        photoURL: photoURL
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
          <Avatar
            src={photoURL || user?.photoURL}
            name={name || 'U'}
            size="xl"
            editable
            onClick={handleImageClick}
            loading={isUploading}
          />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <p className="text-xs text-lof-600 font-medium mt-2 flex items-center gap-1 cursor-pointer hover:underline" onClick={handleImageClick}>
            <Upload size={12} /> Presiona para cambiar foto
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-4">{strings.profile.title}</h1>
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

          {/* Campo: Foto de Perfil (Solo informativo/borrar si se prefiere) */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 italic text-xs text-blue-700 flex gap-2">
            <Camera size={16} className="text-blue-500 shrink-0" />
            <span>Puedes cambiar tu foto de perfil haciendo clic directamente en el círculo de arriba. La imagen se guardará en nuestra base de datos.</span>
          </div>

          {/* Botón Guardar */}
          <button
            onClick={handleUpdate}
            disabled={isSaving || (name === user?.displayName && photoURL === user?.photoURL)}
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