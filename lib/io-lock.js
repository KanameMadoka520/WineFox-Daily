const locks = new Map();
const waitQueues = new Map();

/**
 * Acquires a lock for the given file path.
 * This ensures sequential execution of IO operations for the same file.
 * @param {string} filePath
 * @returns {Promise<void>} Resolves when the lock is acquired.
 */
async function acquireLock(filePath) {
  if (!locks.get(filePath)) {
    locks.set(filePath, true);
    return;
  }

  return new Promise(resolve => {
    if (!waitQueues.has(filePath)) {
      waitQueues.set(filePath, []);
    }
    waitQueues.get(filePath).push(resolve);
  });
}

/**
 * Releases the lock for the given file path, allowing the next queued operation to proceed.
 * @param {string} filePath
 */
function releaseLock(filePath) {
  if (waitQueues.has(filePath) && waitQueues.get(filePath).length > 0) {
    const next = waitQueues.get(filePath).shift();
    // Pass the lock to the next in queue by resolving its promise
    next();
  } else {
    locks.set(filePath, false);
  }
}

/**
 * Executes a function after acquiring a lock for the specified file path,
 * and automatically releases the lock when the function completes (or throws).
 * @param {string} filePath
 * @param {Function} fn Function to execute while lock is held
 * @returns {Promise<any>}
 */
async function withLock(filePath, fn) {
  await acquireLock(filePath);
  try {
    return await fn();
  } finally {
    releaseLock(filePath);
  }
}

module.exports = {
  acquireLock,
  releaseLock,
  withLock
};