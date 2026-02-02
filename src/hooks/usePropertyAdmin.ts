// hooks/usePropertyAdmin.ts
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export const usePropertyAdmin = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { user } = useAuth();
  const [isPropertyAdmin, setIsPropertyAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPropertyAdmin = async () => {
      if (!user || !propertyId) {
        setIsPropertyAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const propertyRef = doc(db, "properties", propertyId);
        const propertySnap = await getDoc(propertyRef);

        if (propertySnap.exists()) {
          const data = propertySnap.data();
          const admins = data.admins || [];
          setIsPropertyAdmin(admins.includes(user.uid));
        } else {
          setIsPropertyAdmin(false);
        }
      } catch (error) {
        console.error("Error checking property admin:", error);
        setIsPropertyAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkPropertyAdmin();
  }, [user, propertyId]);

  return { isPropertyAdmin, loading };
};