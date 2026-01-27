import { collection, addDoc, getDocs, query, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
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
  totalCost: number,
  user: { uid: string, name: string }
) => {
  try {
    if (!range.from || !range.to) throw new Error("Fechas incompletas");

    const bookingPayload = {
      userId: user.uid,
      userName: user.name, 
      startDate: Timestamp.fromDate(range.from),
      endDate: Timestamp.fromDate(range.to),
      adults,
      children,
      totalCost,
      status: 'pending',
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
    // A. Pedimos las reservas
    const q = query(collection(db, "bookings"), orderBy("startDate", "asc"));
    const bookingsSnap = await getDocs(q);

    // B. Pedimos TODOS los usuarios para tener sus nombres actualizados
    // (Para una app familiar esto es muy rápido. Si escala mucho, se optimizaría después)
    const usersSnap = await getDocs(collection(db, "users"));
    const usersMap: Record<string, string> = {};
    
    usersSnap.forEach(doc => {
      const userData = doc.data();
      // Guardamos en un diccionario: { "uid_123": "Papá Ivan", ... }
      usersMap[doc.id] = userData.displayName || "Usuario";
    });

    console.log("📡 Reservas y Usuarios sincronizados");

    return bookingsSnap.docs.map(doc => {
      const data = doc.data();
      const startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date();
      const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date();

      // C. MAGIA AQUÍ: Usamos el nombre del mapa de usuarios, 
      // si no existe (ej: usuario borrado), usamos el que estaba guardado en la reserva como respaldo.
      const currentDisplayName = usersMap[data.userId] || data.userName || 'Usuario desconocido';

      return {
        id: doc.id,
        userId: data.userId,
        userName: currentDisplayName, // <--- Aquí inyectamos el nombre vivo
        status: data.status || 'confirmed',
        startDate: startDate,
        endDate: endDate
      } as Booking;
    });
  } catch (error) {
    console.error("🔥 Error al obtener reservas:", error);
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