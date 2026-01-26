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