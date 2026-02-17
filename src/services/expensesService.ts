import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { notificationService } from './notificationService';
import { getPropertyById } from './propertyService';
import { getUserBookings } from './bookingService';
import { getDocs as getDocsFirestore, query as queryFirestore, collection as collectionFirestore, where as whereFirestore } from 'firebase/firestore';

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
  fixedFee?: number;
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
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as SharedExpense;
  });
};

export const createSharedExpense = async (propertyId: string, expense: Omit<SharedExpense, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>) => {
  const payload = {
    ...expense,
    propertyId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
  const docRef = await addDoc(collection(db, "sharedExpenses"), payload);

  // Notificar a todos los miembros de la propiedad
  try {
    const property = await getPropertyById(propertyId);
    if (property && property.allowedEmails) {
      // Buscar UIDs de los usuarios por email
      const usersQuery = queryFirestore(
        collectionFirestore(db, "users"),
        whereFirestore("email", "in", property.allowedEmails)
      );
      const usersSnap = await getDocsFirestore(usersQuery);

      for (const userDoc of usersSnap.docs) {
        await notificationService.createNotification({
          userId: userDoc.id,
          type: 'new_expense',
          data: {
            expenseId: docRef.id,
            propertyName: property.name,
            userName: expense.name // Usamos el nombre del gasto en el mensaje
          }
        });
      }
    }
  } catch (error) {
    console.error("Error sending expense notifications:", error);
  }

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
  try {
    const lowerEmail = share.memberEmail.toLowerCase();

    // ✅ VERIFICAR DUPLICADOS ANTES DE CREAR
    const sharesRef = collection(db, "memberShares");
    const q = query(
      sharesRef,
      where("propertyId", "==", propertyId),
      where("memberEmail", "==", lowerEmail),
      where("tagId", "==", share.tagId || null)
    );

    const existingShares = await getDocs(q);

    if (!existingShares.empty) {
      // Ya existe un share idéntico, actualizar en lugar de crear
      console.warn("⚠️ Share duplicado detectado, actualizando existente");
      const existingId = existingShares.docs[0].id;

      await updateMemberShare(existingId, share);

      return {
        success: true,
        id: existingId,
        wasUpdated: true // Indicar que fue actualizado, no creado
      };
    }

    // No existe duplicado, crear nuevo
    const payload = {
      ...share,
      memberEmail: lowerEmail,
      propertyId,
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, "memberShares"), payload);

    return {
      success: true,
      id: docRef.id,
      wasUpdated: false
    };

  } catch (error) {
    console.error("Error creating member share:", error);
    return { success: false, error };
  }
};

export const updateMemberShare = async (shareId: string, updates: Partial<MemberShare>) => {
  try {
    const shareRef = doc(db, "memberShares", shareId);
    const data = { ...updates };

    if (data.memberEmail) {
      data.memberEmail = data.memberEmail.toLowerCase();
    }

    await updateDoc(shareRef, {
      ...data,
      updatedAt: Timestamp.now()
    });

    return { success: true };

  } catch (error) {
    console.error("Error updating member share:", error);
    return { success: false, error };
  }
};

// --- CALCULATION LOGIC ---

export const calculateMemberPayments = (
  expenses: SharedExpense[],
  shares: MemberShare[],
  tags: MemberTag[],
  allowedEmails: string[]
): Record<string, number> => {
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const payments: Record<string, number> = {};

  // Filtrar solo los miembros que están actualmente permitidos en la propiedad
  const activeShares = shares.filter(share => allowedEmails.includes(share.memberEmail));

  // 1. Contar miembros por tag para dividir el % del grupo (solo miembros activos)
  const tagMembers: Record<string, Set<string>> = {};

  activeShares.forEach(share => {
    if (share.tagId) {
      if (!tagMembers[share.tagId]) {
        tagMembers[share.tagId] = new Set();
      }
      tagMembers[share.tagId].add(share.memberEmail);
    }
  });

  const tagCounts: Record<string, number> = {};
  Object.keys(tagMembers).forEach(tagId => {
    tagCounts[tagId] = tagMembers[tagId].size;
  });

  console.log("tagCounts (unique members)", tagCounts);
  console.log("tagMembers", Object.fromEntries(
    Object.entries(tagMembers).map(([k, v]) => [k, Array.from(v)])
  ));

  const processedEmails = new Set<string>();

  activeShares.forEach(share => {
    // Evitar procesar el mismo email dos veces
    if (processedEmails.has(share.memberEmail)) {
      return; // Skip duplicados
    }

    if (share.customAmount !== undefined && share.customAmount !== null) {
      payments[share.memberEmail] = share.customAmount;
    }
    else if (share.tagId) {
      const tag = tags.find(t => t.id === share.tagId);
      if (tag) {
        const memberCount = tagCounts[share.tagId] || 1;
        const variablePart = ((totalExpenses * tag.sharePercentage) / 100) / memberCount;
        const fixedPart = tag.fixedFee || 0;
        payments[share.memberEmail] = Math.round(variablePart + fixedPart);
      } else {
        payments[share.memberEmail] = 0;
      }
    }
    else if (share.sharePercentage !== undefined) {
      payments[share.memberEmail] = Math.round((totalExpenses * share.sharePercentage) / 100);
    } else {
      payments[share.memberEmail] = 0;
    }

    processedEmails.add(share.memberEmail);
  });

  return payments;
};

// --- GLOBAL (DASHBOARD) ---

export interface UserGlobalExpense {
  propertyId: string;
  propertyName: string;
  amount: number;
  tagName: string;
  sharePercentage: number;
  fixedFee: number;
  isCustom: boolean;
  sharedAmount: number;
  bookingAmount: number;
}

export const getUserGlobalExpenses = async (userId: string, email: string): Promise<UserGlobalExpense[]> => {
  try {
    const emailLower = email.toLowerCase();

    // 1. Buscamos participaciones y reservas del usuario en paralelo
    const [sharesSnap, userBookings] = await Promise.all([
      getDocs(query(collection(db, "memberShares"), where("memberEmail", "==", emailLower))),
      getUserBookings(userId)
    ]);

    const userShares = sharesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemberShare));

    if (userShares.length === 0 && userBookings.length === 0) return [];

    // 2. Agrupamos todas las propiedades involucradas
    const propertyIds = Array.from(new Set([
      ...userShares.map(s => s.propertyId),
      ...userBookings.map(b => b.propertyId)
    ]));

    // 3. Obtenemos datos de cada propiedad en paralelo
    const globalExpenses: UserGlobalExpense[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    for (const propertyId of propertyIds) {
      try {
        const [prop, allExpenses, allTags] = await Promise.all([
          getPropertyById(propertyId),
          getSharedExpenses(propertyId),
          getMemberTags(propertyId)
        ]);

        if (!prop) continue;

        // A. CÁLCULO DE GASTOS COMPARTIDOS
        const currentMonthExpenses = allExpenses.filter(exp => {
          if (!exp.createdAt) return false;
          const createdDate = new Date(exp.createdAt);
          const createdYear = createdDate.getFullYear();
          const createdMonth = createdDate.getMonth() + 1;

          if (exp.frequency === 'one-time') {
            return createdYear === currentYear && createdMonth === currentMonth;
          }
          return createdYear < currentYear || (createdYear === currentYear && createdMonth <= currentMonth);
        });

        const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const userPropertyShares = userShares.filter(s => s.propertyId === propertyId);

        let sharedAmount = 0;
        let tagName = "General";
        let sharePct = 0;
        let fixed = 0;
        let isCustom = false;

        for (const share of userPropertyShares) {
          if (share.customAmount !== undefined && share.customAmount !== null) {
            sharedAmount += share.customAmount;
            isCustom = true;
          } else if (share.tagId) {
            const tag = allTags.find(t => t.id === share.tagId);
            if (tag) {
              tagName = tag.name;
              sharePct = tag.sharePercentage;
              fixed = tag.fixedFee || 0;

              const qTagMembers = query(
                collection(db, "memberShares"),
                where("propertyId", "==", propertyId),
                where("tagId", "==", share.tagId)
              );
              const tagMembersSnap = await getDocs(qTagMembers);
              const count = tagMembersSnap.docs.filter(d => prop.allowedEmails.includes(d.data().memberEmail)).length || 1;

              const variablePart = ((totalExpenses * tag.sharePercentage) / 100) / count;
              sharedAmount += (variablePart + fixed);
            }
          } else if (share.sharePercentage !== undefined) {
            sharePct = share.sharePercentage;
            sharedAmount += (totalExpenses * share.sharePercentage) / 100;
          }
        }

        // B. CÁLCULO DE RESERVAS CONFIRMADAS
        const monthBookings = userBookings.filter(b => {
          if (b.propertyId !== propertyId || b.status !== 'confirmed') return false;

          const startDate = new Date(b.startDate);
          const endDate = new Date(b.endDate);

          // Verificar si la reserva cae en el mes seleccionado (hoy)
          const isThisMonth = (
            (startDate.getFullYear() === currentYear && startDate.getMonth() + 1 === currentMonth) ||
            (endDate.getFullYear() === currentYear && endDate.getMonth() + 1 === currentMonth) ||
            (startDate < new Date(currentYear, currentMonth - 1, 1) && endDate > new Date(currentYear, currentMonth, 0))
          );

          return isThisMonth;
        });

        const bookingAmount = monthBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);

        // Solo agregar si hay algún gasto (compartido o reserva)
        if (sharedAmount > 0 || bookingAmount > 0) {
          globalExpenses.push({
            propertyId,
            propertyName: prop.name,
            amount: Math.round(sharedAmount + bookingAmount),
            tagName,
            sharePercentage: sharePct,
            fixedFee: fixed,
            isCustom,
            sharedAmount: Math.round(sharedAmount),
            bookingAmount: Math.round(bookingAmount)
          });
        }
      } catch (err) {
        console.error(`Error calculating global expenses for property ${propertyId}:`, err);
      }
    }

    return globalExpenses;
  } catch (error) {
    console.error("Error getting user global expenses:", error);
    return [];
  }
};
