import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where, // <--- IMPORTANTE: Necesitamos 'where' para filtrar
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { notificationService } from './notificationService';
import { getPropertyById } from './propertyService';
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

    // Notificar a los administradores de la propiedad
    const property = await getPropertyById(propertyId);
    if (property && property.admins) {
      for (const adminId of property.admins) {
        if (adminId !== user.uid) { // No notificarse a sí mismo si es admin
          await notificationService.createNotification({
            userId: adminId,
            type: 'booking_request',
            data: {
              bookingId: docRef.id,
              userName: user.name,
              propertyName: property.name
            }
          });
        }
      }
    }

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

    // Notificar al usuario que solicitó la reserva
    const bookingSnap = await getDoc(bookingRef);
    if (bookingSnap.exists()) {
      const bookingData = bookingSnap.data();
      await notificationService.createNotification({
        userId: bookingData.userId,
        type: newStatus === 'confirmed' ? 'booking_approved' : 'booking_cancelled',
        data: {
          bookingId: bookingId,
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    return { success: false, error };
  }
};

export const updateBooking = async (
  bookingId: string,
  range: DateRange,
  adults: number,
  children: number,
  totalCost: number,
  selectedOptionalFees: string[] = []
) => {
  try {
    if (!range.from || !range.to) throw new Error("Fechas incompletas");

    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, {
      startDate: Timestamp.fromDate(range.from),
      endDate: Timestamp.fromDate(range.to),
      adults,
      children,
      totalCost,
      selectedOptionalFees,
      status: 'pending', // Siempre vuelve a pendiente tras editar
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error("Error al actualizar reserva:", error);
    return { success: false, error };
  }
};