import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { BUSINESS_RULES } from '../config/rules';

// Interface para costos fijos por arriendo
export interface FixedCost {
  id: string;
  name: string;
  value: number;
}

// Reutilizamos las interfaces que ya tenías
export interface AppSettings {
  prices: {
    adultPerDay: number;
    childPerDay: number;
  };
  fixedCosts: FixedCost[];  // NUEVO - Array flexible de costos fijos
  limits: {
    childMaxAge: number;
    minDaysToBook: number;
  };
  bankDetails: {
    accountName: string;
    rut: string;
    bankName: string;
    accountType: string;
    accountNumber: string;
    email: string;
  };
}

// 1. Obtener configuración (De una propiedad específica)
export const getSettings = async (propertyId: string): Promise<AppSettings> => {
  try {
    const docRef = doc(db, "properties", propertyId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Si la propiedad tiene configuración guardada, la usamos.
      // Si no (propiedades viejas), usamos las reglas por defecto.
      return (data.settings as AppSettings) || BUSINESS_RULES;
    }
    return BUSINESS_RULES as AppSettings;
  } catch (error) {
    console.error("Error obteniendo configuración:", error);
    return BUSINESS_RULES as AppSettings;
  }
};

// 2. Guardar configuración (En la propiedad)
export const saveSettings = async (propertyId: string, settings: AppSettings) => {
  try {
    const docRef = doc(db, "properties", propertyId);
    // Solo actualizamos el campo 'settings' dentro del documento de la propiedad
    await updateDoc(docRef, { settings });
    return { success: true };
  } catch (error) {
    console.error("Error guardando configuración:", error);
    return { success: false, error };
  }
};