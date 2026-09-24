// Feature flags — MVP scope-down (Phase 1 of the pivot). Each flag gates
// visibility only: the feature's pages, components, and DB tables are left
// completely untouched, so restoring one later is flipping its value back
// to true, never a rebuild. Consumed by the Sidebar (nav visibility) and
// middleware (direct-URL access) — see both for how a false flag is
// enforced.
export const MARKETING_ENABLED = false;
export const LEADS_CRM_ENABLED = false;
export const ANALYTICS_ENABLED = false;
export const WEBSITE_BUILDER_ENABLED = false;
