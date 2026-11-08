import { redirect } from "next/navigation";

export default function AssistantSettingsRedirect() {
  redirect("/app/ai-agent/settings");
}
