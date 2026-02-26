import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    where,
    Timestamp,
    doc,
    deleteDoc,
    updateDoc,
    getDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface CommunityComment {
    id: string;
    topicId: string;
    userId: string;
    userName: string;
    userPhoto?: string;
    content: string;
    createdAt: Date;
}

export interface CommunityTopic {
    id: string;
    propertyId: string;
    title: string;
    content: string;
    userId: string;
    userName: string;
    userPhoto?: string;
    createdAt: Date;
    commentsCount: number;
    pinned: boolean;
}

// ─── Topics ────────────────────────────────────

export const getTopics = async (propertyId: string): Promise<CommunityTopic[]> => {
    try {
        const q = query(
            collection(db, 'communityTopics'),
            where('propertyId', '==', propertyId),
            orderBy('createdAt', 'desc')
        );

        const snap = await getDocs(q);

        const topics = snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                propertyId: data.propertyId,
                title: data.title,
                content: data.content,
                userId: data.userId,
                userName: data.userName,
                userPhoto: data.userPhoto || undefined,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                commentsCount: data.commentsCount || 0,
                pinned: data.pinned || false,
            } as CommunityTopic;
        });

        // Pinned topics first, then by createdAt desc
        return topics.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
    } catch (error) {
        console.error('Error fetching topics:', error);
        return [];
    }
};

export const createTopic = async (
    propertyId: string,
    title: string,
    content: string,
    user: { uid: string; displayName?: string | null; photoURL?: string | null }
) => {
    try {
        const payload = {
            propertyId,
            title,
            content,
            userId: user.uid,
            userName: user.displayName || 'Usuario',
            userPhoto: user.photoURL || null,
            commentsCount: 0,
            pinned: false,
            createdAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, 'communityTopics'), payload);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating topic:', error);
        return { success: false, error };
    }
};

export const deleteTopic = async (topicId: string) => {
    try {
        // Delete all comments of this topic first
        const commentsQuery = query(
            collection(db, 'communityComments'),
            where('topicId', '==', topicId)
        );
        const commentsSnap = await getDocs(commentsQuery);
        const deletePromises = commentsSnap.docs.map(d => deleteDoc(doc(db, 'communityComments', d.id)));
        await Promise.all(deletePromises);

        // Delete the topic
        await deleteDoc(doc(db, 'communityTopics', topicId));
        return { success: true };
    } catch (error) {
        console.error('Error deleting topic:', error);
        return { success: false, error };
    }
};

export const togglePinTopic = async (topicId: string, currentPinned: boolean) => {
    try {
        const topicRef = doc(db, 'communityTopics', topicId);
        await updateDoc(topicRef, { pinned: !currentPinned });
        return { success: true };
    } catch (error) {
        console.error('Error toggling pin:', error);
        return { success: false, error };
    }
};

export const getPinnedTopics = async (propertyId: string): Promise<CommunityTopic[]> => {
    try {
        const q = query(
            collection(db, 'communityTopics'),
            where('propertyId', '==', propertyId),
            where('pinned', '==', true)
        );

        const snap = await getDocs(q);

        return snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                propertyId: data.propertyId,
                title: data.title,
                content: data.content,
                userId: data.userId,
                userName: data.userName,
                userPhoto: data.userPhoto || undefined,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                commentsCount: data.commentsCount || 0,
                pinned: true,
            } as CommunityTopic;
        });
    } catch (error) {
        console.error('Error fetching pinned topics:', error);
        return [];
    }
};

// ─── Comments ──────────────────────────────────

export const getComments = async (topicId: string): Promise<CommunityComment[]> => {
    try {
        const q = query(
            collection(db, 'communityComments'),
            where('topicId', '==', topicId),
            orderBy('createdAt', 'asc')
        );

        const snap = await getDocs(q);

        return snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                topicId: data.topicId,
                userId: data.userId,
                userName: data.userName,
                userPhoto: data.userPhoto || undefined,
                content: data.content,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            } as CommunityComment;
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
};

export const addComment = async (
    topicId: string,
    content: string,
    user: { uid: string; displayName?: string | null; photoURL?: string | null }
) => {
    try {
        const payload = {
            topicId,
            userId: user.uid,
            userName: user.displayName || 'Usuario',
            userPhoto: user.photoURL || null,
            content,
            createdAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, 'communityComments'), payload);

        // Increment commentsCount on the topic
        const topicRef = doc(db, 'communityTopics', topicId);
        const topicSnap = await getDoc(topicRef);
        if (topicSnap.exists()) {
            const currentCount = topicSnap.data().commentsCount || 0;
            await updateDoc(topicRef, { commentsCount: currentCount + 1 });
        }

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding comment:', error);
        return { success: false, error };
    }
};

export const deleteComment = async (commentId: string, topicId: string) => {
    try {
        await deleteDoc(doc(db, 'communityComments', commentId));

        // Decrement commentsCount on the topic
        const topicRef = doc(db, 'communityTopics', topicId);
        const topicSnap = await getDoc(topicRef);
        if (topicSnap.exists()) {
            const currentCount = topicSnap.data().commentsCount || 0;
            await updateDoc(topicRef, { commentsCount: Math.max(0, currentCount - 1) });
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting comment:', error);
        return { success: false, error };
    }
};
