import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function getAuthAndTenant(req: NextRequest) {
  void req;
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    return { user, tenant };
  } catch {
    return { error: "Account setup required", status: 500 };
  }
}

export async function GET(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { tenant } = result;

  const admin = createSupabaseAdmin() as any;
  const { data, error } = await admin
    .from("agent_calls")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ calls: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ calls: data ?? [] });
}

export async function POST(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { tenant } = result;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const admin = createSupabaseAdmin() as any;

  const { data, error } = await admin
    .from("agent_calls")
    .insert({
      tenant_id:          tenant.id,
      call_type:          body.call_type ?? "training",
      ended_at:           body.ended_at ?? new Date().toISOString(),
      duration_seconds:   body.duration_seconds ?? null,
      language:           body.language ?? null,
      caller_number:      (body.caller_number as string | undefined) ?? null,
      transcript:         body.transcript ?? [],
      summary:            body.summary ?? null,
      outcome:            body.outcome ?? "completed",
      kb_extracted:       body.kb_extracted ?? null,
      appointment_booked: (body.appointment_booked as Record<string,unknown> | undefined) ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json(
        { error: "Table not found. Run the agent_calls SQL migration." },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: (data as any)?.id });
}
