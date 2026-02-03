import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where, // <--- IMPORTANTE: Necesitamos 'where' para filtrar
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { type DateRange } from 'react-day-picker';

export interface Booking {
  id: string;
  propertyId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'confirmed' | 'rejected';
  totalCost: number;
  adults: number;
  children: number;
  selectedOptionalFees: string[];
}

// 1. Crear Reserva (AHORA RECIBE propertyId)
export const createBooking = async (
  propertyId: string,
  range: DateRange,
  adults: number,
  children: number,
  totalCost: number,
  user: { uid: string, name: string },
  selectedOptionalFees: string[] = [] // Nuevo parámetro
) => {
  try {
    if (!range.from || !range.to) throw new Error("Fechas incompletas");

    const bookingPayload = {
      propertyId,
      userId: user.uid,
      userName: user.name,
      startDate: Timestamp.fromDate(range.from),
      endDate: Timestamp.fromDate(range.to),
      adults,
      children,
      totalCost,
      selectedOptionalFees, // Guardamos la selección
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

export const deleteBooking = async (bookingId: string) => {
  try {
    const bookingRef = doc(db, "bookings", bookingId);
    await deleteDoc(bookingRef);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar reserva:", error);
    return { success: false, error };
  }
};

// 2. Obtener Reservas (FILTRADAS POR PROPIEDAD)
export const getBookings = async (propertyId: string): Promise<Booking[]> => {
  try {
    // A. Query filtrada: Solo reservas de ESTA propiedad
    const q = query(
      collection(db, "bookings"),
      where("propertyId", "==", propertyId), // <--- FILTRO CLAVE
      orderBy("startDate", "asc")
    );

    const bookingsSnap = await getDocs(q);

    // B. Pedimos usuarios (Esto se mantiene igual para resolver nombres)
    const usersSnap = await getDocs(collection(db, "users"));
    const usersMap: Record<string, { name: string, email: string }> = {};
    usersSnap.forEach(doc => {
      const userData = doc.data();
      usersMap[doc.id] = {
        name: userData.displayName || "Usuario",
        email: userData.email || ""
      };
    });

    return bookingsSnap.docs.map(doc => {
      const data = doc.data();
      const startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date();
      const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date();

      const userData = usersMap[data.userId];
      const currentDisplayName = userData?.name || data.userName || 'Usuario desconocido';
      const currentUserEmail = userData?.email || '';

      return {
        id: doc.id,
        propertyId: data.propertyId,
        userId: data.userId,
        userName: currentDisplayName,
        userEmail: currentUserEmail,
        status: data.status || 'confirmed',
        startDate: startDate,
        endDate: endDate,
        totalCost: data.totalCost || 0,
        adults: data.adults || 1,
        children: data.children || 0,
        selectedOptionalFees: data.selectedOptionalFees || []
      } as Booking;
    });
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    return [];
  }
};

// 3. Update (Este se mantiene IGUAL porque el ID de reserva es único globalmente)
export const updateBookingStatus = async (bookingId: string, newStatus: 'confirmed' | 'rejected') => {
  try {
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, { status: newStatus });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    return { success: false, error };
  }
};