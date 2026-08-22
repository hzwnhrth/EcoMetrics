import { NextResponse } from "next/server";
import { addEvidence, deleteEvidence, updateEvidence } from "@/lib/store";
import { can, denyReason, getSessionUser } from "@/lib/auth";
import type { Confidence, Evidence, Pillar } from "@/lib/types";

export const dynamic = "force-dynamic";

// Evidence CRUD (QA item 6). Manager and above only — evidence is the ground
// truth every rule runs on. Rules/indicators recompute on next read, so no
// cache to invalidate.

const PILLARS: Pillar[] = ["E", "S", "G"];
const CONFIDENCES: Confidence[] = ["verified", "estimated", "inferred"];

function invalid(body: Partial<Evidence>, partial: boolean): string | null {
  const need = (k: keyof Evidence) => !partial || body[k] !== undefined;
  if (need("source_file") && typeof body.source_file !== "string") return "source_file required";
  if (need("source_ref") && (typeof body.source_ref !== "string" || !body.source_ref.trim()))
    return "source_ref must not be empty — a fact you cannot point back to is not evidence";
  if (need("pillar") && !PILLARS.includes(body.pillar as Pillar)) return "pillar must be E, S or G";
  if (need("field") && (typeof body.field !== "string" || !body.field.trim())) return "field required";
  if (need("value") && typeof body.value !== "string") return "value must be a string";
  if (need("unit") && typeof body.unit !== "string") return "unit must be a string";
  if (need("confidence") && !CONFIDENCES.includes(body.confidence as Confidence))
    return "confidence must be verified, estimated or inferred";
  if (body.period !== undefined && body.period !== null && typeof body.period !== "string")
    return "period must be a string or null";
  return null;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!can(user, "manage_evidence")) {
    return NextResponse.json({ error: denyReason(user, "manage_evidence") }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as Partial<Evidence> | null;
  if (!body) return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  const err = invalid(body, false);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const created = await addEvidence({
    source_file: body.source_file!,
    source_ref: body.source_ref!,
    pillar: body.pillar as Pillar,
    field: body.field!,
    value: body.value!,
    unit: body.unit!,
    period: body.period ?? null,
    confidence: body.confidence as Confidence,
    note: body.note,
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!can(user, "manage_evidence")) {
    return NextResponse.json({ error: denyReason(user, "manage_evidence") }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as ({ id?: string } & Partial<Evidence>) | null;
  if (!body?.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { id, ...patch } = body;
  const err = invalid(patch, true);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const row = await updateEvidence(id, patch);
  if (!row) return NextResponse.json({ error: "evidence row not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!can(user, "manage_evidence")) {
    return NextResponse.json({ error: denyReason(user, "manage_evidence") }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const ok = await deleteEvidence(id);
  if (!ok) return NextResponse.json({ error: "evidence row not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
