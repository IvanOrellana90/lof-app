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