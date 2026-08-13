/**
 * Merges the two tenant knowledge bases:
 *  - tenant_config.knowledge_base            -- populated by the Training interview
 *    and Magic Import (file/website/social upload), read by the internal Assistant.
 *  - tenant_config.phone_agent_knowledge_base -- edited directly on the Phone Agent
 *    Knowledge Base card in Settings, dedicated to the real customer-facing agent.
 *
 * The two are intentionally separate columns/views so each can be viewed and edited
 * on its own, but every consumer reads the merged result so information learned on
 * either side automatically informs the other -- the cross-feed is structural, not
 * something the owner manages by hand. The Phone Agent's own KB wins per-field when
 * it has a non-empty value (it's the more deliberate, specific-to-real-calls source);
 * the general knowledge_base fills in anything left blank.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function mergeKnowledgeBases(
  kb: Record<string, any> | null | undefined,
  phoneKb: Record<string, any> | null | undefined
): Record<string, any> {
  const kbBiz    = (kb?.business as Record<string, string> | undefined) ?? {};
  const phoneBiz = (phoneKb?.business as Record<string, string> | undefined) ?? {};
  const phoneServices = (phoneKb?.services as unknown[] | undefined) ?? [];
  const kbServices    = (kb?.services as unknown[] | undefined) ?? [];

  return {
    services: phoneServices.length > 0 ? phoneServices : kbServices,
    faqs: (kb?.faqs as unknown[] | undefined) ?? [],
    business: {
      hours:         phoneBiz.hours         || kbBiz.hours         || "",
      address:       phoneBiz.address       || kbBiz.address       || "",
      bookingPolicy: phoneBiz.bookingPolicy || kbBiz.bookingPolicy || "",
      tone:          kbBiz.tone || "professional",
    },
    extra: [kb?.extra as string | undefined, phoneKb?.extra as string | undefined]
      .filter((s): s is string => !!s?.trim())
      .join("\n\n"),
  };
}
