import { NextRequest, NextResponse } from "next/server";
import { ref, update } from "firebase/database";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    const { employeeId, name, role, department, email } = await request.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400 }
      );
    }

    const updates: Record<string, string> = {};
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (typeof role === "string") updates.role = role.trim();
    if (typeof department === "string") updates.department = department.trim();
    if (typeof email === "string") updates.email = email.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await update(ref(db, `employees/${employeeId}/profile`), updates);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update employee";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
