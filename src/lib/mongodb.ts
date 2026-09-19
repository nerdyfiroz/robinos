import { MongoClient, Db } from 'mongodb';

const uri =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  process.env.MONGODB_URL ||
  '';

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDatabase(): Promise<Db> {
  if (!uri) {
    throw new Error(
      'MongoDB connection string is missing. Please set MONGODB_URI, DATABASE_URL, or MONGODB_URL in your environment variables.'
    );
  }
  const client = await clientPromise;
  return client.db();
}

export default clientPromise;

