import { createBrowserClient } from "@supabase/ssr";

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          owner_id: string;
          business_name: string;
          industry: string | null;
          city: string | null;
          phone: string | null;
          website: string | null;
          plan: "starter" | "pro" | "premium";
          stripe_customer_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenants"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
      };
      tenant_config: {
        Row: {
          tenant_id: string;
          services_json: Array<{ name: string; price?: string; description?: string }>;
          faq_json: Array<{ question: string; answer: string }>;
          tone: string;
          language: string;
          booking_rules: Record<string, unknown>;
        };
        Insert: Partial<Database["public"]["Tables"]["tenant_config"]["Row"]> & { tenant_id: string };
        Update: Partial<Database["public"]["Tables"]["tenant_config"]["Row"]>;
      };
      leads: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          channel: "instagram" | "whatsapp" | "website";
          status: "new" | "contacted" | "qualified" | "booked" | "client";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["leads"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
      };
      conversations: {
        Row: {
          id: string;
          tenant_id: string;
          lead_id: string | null;
          channel: string;
          customer_name: string;
          ai_enabled: boolean;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["conversations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
      appointments: {
        Row: {
          id: string;
          tenant_id: string;
          lead_id: string | null;
          conversation_id: string | null;
          service_name: string;
          datetime: string | null;
          status: "pending" | "confirmed" | "cancelled";
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["appointments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
      };
      automations: {
        Row: {
          id: string;
          tenant_id: string;
          type: string;
          trigger: string;
          action: Record<string, unknown>;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["automations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["automations"]["Insert"]>;
      };
    };
  };
};

/** Browser client — use in Client Components */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for convenience in client components
let _client: ReturnType<typeof createSupabaseBrowserClient> | null = null;
export function getSupabase() {
  if (!_client) _client = createSupabaseBrowserClient();
  return _client;
}
