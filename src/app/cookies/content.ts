import type { LegalSection } from "@/components/legal/LegalDoc";

export const COOKIES_INTRO =
  "This Cookie Policy explains how Vela (\"we\", \"us\", or \"our\") uses cookies, local storage, and similar browser storage technologies across our website, dashboard, AI chat widget, and the websites you build and publish with the Service (together, the \"Service\"). It should be read alongside our Privacy Policy, which explains how we handle personal information more generally.";

export const COOKIES_SECTIONS: LegalSection[] = [
  {
    id: "what-this-policy-covers",
    title: "1. What This Policy Covers",
    blocks: [
      { type: "p", text: "This policy was written from a direct technical review of what Vela's own code actually stores in your browser, rather than from a generic template. It reflects our production application as it exists at the time this policy was last updated, and distinguishes clearly between cookies, browser local storage, and browser session storage, since these behave differently even though they are often grouped together under \"cookies\" in everyday language." },
      { type: "p", text: "\"Cookies\" are small pieces of data that a website asks your browser to store and send back on later requests to that same site. \"Local storage\" and \"session storage\" are similar browser storage mechanisms that a website's own code can read and write directly; unlike cookies, they are not automatically sent to a server with every request. Session storage is cleared when you close the browser tab; local storage persists until it is cleared." },
    ],
  },
  {
    id: "the-short-version",
    title: "2. The Short Version",
    blocks: [
      { type: "p", text: "We do not use advertising cookies, third party analytics trackers, or marketing pixels anywhere in the Service, including on our own website, in the dashboard, in the AI chat widget, or on websites built with the Service. We do not use Google Analytics, Meta Pixel, or any comparable advertising or cross site tracking technology. The storage we do use falls into three categories: an authentication cookie that keeps you signed in, a small number of local storage entries that remember your preferences and in-progress work, and, only when a Vela Customer chooses to connect WhatsApp as a Connected Channel from their dashboard, a script and cookie set by Meta Platforms, Inc. as part of that specific connection flow. Each is described in detail below." },
    ],
  },
  {
    id: "strictly-necessary-cookies",
    title: "3. Strictly Necessary Cookies",
    blocks: [
      { type: "p", text: "The Service uses one strictly necessary cookie, set by our authentication provider, Supabase, to keep you signed in to your Vela Account across page loads and to identify which requests come from your authenticated session. Without this cookie, the dashboard and any feature that requires you to be logged in would not function, so it cannot be switched off while you use the Service. This cookie does not track you across other websites and is not used for advertising." },
      {
        type: "table",
        headers: ["Name pattern", "Purpose", "Set by", "Duration"],
        rows: [
          ["sb-*-auth-token", "Keeps you signed in to your Vela Account", "Vela, via Supabase (first party)", "Until you sign out or the session expires"],
        ],
      },
    ],
  },
  {
    id: "functional-local-storage",
    title: "4. Functional Local Storage",
    blocks: [
      { type: "p", text: "The dashboard and our public website use browser local storage, not cookies, to remember your interface preferences and certain in-progress work, so that the Service behaves the way you left it the next time you open it. None of these entries are sent to a server automatically; our own application code reads them only when needed to render the interface. The following is a complete list of the local storage keys our code sets, based on a direct review of the codebase:" },
      {
        type: "table",
        headers: ["Key", "Purpose"],
        rows: [
          ["vela_theme", "Remembers whether you prefer light or dark mode"],
          ["vela_lang", "Remembers your preferred language for the dashboard interface"],
          ["vela_site_language", "Remembers the selected language while building a website"],
          ["vela_profile", "Caches basic profile display information so the interface can render without a delay"],
          ["vela_onboarding", "Tracks your progress through the initial account setup steps"],
          ["vela_onboarding_banner_dismissed", "Remembers that you closed the onboarding banner, so it does not reappear"],
          ["vela_training_banner_dismissed", "Remembers that you closed the AI training reminder banner"],
          ["vela_notif_settings", "Remembers your notification display preferences"],
          ["vela_ai_config", "Caches AI Agent configuration state while you edit it"],
          ["vela_business_type", "Remembers your selected business type from onboarding"],
          ["vela_embed_assistant", "Remembers the state of the in-dashboard Vela Assistant widget"],
          ["vela_last_app_route", "Remembers the last dashboard page you were on, so returning to the app can resume there"],
          ["wb-chat-width", "Remembers the width you set for the chat panel in the Website Builder"],
          ["wb-left-panel-width", "Remembers the width you set for the side panel in the Website Builder"],
        ],
      },
      { type: "p", text: "We also use one browser session storage entry, cleared automatically when you close the tab, to avoid repeatedly re-triggering the same resume-session behavior within a single browser session." },
      {
        type: "table",
        headers: ["Key", "Storage type", "Purpose"],
        rows: [
          ["vela_app_resumed", "Session storage", "Prevents the app from re-running its resume-last-route logic more than once per browser tab session"],
        ],
      },
    ],
  },
  {
    id: "chat-widget-storage",
    title: "5. Storage on Websites Built With Vela",
    blocks: [
      { type: "p", text: "If you build and publish a website using the Service, and it includes the embeddable AI chat widget, the widget stores a conversation identifier in the visiting End Customer's browser using local storage, keyed to the specific website and business, for example in the form vela_conv_[tenant]_[website]. This lets an End Customer's conversation with the AI Agent persist correctly if they close and reopen the chat widget or navigate between pages on that site, rather than starting a new conversation every time. This entry is not a cookie, is not sent automatically to any server, is not shared across different websites, and is not used to track a visitor across other, unrelated sites." },
    ],
  },
  {
    id: "website-visitor-analytics",
    title: "6. Website Visitor Analytics",
    blocks: [
      { type: "p", text: "For websites built with the Service, we record aggregate visit statistics, such as visit counts, device type, approximate country, and referring page, so that our Customers can see traffic and engagement for their own site in their dashboard. This is implemented without a tracking cookie: a visitor is counted using a one way cryptographic hash generated from their IP address and browser type at the time of the visit, and that hash is used only to avoid double counting a visit, not to build an ongoing profile of that visitor or to track them elsewhere. No identifying value is placed in the visitor's browser for this purpose." },
    ],
  },
  {
    id: "third-party-cookies",
    title: "7. Third Party Cookies and Scripts",
    blocks: [
      { type: "p", text: "The Service does not load third party advertising, analytics, or tracking scripts on our own website, in the dashboard, in the AI chat widget, or on websites built with the Service. There is one specific, narrow exception, described below, which only ever occurs inside the authenticated dashboard and only for a Customer who takes a specific action." },
      {
        type: "sub",
        title: "7.1 Meta JavaScript SDK (WhatsApp Connection Only)",
        blocks: [
          { type: "p", text: "When a Customer opens the \"Connect WhatsApp\" option on the Channels page of their dashboard, our code loads Meta's own JavaScript SDK directly from Meta's servers (connect.facebook.net) to power Meta's Embedded Signup flow, and initializes it with cookie support enabled, consistent with how Meta's SDK is designed to be used. This means that, only for a Customer who is signed in to their own Vela Account and who deliberately opens this specific connection flow, Meta may set a cookie on Meta's own domain as part of managing that flow. This script is not loaded anywhere else in the Service, is never loaded for an End Customer or an ordinary visitor to a Customer's website, and is not used by Vela for tracking or advertising purposes; it exists solely to let a Customer authorize their own WhatsApp Business connection through Meta's official flow. Any cookie set by this script is governed by Meta's own cookie and privacy practices, not by Vela." },
          { type: "p", text: "Connecting Instagram, by contrast, takes you to Meta's own authorization page in your browser rather than loading Meta's SDK inside the Vela dashboard; while you are on Meta's site, Meta's own cookies and policies apply, in the same way they would if you visited facebook.com or instagram.com directly." },
        ],
      },
      {
        type: "sub",
        title: "7.2 Stock Photography and Hosting Infrastructure",
        blocks: [
          { type: "p", text: "Images used in websites built with the Service may be served directly from Unsplash's content delivery network. Loading an image from a third party server is a standard part of how the web works and may, depending on the provider, involve minimal server side logging by that provider as part of delivering the image; it does not involve Vela placing any additional tracking script or pixel on the page. Similarly, our hosting provider, Vercel, may log technical request information as part of operating its infrastructure, as described in our Privacy Policy; this is a function of how any web server operates, not a cookie or tracking technology chosen by Vela." },
        ],
      },
    ],
  },
  {
    id: "no-consent-banner-and-why",
    title: "8. Why There Is No Cookie Consent Banner",
    blocks: [
      { type: "p", text: "Under GDPR, the ePrivacy Directive, and comparable laws, a cookie consent banner with granular accept and reject controls is required when a website uses non essential cookies, such as advertising or analytics cookies that are not necessary to provide the service the visitor asked for. Based on the direct technical review summarized in this policy, the Service does not use any non essential, non functional cookies: the only cookie we set is the strictly necessary authentication cookie described in Section 3, and the only third party cookie that can occur is the narrow, action triggered Meta SDK case described in Section 7.1, which is not something an ordinary visitor or End Customer ever encounters. Because none of our own storage is used for advertising, cross site tracking, or optional analytics, a consent banner is not currently required, and we have not added one, rather than adding one that would offer a choice that does not actually change what is collected." },
      { type: "note", text: "If this changes in the future, for example if we introduce optional analytics or advertising cookies, we will update this Cookie Policy and implement a genuine consent mechanism before any such non essential cookie is set, with a way to withdraw consent that is at least as easy as giving it." },
    ],
  },
  {
    id: "managing-storage",
    title: "9. Managing Cookies and Local Storage Yourself",
    blocks: [
      { type: "p", text: "Most browsers let you view, delete, and block cookies and site data through their settings, and let you clear local storage for a specific site. Because the authentication cookie described in Section 3 is required to remain signed in, blocking or deleting it will sign you out of your Vela Account. Clearing local storage for the Service will reset the interface preferences described in Section 4 to their defaults and, if done on a page where the chat widget described in Section 5 is embedded, may start a new conversation the next time an End Customer opens that widget." },
      { type: "p", text: "Because we do not use advertising or cross site tracking cookies, there is no advertising opt out to configure for the Service itself; any browser level \"do not track\" or global privacy control setting you have enabled is respected in the sense that we have nothing additional to disable, since we do not track you across sites in the first place." },
    ],
  },
  {
    id: "changes-to-this-policy",
    title: "10. Changes to This Cookie Policy",
    blocks: [
      { type: "p", text: "We may update this Cookie Policy as the Service changes, including if we add or remove a storage technology described here. We will update the \"Last updated\" date at the top of this policy when we do, and if a change means we begin using a non essential cookie for the first time, we will implement consent as described in Section 8 before that change takes effect, not after." },
    ],
  },
  {
    id: "contact",
    title: "11. Contact",
    blocks: [
      { type: "p", text: "If you have questions about this Cookie Policy or about the storage technologies described in it, contact us at velaOsSupport@gmail.com." },
    ],
  },
];
