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
import { notificationService } from './notificationService';
import { BUSINESS_RULES } from '../config/rules';
import { getDocs as getDocsFirestore, query as queryFirestore, collection as collectionFirestore, where as whereFirestore } from 'firebase/firestore';

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
      allowedEmails: [user.email.toLowerCase()], // El creador está permitido
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
export const getUserProperties = async (userId: string, userEmail: string | null): Promise<Property[]> => {
  try {
    const propertiesRef = collection(db, "properties");
    const uniqueProperties = new Map<string, Property>();

    // 1. Consulta A: Propiedades donde soy ADMIN (por UID)
    const qAdmins = query(propertiesRef, where("admins", "array-contains", userId));
    const snapAdmins = await getDocs(qAdmins);

    snapAdmins.docs.forEach(doc => {
      const data = doc.data();
      uniqueProperties.set(doc.id, {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()
      } as Property);
    });

    // 2. Consulta B: Propiedades donde soy MIEMBRO (por Email)
    if (userEmail) {
      const emailLower = userEmail.toLowerCase();
      const qMembers = query(propertiesRef, where("allowedEmails", "array-contains", emailLower));
      const snapMembers = await getDocs(qMembers);

      snapMembers.docs.forEach(doc => {
        // El Map evita duplicados automáticamente si soy admin Y miembro a la vez
        const data = doc.data();
        uniqueProperties.set(doc.id, {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()
        } as Property);
      });
    }

    // Convertimos el Map a Array
    return Array.from(uniqueProperties.values());

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
      allowedEmails: arrayUnion(email.toLowerCase()) // arrayUnion evita duplicados
    });

    // Notificar al usuario (si ya existe en el sistema)
    try {
      const propertySnap = await getDoc(propRef);
      if (propertySnap.exists()) {
        const propertyData = propertySnap.data();
        const usersQuery = queryFirestore(
          collectionFirestore(db, "users"),
          whereFirestore("email", "==", email.toLowerCase())
        );
        const usersSnap = await getDocsFirestore(usersQuery);
        if (!usersSnap.empty) {
          const userDoc = usersSnap.docs[0];
          await notificationService.createNotification({
            userId: userDoc.id,
            type: 'added_to_property',
            data: {
              propertyName: propertyData.name
            }
          });
        }
      }
    } catch (e) {
      console.error("Error sending property notification:", e);
    }

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

export const updateAllowedEmails = async (propertyId: string, emails: string[]) => {
  try {
    const docRef = doc(db, "properties", propertyId);

    // ✅ Convertir a lowercase y eliminar duplicados
    const lowerEmails = emails.map(e => e.toLowerCase());
    const uniqueEmails = Array.from(new Set(lowerEmails));

    await updateDoc(docRef, {
      allowedEmails: uniqueEmails
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating emails:", error);
    return { success: false, error };
  }
};

export const updatePropertyAdmins = async (propertyId: string, adminUids: string[]) => {
  try {
    const docRef = doc(db, "properties", propertyId);
    await updateDoc(docRef, {
      admins: adminUids
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating admins:", error);
    return { success: false, error };
  }
};