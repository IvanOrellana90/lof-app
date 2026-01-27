import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { BUSINESS_RULES } from '../config/rules'; // Usamos las reglas viejas como respaldo por defecto

// Definimos la estructura de nuestros datos
export interface AppSettings {
  prices: {
    adultPerDay: number;
    childPerDay: number;
  };
  limits: {
    childMaxAge: number;
    minDaysToBook: number;
  };
}

// 1. Obtener configuración
export const getSettings = async (): Promise<AppSettings> => {
  try {
    const docRef = doc(db, "settings", "general");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as AppSettings;
    } else {
      // Si no existe (primera vez), devolvemos las reglas por defecto del archivo
      return BUSINESS_RULES as AppSettings;
    }
  } catch (error) {
    console.error("Error obteniendo configuración:", error);
    return BUSINESS_RULES as AppSettings; // Fallback seguro
  }
};

// 2. Guardar configuración
export const saveSettings = async (settings: AppSettings) => {
  try {
    const docRef = doc(db, "settings", "general");
    await setDoc(docRef, settings);
    return { success: true };
  } catch (error) {
    console.error("Error guardando configuración:", error);
    return { success: false, error };
  }
};