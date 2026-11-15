import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/admin";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Second server-side check (the middleware already did one).
  const { data } = await supabaseServer().auth.getUser();
  if (!isAdmin(data.user?.email)) redirect("/login");
  return <Dashboard email={data.user!.email!} />;
}
