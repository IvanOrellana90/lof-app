import { collection, addDoc, getDocs, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { type DateRange } from 'react-day-picker';

export interface Booking {
  id: string;
  userName: string;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'confirmed' | 'rejected'; // <--- Tipamos el estado
}

// 1. Crear Reserva (AHORA NACE COMO PENDING)
export const createBooking = async (
  range: DateRange, 
  adults: number, 
  children: number, 
  totalCost: number
) => {
  try {
    if (!range.from || !range.to) throw new Error("Fechas incompletas");

    const bookingPayload = {
      userId: "usuario_invitado_1",
      userName: "Familia Invitada",
      startDate: Timestamp.fromDate(range.from),
      endDate: Timestamp.fromDate(range.to),
      adults,
      children,
      totalCost,
      status: 'pending', // <--- CAMBIO CLAVE: Estado inicial
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, "bookings"), bookingPayload);
    return { success: true, id: docRef.id };

  } catch (error) {
    console.error("Error al crear reserva: ", error);
    return { success: false, error };
  }
};

// 2. Obtener Reservas (Igual que antes)
export const getBookings = async (): Promise<Booking[]> => {
  try {
    const q = query(collection(db, "bookings"), orderBy("startDate", "asc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userName: data.userName,
        status: data.status,
        startDate: (data.startDate as Timestamp).toDate(),
        endDate: (data.endDate as Timestamp).toDate()
      } as Booking;
    });
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    return [];
  }
};

// 3. NUEVA: Actualizar Estado (Aprobar/Rechazar)
export const updateBookingStatus = async (bookingId: string, newStatus: 'confirmed' | 'rejected') => {
  try {
    const bookingRef = doc(db, "bookings", bookingId);
    
    // CAMBIO: Sea confirmado o rechazado, solo actualizamos el campo.
    // Ya no borramos nada.
    await updateDoc(bookingRef, { status: newStatus });
    
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    return { success: false, error };
  }
};