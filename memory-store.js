/* ==========================================================================
   F.R.I.D.A.Y. // MEMORY STORE — Persistent Conversation & Preference Memory
   Uses IndexedDB for long-term local storage with transaction error handling
   and bounded context budgeting.
   ========================================================================== */

const DB_NAME = 'FridayMemoryDB';
const DB_VERSION = 1;

class MemoryStore {
  constructor() {
    this.db = null;
    this.ready = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Conversation history store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
          convStore.createIndex('timestamp', 'timestamp', { unique: false });
          convStore.createIndex('role', 'role', { unique: false });
        }

        // User preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }

        // Directives store (persistent task list)
        if (!db.objectStoreNames.contains('directives')) {
          db.createObjectStore('directives', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        console.log("🧠 F.R.I.D.A.Y. Memory Store initialized (IndexedDB)");
        resolve();
      };

      request.onerror = (e) => {
        console.warn("Memory Store init failed:", e);
        reject(request.error || e);
      };
    });
  }

  /* ----------------------------------------------------------------
     CONVERSATION HISTORY
     ---------------------------------------------------------------- */
  async saveMessage(role, text) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('conversations', 'readwrite');
      tx.onerror = () => reject(tx.error || new Error('Transaction error'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));

      const req = tx.objectStore('conversations').add({
        role,
        text,
        timestamp: Date.now()
      });
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve();
    });
  }

  async getRecentMessages(count = 20) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('conversations', 'readonly');
      tx.onerror = () => reject(tx.error || new Error('Transaction error'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));

      const store = tx.objectStore('conversations');
      const index = store.index('timestamp');
      const results = [];

      const cursorReq = index.openCursor(null, 'prev');
      cursorReq.onerror = () => reject(cursorReq.error);
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && results.length < count) {
          results.unshift(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  async searchMemory(query) {
    await this.ready;
    try {
      const all = await this.getAllMessages();
      const q = query.toLowerCase();
      return all.filter(m =>
        m.text && m.text.toLowerCase().includes(q)
      ).slice(-10); // Return last 10 matches
    } catch (e) {
      console.warn("searchMemory error:", e);
      return [];
    }
  }

  async getAllMessages() {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('conversations', 'readonly');
      tx.onerror = () => reject(tx.error || new Error('Transaction error'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));

      const request = tx.objectStore('conversations').getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getMessageCount() {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('conversations', 'readonly');
      tx.onerror = () => reject(tx.error || new Error('Transaction error'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));

      const request = tx.objectStore('conversations').count();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || 0);
    });
  }

  /* ----------------------------------------------------------------
     USER PREFERENCES
     ---------------------------------------------------------------- */
  async setPreference(key, value) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('preferences', 'readwrite');
      tx.onerror = () => reject(tx.error || new Error('Transaction error'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));

      const req = tx.objectStore('preferences').put({ key, value, updatedAt: Date.now() });
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve();
    });
  }

  async getPreference(key, defaultValue = null) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('preferences', 'readonly');
      tx.onerror = () => reject(tx.error || new Error('Transaction error'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));

      const request = tx.objectStore('preferences').get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value ?? defaultValue);
    });
  }

  /* ----------------------------------------------------------------
     PERSISTENT DIRECTIVES
     ---------------------------------------------------------------- */
  async saveDirectives(directives) {
    if (!Array.isArray(directives)) return Promise.reject(new TypeError("directives must be an array"));
    for (const d of directives) {
      if (!d || d.id === undefined || d.id === null) {
        return Promise.reject(new Error("Invalid directive ID"));
      }
    }

    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('directives', 'readwrite');
      tx.onerror = () => reject(tx.error || new Error('Transaction error'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));

      try {
        const store = tx.objectStore('directives');
        store.clear();
        directives.forEach(d => store.put(d));
      } catch (e) {
        tx.abort();
        return reject(e);
      }
      
      tx.oncomplete = () => resolve();
    });
  }

  async loadDirectives() {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('directives', 'readonly');
      tx.onerror = () => reject(tx.error || new Error('Transaction error'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));

      const request = tx.objectStore('directives').getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /* ----------------------------------------------------------------
     CONTEXT BUILDER (Bounded Budget for Gemini conversation memory)
     ---------------------------------------------------------------- */
  async buildConversationContext(maxMessages = 10, maxChars = 2000) {
    try {
      const recent = await this.getRecentMessages(maxMessages);
      if (!recent || recent.length === 0) return '';

      const lines = [];
      let totalChars = 0;

      // Work backwards from most recent to fit within budget
      for (let i = recent.length - 1; i >= 0; i--) {
        const m = recent[i];
        const role = m.role === 'user' ? 'User' : 'F.R.I.D.A.Y.';
        let cleanText = (m.text || '').trim();

        // If single message is too long, truncate it
        if (cleanText.length > 500) {
          cleanText = cleanText.slice(0, 500) + '...';
        }

        const formatted = `${role}: ${cleanText}`;
        if (totalChars + formatted.length + 1 > maxChars) {
          break; // Stop if exceeding budget
        }

        lines.unshift(formatted);
        totalChars += formatted.length + 1;
      }

      return lines.join('\n');
    } catch (e) {
      console.warn("buildConversationContext error:", e);
      return '';
    }
  }
}

export const memoryStore = new MemoryStore();
