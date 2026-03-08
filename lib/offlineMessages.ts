/**
 * Offline Message Queue
 * Manages pending messages when user is offline
 * Uses IndexedDB for persistence across sessions
 */

export interface PendingMessage {
  id: string;
  conversationId: string;
  userId: string;
  otherUserId: string;
  content: string;
  timestamp: number;
  status: 'pending' | 'sent' | 'failed';
}

const DB_NAME = 'findloove_offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_messages';

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Add message to offline queue
 */
export async function addPendingMessage(
  conversationId: string,
  userId: string,
  otherUserId: string,
  content: string
): Promise<PendingMessage> {
  const db = await openDB();
  const message: PendingMessage = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    conversationId,
    userId,
    otherUserId,
    content,
    timestamp: Date.now(),
    status: 'pending',
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(message);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(message);
  });
}

/**
 * Get all pending messages
 */
export async function getPendingMessages(): Promise<PendingMessage[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const messages = (request.result as PendingMessage[]).filter(
        (m) => m.status === 'pending'
      );
      resolve(messages);
    };
  });
}

/**
 * Get pending messages for specific conversation
 */
export async function getPendingMessagesForConversation(
  conversationId: string
): Promise<PendingMessage[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const messages = (request.result as PendingMessage[]).filter(
        (m) => m.conversationId === conversationId && m.status === 'pending'
      );
      resolve(messages);
    };
  });
}

/**
 * Mark message as sent
 */
export async function markMessageAsSent(messageId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(messageId);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const message = getRequest.result as PendingMessage;
      if (message) {
        message.status = 'sent';
        const updateRequest = store.put(message);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
  });
}

/**
 * Mark message as failed
 */
export async function markMessageAsFailed(messageId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(messageId);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const message = getRequest.result as PendingMessage;
      if (message) {
        message.status = 'failed';
        const updateRequest = store.put(message);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
  });
}

/**
 * Delete message from queue
 */
export async function deletePendingMessage(messageId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(messageId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear all pending messages
 */
export async function clearPendingMessages(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
