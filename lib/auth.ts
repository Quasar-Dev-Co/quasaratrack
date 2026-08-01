import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import bcrypt from "bcryptjs";

interface RTDBUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email = credentials?.email as string | undefined;
          const password = credentials?.password as string | undefined;

          if (!email || !password) {
            return null;
          }

          // Look up user in Firebase RTDB by email
          const usersRef = ref(db, "users");
          const snap = await get(usersRef);

          if (!snap.exists()) {
            console.error("[auth] No users found in Firebase");
            return null;
          }

          const users = snap.val() as Record<string, RTDBUser>;
          let matchedUser: RTDBUser | null = null;

          for (const userId of Object.keys(users)) {
            const u = users[userId];
            if (u.email?.toLowerCase() === email.toLowerCase()) {
              matchedUser = { ...u, id: userId };
              break;
            }
          }

          if (!matchedUser) {
            console.error("[auth] No user found for email:", email);
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(
            password,
            matchedUser.passwordHash
          );

          if (!isValid) {
            console.error("[auth] Password mismatch for:", email);
            return null;
          }

          return {
            id: matchedUser.id,
            email: matchedUser.email,
            name: matchedUser.name,
            role: matchedUser.role,
          } as any;
        } catch (error) {
          console.error("[auth] Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
