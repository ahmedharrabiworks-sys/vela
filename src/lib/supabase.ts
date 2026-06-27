import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          owner_id: string;
          business_name: string;
          plan: "starter" | "pro" | "premium";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenants"]["Row"], "id" | "created_at">;
      };
      tenant_config: {
        Row: {
          tenant_id: string;
          services_json: Record<string, string>[];
          faq_json: Record<string, string>[];
          tone: string;
          language: string;
          booking_rules: Record<string, unknown>;
        };
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
      };
      conversations: {
        Row: {
          id: string;
          tenant_id: string;
          lead_id: string;
          channel: string;
          created_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          tenant_id: string;
          lead_id: string;
          datetime: string;
          status: "pending" | "confirmed" | "cancelled";
          notes: string | null;
        };
      };
      automations: {
        Row: {
          id: string;
          tenant_id: string;
          type: string;
          trigger: string;
          action: Record<string, unknown>;
          active: boolean;
        };
      };
    };
  };
};
