import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  type DocumentData
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Vertical, OperationalSettings, VerticalOperationalParams } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const sanitizeId = (id: string) => id.replace(/\//g, '___');
const desanitizeId = (id: string) => id.replace(/___/g, '/');

export const verticalDataService = {
  async getAll() {
    const path = 'verticalData';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      const data: Record<string, any> = {};
      querySnapshot.forEach((doc) => {
        const originalId = desanitizeId(doc.id);
        data[originalId] = doc.data();
      });
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return {};
    }
  },

  async saveVertical(verticalId: string, settings: OperationalSettings, params: VerticalOperationalParams) {
    const sanitizedId = sanitizeId(verticalId);
    const path = `verticalData/${sanitizedId}`;
    try {
      await setDoc(doc(db, 'verticalData', sanitizedId), {
        settings,
        params,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};

export const globalSettingsService = {
  async getExecCapacity() {
    const path = 'settings/global';
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'global'));
      if (docSnap.exists()) {
        return docSnap.data().execCapacity as number;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveExecCapacity(value: number) {
    const path = 'settings/global';
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        execCapacity: value,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
