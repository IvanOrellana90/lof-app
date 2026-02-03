import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  signInWithPopup, // <--- VOLVEMOS A POPUP
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebase';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'member';
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // --- LOGIN CON POPUP (MÁS ESTABLE EN LOCALHOST) ---
  const login = async () => {
    try {
      setLoading(true);
      // El Popup no recarga la página, espera aquí mismo el resultado
      await signInWithPopup(auth, googleProvider);
      // No necesitamos hacer nada más, onAuthStateChanged detectará el login
    } catch (error) {
      console.error("Error al iniciar sesión con Popup", error);
      setLoading(false); // Quitamos loading si falla o el usuario cierra la ventana
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUser(userSnap.data() as UserProfile);
      }
    } catch (error) {
      console.error("Error refrescando usuario", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {

        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setUser(userSnap.data() as UserProfile);
          } else {
            // Crear usuario si es la primera vez
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email?.toLowerCase() || null,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'member'
            };
            await setDoc(userRef, newUser);
            setUser(newUser);
          }
        } catch (error) {
          console.error("🔥 Error leyendo BD, usando modo básico:", error);
          // Si falla Firestore, dejamos entrar al usuario igual
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email?.toLowerCase() || null,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'member'
          });
        }
      } else {
        console.log("⚠️ No hay usuario logueado (Esperando login...)");
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAdmin: user?.role === 'admin',
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};