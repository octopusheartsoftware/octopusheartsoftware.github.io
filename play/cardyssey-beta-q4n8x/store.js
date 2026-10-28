// Saves adventures in this browser's own storage (IndexedDB). Nothing leaves the device.

const DB_NAME = 'cardyssey', STORE = 'adventures';
let opening = null;

function db() {
  opening ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opening;
}

async function run(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
  });
}

export const saveAdventure = (adv) => run('readwrite', (s) => s.put(adv));
export const loadAdventure = (id) => run('readonly', (s) => s.get(id));
export const listAdventures = () => run('readonly', (s) => s.getAll());
export const deleteAdventure = (id) => run('readwrite', (s) => s.delete(id));

// Ask the browser to keep our storage even when the computer runs low on space.
export async function askToKeep() {
  try {
    if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* older browsers: autosave still works, just without the promise */ }
}
