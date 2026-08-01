/**
 * Seed script — creates an admin user in Firebase RTDB.
 *
 * Usage:
 *   npx tsx scripts/seed-user.ts
 *
 * Or with node:
 *   node --loader tsx scripts/seed-user.ts
 *
 * Or compile and run:
 *   npx tsx scripts/seed-user.ts
 */
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set } from "firebase/database";
import bcrypt from "bcryptjs";

const firebaseConfig = {
  apiKey: "AIzaSyBkLtROgX1UntSndnNsUzq5hmp1_D1uzpw",
  authDomain: "quasaratrack.firebaseapp.com",
  databaseURL: "https://quasaratrack-default-rtdb.firebaseio.com",
  projectId: "quasaratrack",
  storageBucket: "quasaratrack.firebasestorage.app",
  messagingSenderId: "30452171514",
  appId: "1:30452171514:web:372624a8caad6f43a07f43",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function seedUser() {
  const email = "admin@quasara.com";
  const name = "Admin";
  const password = "admin123";
  const role = "admin";

  const passwordHash = await bcrypt.hash(password, 10);
  const usersRef = ref(db, "users");
  const newRef = push(usersRef);

  await set(newRef, {
    email,
    name,
    passwordHash,
    role,
    createdAt: Date.now(),
  });

  console.log("✅ Admin user created in Firebase RTDB:");
  console.log("   Email:", email);
  console.log("   Password:", password);
  console.log("   Role:", role);
  console.log("   ID:", newRef.key);
  process.exit(0);
}

seedUser().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
