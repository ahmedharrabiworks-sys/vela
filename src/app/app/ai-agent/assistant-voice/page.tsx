import { redirect } from "next/navigation";

export default function AssistantVoiceRedirect() {
  redirect("/app/ai-agent/assistant-settings");
}
