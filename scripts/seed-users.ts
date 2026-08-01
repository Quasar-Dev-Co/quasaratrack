/**
 * Seed script — creates 3 admin users in Firebase RTDB.
 *
 * Usage: npx tsx scripts/seed-users.ts
 */
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, remove, push, set } from "firebase/database";
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

const users = [
  {
    name: "Pravas Chandra Sarkar",
    email: "pravas@quasartrack.com",
    password: "002451Ps.",
    role: "admin",
  },
  {
    name: "JH AKASH",
    email: "akash@quasartrack.com",
    password: "12345678a@",
    role: "admin",
  },
  {
    name: "Tamra",
    email: "info@quasarasoft.com",
    password: "Quasara2026$",
    role: "admin",
  },
];

async function seedUsers() {
  // Clear existing users first
  const existingRef = ref(db, "users");
  const existingSnap = await get(existingRef);
  if (existingSnap.exists()) {
    console.log("⚠ Clearing existing users...");
    await remove(existingRef);
  }

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const newRef = push(ref(db, "users"));
    await set(newRef, {
      email: u.email.toLowerCase(),
      name: u.name,
      passwordHash,
      role: u.role,
      createdAt: Date.now(),
    });
    console.log(`✅ Created: ${u.name} (${u.email}) — ID: ${newRef.key}`);
  }

  console.log("\n📋 All 3 admin users created successfully!");
  users.forEach((u) => {
    console.log(`   ${u.name}`);
    console.log(`      Email: ${u.email}`);
    console.log(`      Password: ${u.password}`);
    console.log(`      Role: ${u.role}`);
  });

  process.exit(0);
}

seedUsers().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
