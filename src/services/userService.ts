import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export const getAllUsers = async (): Promise<UserData[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      email: doc.data().email,
      displayName: doc.data().displayName,
      photoURL: doc.data().photoURL
    })) as UserData[];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};
