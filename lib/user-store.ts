import { ref, set, get, push } from "firebase/database";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  createdAt: number;
}

/**
 * Create a new user in Firebase RTDB at /users/{id}
 * Password is hashed with bcrypt before storing.
 */
export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role?: string;
}): Promise<UserRecord> {
  const { email, name, password, role = "admin" } = input;

  // Check if user already exists
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const usersRef = ref(db, "users");
  const newRef = push(usersRef);
  const id = newRef.key!;

  const record: UserRecord = {
    id,
    email: email.toLowerCase(),
    name,
    passwordHash,
    role,
    createdAt: Date.now(),
  };

  await set(newRef, {
    email: record.email,
    name: record.name,
    passwordHash: record.passwordHash,
    role: record.role,
    createdAt: record.createdAt,
  });

  return record;
}

/**
 * Find a user by email in Firebase RTDB.
 */
export async function findUserByEmail(
  email: string
): Promise<UserRecord | null> {
  const usersRef = ref(db, "users");
  const snap = await get(usersRef);
  if (!snap.exists()) return null;

  const users = snap.val() as Record<string, any>;
  for (const id of Object.keys(users)) {
    if (users[id].email?.toLowerCase() === email.toLowerCase()) {
      return { ...users[id], id };
    }
  }
  return null;
}
