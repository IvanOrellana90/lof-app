import { 
  collection, 
  addDoc, 
  getDocs, 
  doc,
  getDoc,
  updateDoc,
  query, 
  where, 
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { BUSINESS_RULES } from '../config/rules';

export interface Property {
  id: string;
  name: string;
  ownerId: string; // Creador
  admins: string[]; // UIDs de admins
  allowedEmails: string[]; // Lista blanca de correos invitados
  settings: { // Cada propiedad tiene sus propios precios
    prices: { adultPerDay: number; childPerDay: number };
    limits: { childMaxAge: number };
  };
  createdAt: Date;
}

// 1. Crear Propiedad
export const createProperty = async (name: string, user: { uid: string, email: string }) => {
  try {
    const newProperty = {
      name,
      ownerId: user.uid,
      admins: [user.uid], // El creador es admin automático
      allowedEmails: [user.email], // El creador está permitido
      settings: BUSINESS_RULES, // Copiamos las reglas default
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, "properties"), newProperty);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating property:", error);
    return { success: false, error };
  }
};

// 2. Obtener Mis Propiedades (Donde soy admin o estoy en allowedEmails)
// Nota: Por ahora buscaremos por "admins" para simplificar el dashboard de gestión
export const getUserProperties = async (userId: string): Promise<Property[]> => {
  try {
    const propertiesRef = collection(db, "properties");
    // Buscamos donde mi UID esté en el array de admins
    const q = query(propertiesRef, where("admins", "array-contains", userId));
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()
      } as Property;
    });
  } catch (error) {
    console.error("Error getting properties:", error);
    return [];
  }
};

// 3. Agregar correo permitido (Para la config de admin)
export const addAllowedEmail = async (propertyId: string, email: string) => {
  try {
    const propRef = doc(db, "properties", propertyId);
    await updateDoc(propRef, {
      allowedEmails: arrayUnion(email) // arrayUnion evita duplicados
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const checkPropertyAdmin = async (propertyId: string, userId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, "properties", propertyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const admins = data.admins || [];
      return admins.includes(userId);
    }
    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

export const getPropertyById = async (propertyId: string): Promise<Property | null> => {
  try {
    const docRef = doc(db, "properties", propertyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Property;
    }
    return null;
  } catch (error) {
    console.error("Error getting property:", error);
    return null;
  }
};