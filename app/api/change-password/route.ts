import { NextRequest, NextResponse } from "next/server";
import { ref, get, update } from "firebase/database";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated session
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Get user ID from session
    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 400 }
      );
    }

    // Fetch user from Firebase RTDB
    const userRef = ref(db, `users/${userId}`);
    const snap = await get(userRef);

    if (!snap.exists()) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = snap.val();

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash new password and update in Firebase RTDB
    const newHash = await bcrypt.hash(newPassword, 10);
    await update(userRef, { passwordHash: newHash });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to change password" },
      { status: 500 }
    );
  }
}
