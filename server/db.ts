import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGO_DB_URI) {
  throw new Error(
    "MONGO_DB_URI must be set. Did you forget to provision a MongoDB database?",
  );
}

const client = new MongoClient(process.env.MONGO_DB_URI);

// Connect to MongoDB
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  try {
    if (!db) {
      await client.connect();
      db = client.db();
      console.log("Connected to MongoDB successfully");
    }
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

// Export db getter (will be available after connection)
export function getDb(): Db {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  return db;
}

// Export client for closing connection if needed
export { client };
