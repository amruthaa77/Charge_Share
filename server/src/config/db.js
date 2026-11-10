import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXED_DB_PATH = path.resolve(__dirname, '../../.db_data');

let memoryServer = null;

export const connectDB = async (uri) => {
  const mongoURI = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chargeshare_india';
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Database] Local MongoDB not detected (${error.message}).`);
      console.log('[Database] Initializing embedded MongoDB server for instant zero-setup development...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');

        if (!fs.existsSync(FIXED_DB_PATH)) {
          fs.mkdirSync(FIXED_DB_PATH, { recursive: true });
        }

        // Attempt to clean stale lock files from previous unclean process exits
        try {
          const lockFile = path.join(FIXED_DB_PATH, 'mongod.lock');
          const wtLock = path.join(FIXED_DB_PATH, 'WiredTiger.lock');
          if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
          if (fs.existsSync(wtLock)) fs.unlinkSync(wtLock);
        } catch {
          // If locked by another active process or inaccessible, continue
        }

        try {
          memoryServer = await MongoMemoryServer.create({
            instance: {
              dbPath: process.env.NODE_ENV === 'test' ? undefined : FIXED_DB_PATH,
              storageEngine: process.env.NODE_ENV === 'test' ? 'ephemeralForTest' : 'wiredTiger',
            },
          });
        } catch (storageErr) {
          console.warn('[Database] Persistent store busy or locked, falling back to embedded memory instance:', storageErr.message);
          memoryServer = await MongoMemoryServer.create();
        }

        const memUri = memoryServer.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`[Database] Embedded in-memory MongoDB active: ${memUri}`);
        return conn;
      } catch (memErr) {
        console.error('[Database Error] Failed to start embedded MongoDB:', memErr.message);
        throw error;
      }
    }
    console.error(`[Database Error] ${error.message}`);
    throw error;
  }
};

export const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (memoryServer) {
    await memoryServer.stop();
  }
};
