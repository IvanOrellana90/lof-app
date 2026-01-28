import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// Gasto compartido individual
export interface SharedExpense {
  id: string;
  propertyId: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  createdAt: Date;
  updatedAt: Date;
}

// Tag de miembro (categoría con porcentaje predefinido)
export interface MemberTag {
  id: string;
  propertyId: string;
  name: string; // ej: "1ra Generación", "2da Generación"
  sharePercentage: number; // 0-100
  color: string; // Para UI (ej: "blue", "purple")
  createdAt: Date;
}

// División de miembros (tabla separada)
export interface MemberShare {
  id: string;
  propertyId: string;
  memberEmail: string;
  tagId?: string; // Referencia al tag (opcional)
  sharePercentage?: number; // Si usa tag, se calcula automáticamente
  customAmount?: number; // Override manual: monto fijo
  updatedAt: Date;
}

// --- SHARED EXPENSES ---

export const getSharedExpenses = async (propertyId: string): Promise<SharedExpense[]> => {
  const q = query(collection(db, "sharedExpenses"), where("propertyId", "==", propertyId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SharedExpense));
};

export const createSharedExpense = async (propertyId: string, expense: Omit<SharedExpense, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>) => {
  const payload = {
    ...expense,
    propertyId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
  const docRef = await addDoc(collection(db, "sharedExpenses"), payload);
  return { success: true, id: docRef.id };
};

export const deleteSharedExpense = async (expenseId: string) => {
  const docRef = doc(db, "sharedExpenses", expenseId);
  await deleteDoc(docRef);
  return { success: true };
};

// --- MEMBER TAGS ---

export const getMemberTags = async (propertyId: string): Promise<MemberTag[]> => {
  const q = query(collection(db, "memberTags"), where("propertyId", "==", propertyId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemberTag));
};

export const createMemberTag = async (propertyId: string, tag: Omit<MemberTag, 'id' | 'propertyId' | 'createdAt'>) => {
  const payload = {
    ...tag,
    propertyId,
    createdAt: Timestamp.now()
  };
  const docRef = await addDoc(collection(db, "memberTags"), payload);
  return { success: true, id: docRef.id };
};

export const deleteMemberTag = async (tagId: string) => {
  // Nota: Deberíamos verificar si hay shares usando este tag antes de borrar
  const docRef = doc(db, "memberTags", tagId);
  await deleteDoc(docRef);
  return { success: true };
};

// --- MEMBER SHARES ---

export const getMemberShares = async (propertyId: string): Promise<MemberShare[]> => {
  const q = query(collection(db, "memberShares"), where("propertyId", "==", propertyId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemberShare));
};

export const createMemberShare = async (propertyId: string, share: Omit<MemberShare, 'id' | 'propertyId' | 'updatedAt'>) => {
  const payload = {
    ...share,
    propertyId,
    updatedAt: Timestamp.now()
  };
  const docRef = await addDoc(collection(db, "memberShares"), payload);
  return { success: true, id: docRef.id };
};

export const updateMemberShare = async (shareId: string, updates: Partial<MemberShare>) => {
  const shareRef = doc(db, "memberShares", shareId);
  await updateDoc(shareRef, { ...updates, updatedAt: Timestamp.now() });
  return { success: true };
};

// --- CALCULATION LOGIC ---

export const calculateMemberPayments = (
  expenses: SharedExpense[],
  shares: MemberShare[],
  tags: MemberTag[]
): Record<string, number> => {
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const payments: Record<string, number> = {};

  shares.forEach(share => {
    // Prioridad 1: Monto custom (override manual)
    if (share.customAmount !== undefined && share.customAmount !== null) {
      payments[share.memberEmail] = share.customAmount;
    }
    // Prioridad 2: Tag asignado
    else if (share.tagId) {
      const tag = tags.find(t => t.id === share.tagId);
      if (tag) {
        payments[share.memberEmail] = (totalExpenses * tag.sharePercentage) / 100;
      } else {
        payments[share.memberEmail] = 0; // Tag no encontrado
      }
    }
    // Prioridad 3: Porcentaje directo (legacy or fallback)
    else if (share.sharePercentage !== undefined) {
      payments[share.memberEmail] = (totalExpenses * share.sharePercentage) / 100;
    } else {
      payments[share.memberEmail] = 0;
    }
  });

  return payments;
};
