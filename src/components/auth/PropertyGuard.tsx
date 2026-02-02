import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PropertyGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const PropertyGuard = ({ children, requireAdmin = false }: PropertyGuardProps) => {
  const { propertyId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [access, setAccess] = useState<'loading' | 'allowed' | 'denied'>('loading');

  const didToastRun = useRef(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !propertyId) return;
      if (didToastRun.current) return;
      didToastRun.current = true;

      try {
        const docRef = doc(db, "properties", propertyId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          toast.error("La propiedad no existe");
          setAccess('denied');
          navigate('/');
          return;
        }

        const data = docSnap.data();
        const admins = data.admins || [];
        const allowedEmails = data.allowedEmails || [];

        // 1. Verificamos si es Admin
        const isAdmin = admins.includes(user.uid);

        // 2. Verificamos si es Miembro (está en allowedEmails o es admin)
        const isMember = isAdmin || allowedEmails.includes(user.email);

        // LÓGICA DE DECISIÓN
        if (requireAdmin) {
          // Si la ruta exige admin y NO lo es -> Fuera
          if (!isAdmin) {
            toast.error("Acceso denegado: Se requiere ser Administrador");
            setAccess('denied');
            navigate(`/property/${propertyId}`); // Lo devolvemos al home de la propiedad
          } else {
            setAccess('allowed');
          }
        } else {
          // Si es ruta normal, basta con ser miembro
          if (!isMember) {
            toast.error("No tienes acceso a esta propiedad");
            setAccess('denied');
            navigate('/'); // Lo devolvemos al dashboard general
          } else {
            setAccess('allowed');
          }
        }

      } catch (error) {
        console.error("Error verificando acceso:", error);
        setAccess('denied');
        navigate('/');
      }
    };

    checkAccess();
  }, [propertyId, user, navigate, requireAdmin]);

  if (access === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-lof-600 mx-auto mb-4" />
          <p className="text-slate-500">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  return access === 'allowed' ? <>{children}</> : null;
};

export default PropertyGuard;