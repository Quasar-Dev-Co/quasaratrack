export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";

// GET — load settings
export async function GET() {
  try {
    const snap = await get(ref(db, "settings/ai"));
    const data = snap.val() || {};
    return NextResponse.json({
      aiApiKey: data.aiApiKey ? "••••••••" + data.aiApiKey.slice(-4) : "",
      hasKey: !!data.aiApiKey,
      idleThreshold: data.idleThreshold || "5",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — save settings
export async function POST(request: NextRequest) {
  try {
    const { aiApiKey, idleThreshold } = await request.json();

    const updates: Record<string, string> = {};
    if (typeof aiApiKey === "string" && aiApiKey.trim() && !aiApiKey.startsWith("•••")) {
      updates.aiApiKey = aiApiKey.trim();
    }
    if (typeof idleThreshold === "string" && idleThreshold.trim()) {
      updates.idleThreshold = idleThreshold.trim();
    }

    if (Object.keys(updates).length > 0) {
      await set(ref(db, "settings/ai"), updates);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
