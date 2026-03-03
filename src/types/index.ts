// src/types/index.ts

export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  monthlyFixedFee: number; // En lugar de "cuotaFija"
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  startDate: string; // ISO String es mejor para DB (2024-03-01)
  endDate: string;
  status: 'confirmed' | 'pending_payment' | 'cancelled';
  totalCost: number;
  guestCount: {
    adults: number;
    children: number;
  };
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  paidByUserId: string;
  date: string;
  proofUrl?: string; // URL de la foto de la boleta
}

export type NotificationType =
  | 'booking_request'
  | 'booking_approved'
  | 'booking_cancelled'
  | 'new_expense'
  | 'added_to_property';

export interface Notification {
  id: string;
  userId: string; // Recipient
  type: NotificationType;
  data?: {
    bookingId?: string;
    expenseId?: string;
    propertyName?: string;
    userName?: string;
  };
  isRead: boolean;
  createdAt: any; // Firestore Timestamp
}

// --- PAYMENTS ---

export type PaymentType =
  | 'outgoing_external'
  | 'outgoing_recurring'
  | 'outgoing_unique'
  | 'incoming';

export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface PaymentRecord {
  id: string;
  propertyId: string;
  title: string;
  description?: string;
  amount: number;
  type: PaymentType;
  category?: string;
  dueDate?: string; // ISO date string YYYY-MM-DD
  paidDate?: string; // ISO date string, set when marked as paid
  status: PaymentStatus;
  notes?: string;
  syncId?: string; // Used for auto-generated payments to prevent duplicates
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
}