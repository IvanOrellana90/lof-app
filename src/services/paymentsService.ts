import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  deleteDoc,
  deleteField,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PaymentRecord, PaymentStatus } from '../types';
import { getPropertyById } from './propertyService';
import { getSharedExpenses, getMemberTags, getMemberShares, calculateMemberPayments } from './expensesService';
import { getBookings } from './bookingService';

const COLLECTION = 'propertyPayments';

// Helper: derive status from dates
export const deriveStatus = (dueDate?: string, paidDate?: string): PaymentStatus => {
  if (paidDate) return 'paid';
  if (!dueDate) return 'pending';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return due < today ? 'overdue' : 'pending';
};

// ---------- READ ----------
export const getPayments = async (propertyId: string): Promise<PaymentRecord[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('propertyId', '==', propertyId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      // Recompute status from source of truth dates
      status: deriveStatus(data.dueDate, data.paidDate),
    } as PaymentRecord;
  });
};

// ---------- CREATE ----------
export type CreatePaymentPayload = Omit<PaymentRecord, 'id' | 'propertyId' | 'status' | 'createdAt' | 'updatedAt'> & {
  createdAtOverride?: string;
};

export const createPayment = async (
  propertyId: string,
  payload: CreatePaymentPayload
): Promise<{ success: boolean; id?: string }> => {
  try {
    const status = deriveStatus(payload.dueDate, payload.paidDate);

    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    );

    let createdTimestamp = Timestamp.now();
    if (payload.createdAtOverride) {
      createdTimestamp = Timestamp.fromDate(new Date(`${payload.createdAtOverride}T12:00:00`));
      delete cleanPayload.createdAtOverride;
    }

    const docRef = await addDoc(collection(db, COLLECTION), {
      ...cleanPayload,
      propertyId,
      status,
      createdAt: createdTimestamp,
      updatedAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating payment:', error);
    return { success: false };
  }
};

// ---------- UPDATE ----------
export const updatePayment = async (
  paymentId: string,
  updates: Partial<CreatePaymentPayload>
): Promise<{ success: boolean }> => {
  try {
    const status = deriveStatus(updates.dueDate, updates.paidDate);

    // Firestore does not accept `undefined` — use deleteField() to remove paidDate
    const paidDateValue = updates.paidDate !== undefined && updates.paidDate !== ''
      ? updates.paidDate
      : deleteField();

    // Strip out all other undefined values
    const cleanUpdates: Record<string, any> = Object.fromEntries(
      Object.entries({
        ...updates,
        paidDate: paidDateValue,
        status, // Always update status based on current dates
      }).filter(([_, v]) => v !== undefined)
    );

    if (updates.createdAtOverride) {
      cleanUpdates.createdAt = Timestamp.fromDate(new Date(`${updates.createdAtOverride}T12:00:00`));
      delete cleanUpdates.createdAtOverride;
    }

    await updateDoc(doc(db, COLLECTION, paymentId), {
      ...cleanUpdates,
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating payment:', error);
    return { success: false };
  }
};

// ---------- DELETE ----------
export const deletePayment = async (paymentId: string): Promise<{ success: boolean }> => {
  try {
    await deleteDoc(doc(db, COLLECTION, paymentId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting payment:', error);
    return { success: false };
  }
};

// ---------- MARK AS PAID ----------
export const markPaymentAsPaid = async (
  paymentId: string,
  paidDate: string
): Promise<{ success: boolean }> => {
  try {
    await updateDoc(doc(db, COLLECTION, paymentId), {
      paidDate,
      status: 'paid',
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    return { success: false };
  }
};

// ---------- SYNC MONTHLY EXPENSES TO PAYMENTS ----------
// Auto-generates pending payment records for each member based on their
// shared expenses + booking costs for the specified month.
// Uses syncId to prevent duplicate entries.
export const syncMonthlyExpensesToPayments = async (
  propertyId: string,
  year: number,
  month: number
): Promise<{ success: boolean; created: number; skipped: number }> => {
  try {
    // Fetch all required data in parallel
    const [property, expensesData, tagsData, sharesData, bookingsData] = await Promise.all([
      getPropertyById(propertyId),
      getSharedExpenses(propertyId),
      getMemberTags(propertyId),
      getMemberShares(propertyId),
      getBookings(propertyId),
    ]);

    if (!property?.allowedEmails?.length) {
      return { success: true, created: 0, skipped: 0 };
    }

    const allowedEmails = property.allowedEmails as string[];

    // Filter shared expenses active for the given month
    const filteredExpenses = expensesData.filter(exp => {
      if (!exp.createdAt) return false;
      const createdDate = new Date(exp.createdAt);
      const createdYear = createdDate.getFullYear();
      const createdMonth = createdDate.getMonth() + 1;

      if (exp.frequency === 'one-time') {
        return createdYear === year && createdMonth === month;
      }
      return createdYear < year || (createdYear === year && createdMonth <= month);
    });

    // Calculate shared expense amounts per member
    const sharedPayments = calculateMemberPayments(filteredExpenses, sharesData, tagsData, allowedEmails);

    // We need userId→email mapping to match bookings correctly,
    // since Booking only has userId (not email). Use getAllUsers to build the map.
    const { getAllUsers } = await import('./userService');
    const usersData = await getAllUsers();
    const emailToUid: Record<string, string> = {};
    for (const u of usersData) {
      if (u.email) emailToUid[u.email.toLowerCase()] = u.uid;
    }

    // Calculate booking amounts per member for the target month
    const bookingAmounts: Record<string, number> = {};


    for (const email of allowedEmails) {
      const uid = emailToUid[email.toLowerCase()];
      if (!uid) continue;
      const memberBookings = bookingsData.filter(b => {
        if (b.userId !== uid || b.status !== 'confirmed') return false;
        const startDate = new Date(b.startDate);
        const endDate = new Date(b.endDate);
        return (
          (startDate.getFullYear() === year && startDate.getMonth() + 1 === month) ||
          (endDate.getFullYear() === year && endDate.getMonth() + 1 === month) ||
          (startDate < new Date(year, month - 1, 1) && endDate > new Date(year, month, 0))
        );
      });
      bookingAmounts[email] = memberBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);
    }

    // Due date = last day of the sync month
    const lastDay = new Date(year, month, 0); // month is 1-based, so month,0 = last day
    const dueDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    const monthStr = String(month).padStart(2, '0');

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthLabel = monthNames[month - 1];

    let created = 0;
    let skipped = 0;

    for (const email of allowedEmails) {
      const sharedAmt = sharedPayments[email] || 0;
      const bookingAmt = bookingAmounts[email] || 0;
      const totalAmt = sharedAmt + bookingAmt;

      if (totalAmt <= 0) {
        skipped++;
        continue;
      }

      const syncId = `expense_sync_${email.toLowerCase()}_${year}-${monthStr}`;

      // Check for existing payment with this syncId to prevent duplicates
      const existingQ = query(
        collection(db, COLLECTION),
        where('propertyId', '==', propertyId),
        where('syncId', '==', syncId)
      );
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        skipped++;
        continue;
      }

      const user = usersData.find(u => u.email?.toLowerCase() === email.toLowerCase());
      const displayName = user?.displayName || email;

      await addDoc(collection(db, COLLECTION), {
        propertyId,
        title: `Cuota ${monthLabel} ${year} — ${displayName}`,
        description: `Gastos compartidos: $${sharedAmt.toLocaleString('es-CL')}\nArriendos: $${bookingAmt.toLocaleString('es-CL')}`,
        amount: Math.round(totalAmt),
        type: 'incoming' as const,
        category: 'Cuota Mensual',
        dueDate,
        status: 'pending' as const,
        syncId,
        notes: `Generado automáticamente para ${email}`,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      created++;
    }

    return { success: true, created, skipped };
  } catch (error) {
    console.error('Error syncing monthly expenses to payments:', error);
    return { success: false, created: 0, skipped: 0 };
  }
};

