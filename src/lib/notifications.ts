// Real in-app notifications -- new lead, new appointment booked, missed call.
// Called from the same server-side event handlers that already create these
// records (ai/reply, call-webhook, submit-form), never a separate poller.

export type NotificationType = "lead" | "appointment" | "missed_call";

export interface CreateNotificationInput {
  tenantId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
}

const CHANNEL_LABELS: Record<string, string> = {
  website:   "Website",
  whatsapp:  "WhatsApp",
  instagram: "Instagram",
  phone:     "Phone",
};

export function channelLabel(channel?: string | null): string {
  if (!channel) return "your website";
  return CHANNEL_LABELS[channel] ?? channel;
}

// Never throws -- a notification failing to save must never break the real
// event (lead/appointment/call) it is describing. Same defensive pattern as
// webhook_logs and marketing_generations history writes elsewhere.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createNotification(admin: any, input: CreateNotificationInput): Promise<void> {
  try {
    const { error } = await admin.from("notifications").insert({
      tenant_id: input.tenantId,
      type:      input.type,
      title:     input.title,
      body:      input.body ?? null,
      link:      input.link ?? null,
    });
    if (error) {
      console.error("[notifications] insert failed:", error.code, error.message);
    }
  } catch (err) {
    console.error("[notifications] insert threw:", err instanceof Error ? err.message : err);
  }
}
