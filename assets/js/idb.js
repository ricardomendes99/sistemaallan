// idb.js — wrapper mínimo de IndexedDB (sem dependências)
// Usado pelo db.js para persistir o cache offline ('kv') e a fila de
// sincronização ('outbox'). Carregar SEMPRE antes de db.js.
const IDB = (() => {
  const NAME = 'rdo-offline';
  const VERSION = 1;
  let _dbp = null;

  function _open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: '_key', autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function _db() { return _dbp || (_dbp = _open()); }

  function _run(store, mode, fn) {
    return _db().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const os = tx.objectStore(store);
      const req = fn(os);
      let out;
      if (req) req.onsuccess = () => { out = req.result; };
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }

  return {
    get:   (store, key)      => _run(store, 'readonly',  os => os.get(key)),
    set:   (store, key, val) => _run(store, 'readwrite', os => os.put(val, key)),
    add:   (store, val)      => _run(store, 'readwrite', os => os.add(val)),
    del:   (store, key)      => _run(store, 'readwrite', os => os.delete(key)),
    all:   (store)           => _run(store, 'readonly',  os => os.getAll()),
    count: (store)           => _run(store, 'readonly',  os => os.count()),
    clear: (store)           => _run(store, 'readwrite', os => os.clear()),
  };
})();
