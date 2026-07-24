// Template library — defines section structure only. No colours, fonts, or copy.
// GPT fills content; the generator enforces structure server-side.

export type TemplateSection = {
  type: string;     // must match an existing section type in the renderer
  variant: string;  // must match an existing variant (or "" for types without variants)
  imageSlots: number;
  required: boolean;
};

export type SiteTemplate = {
  id: string;
  category: string;
  label: string;
  sections: TemplateSection[];
};

// ── 10 templates, 2 per category ──────────────────────────────────────────────

export const TEMPLATES: SiteTemplate[] = [

  // ── medical ─────────────────────────────────────────────────────────────────

  {
    id: "medical-clinical",
    category: "medical",
    label: "Medical Clinical",
    sections: [
      { type: "hero",          variant: "split-left",     imageSlots: 1, required: true  },
      { type: "service-list",  variant: "two-column",     imageSlots: 0, required: true  },
      { type: "team-grid",     variant: "",               imageSlots: 0, required: false },
      { type: "stats-band",    variant: "",               imageSlots: 0, required: false },
      { type: "faq-accordion", variant: "",               imageSlots: 0, required: true  },
      { type: "contact-block", variant: "split-form",     imageSlots: 0, required: true  },
    ],
  },

  {
    id: "medical-warm",
    category: "medical",
    label: "Medical Warm",
    sections: [
      { type: "hero",          variant: "split-right",    imageSlots: 1, required: true  },
      { type: "about-story",   variant: "",               imageSlots: 1, required: true  },
      { type: "service-list",  variant: "bordered-cards", imageSlots: 0, required: true  },
      { type: "gallery-grid",  variant: "uniform",        imageSlots: 4, required: false },
      { type: "team-grid",     variant: "",               imageSlots: 0, required: false },
      { type: "contact-block", variant: "split-form",     imageSlots: 0, required: true  },
    ],
  },

  // ── hospitality ──────────────────────────────────────────────────────────────

  {
    id: "hospitality-editorial",
    category: "hospitality",
    label: "Hospitality Editorial",
    sections: [
      { type: "hero",          variant: "centered-overlay", imageSlots: 1, required: true  },
      { type: "about-story",   variant: "",                 imageSlots: 1, required: true  },
      { type: "listings-grid", variant: "wide-rows",        imageSlots: 3, required: false },
      { type: "gallery-grid",  variant: "masonry",          imageSlots: 6, required: false },
      { type: "contact-block", variant: "split-form",       imageSlots: 0, required: true  },
    ],
  },

  {
    id: "hospitality-modern",
    category: "hospitality",
    label: "Hospitality Modern",
    sections: [
      { type: "hero",          variant: "editorial-offset", imageSlots: 1, required: true  },
      { type: "feature-grid",  variant: "three-cards",      imageSlots: 0, required: true  },
      { type: "listings-grid", variant: "uniform-grid",     imageSlots: 4, required: false },
      { type: "gallery-grid",  variant: "uniform",          imageSlots: 4, required: false },
      { type: "cta-band",      variant: "",                 imageSlots: 0, required: true  },
      { type: "contact-block", variant: "centered-form",    imageSlots: 0, required: true  },
    ],
  },

  // ── retail ───────────────────────────────────────────────────────────────────

  {
    id: "retail-catalog",
    category: "retail",
    label: "Retail Catalog",
    sections: [
      { type: "hero",          variant: "split-left",    imageSlots: 1, required: true  },
      { type: "product-grid",  variant: "",              imageSlots: 6, required: true  },
      { type: "feature-grid",  variant: "three-cards",   imageSlots: 0, required: true  },
      { type: "gallery-grid",  variant: "uniform",       imageSlots: 4, required: false },
      { type: "cta-band",      variant: "",              imageSlots: 0, required: true  },
      { type: "contact-block", variant: "centered-form", imageSlots: 0, required: true  },
    ],
  },

  {
    id: "retail-editorial",
    category: "retail",
    label: "Retail Editorial",
    sections: [
      { type: "hero",          variant: "centered-overlay", imageSlots: 1, required: true  },
      { type: "about-story",   variant: "",                 imageSlots: 1, required: true  },
      { type: "product-grid",  variant: "",                 imageSlots: 6, required: true  },
      { type: "gallery-grid",  variant: "masonry",          imageSlots: 6, required: false },
      { type: "contact-block", variant: "centered-form",    imageSlots: 0, required: true  },
    ],
  },

  // ── saas ─────────────────────────────────────────────────────────────────────

  {
    id: "saas-product",
    category: "saas",
    label: "SaaS Product",
    sections: [
      { type: "hero",             variant: "split-left",       imageSlots: 1, required: true  },
      { type: "logo-strip",       variant: "",                 imageSlots: 0, required: false },
      { type: "feature-showcase", variant: "",                 imageSlots: 3, required: true  },
      { type: "feature-grid",     variant: "asymmetric-bento", imageSlots: 0, required: true  },
      { type: "pricing-tiers",    variant: "cards-row",        imageSlots: 0, required: false },
      { type: "faq-accordion",    variant: "",                 imageSlots: 0, required: true  },
      { type: "cta-band",         variant: "",                 imageSlots: 0, required: true  },
      { type: "contact-block",    variant: "centered-form",    imageSlots: 0, required: true  },
    ],
  },

  {
    id: "saas-minimal",
    category: "saas",
    label: "SaaS Minimal",
    sections: [
      { type: "hero",             variant: "minimal-stacked",  imageSlots: 0, required: true  },
      { type: "stats-band",       variant: "",                 imageSlots: 0, required: false },
      { type: "feature-grid",     variant: "numbered-list",    imageSlots: 0, required: true  },
      { type: "feature-showcase", variant: "",                 imageSlots: 3, required: true  },
      { type: "pricing-tiers",    variant: "comparison-table", imageSlots: 0, required: false },
      { type: "faq-accordion",    variant: "",                 imageSlots: 0, required: true  },
      { type: "contact-block",    variant: "centered-form",    imageSlots: 0, required: true  },
    ],
  },

  // ── professional ─────────────────────────────────────────────────────────────

  {
    id: "professional-authority",
    category: "professional",
    label: "Professional Authority",
    sections: [
      { type: "hero",          variant: "split-left",     imageSlots: 1, required: true  },
      { type: "about-story",   variant: "",               imageSlots: 1, required: true  },
      { type: "service-list",  variant: "editorial-rows", imageSlots: 0, required: true  },
      { type: "process-steps", variant: "",               imageSlots: 0, required: true  },
      { type: "team-grid",     variant: "",               imageSlots: 0, required: false },
      { type: "contact-block", variant: "split-form",     imageSlots: 0, required: true  },
    ],
  },

  {
    id: "professional-portfolio",
    category: "professional",
    label: "Professional Portfolio",
    sections: [
      { type: "hero",          variant: "editorial-offset", imageSlots: 1, required: true  },
      { type: "listings-grid", variant: "masonry",          imageSlots: 6, required: false },
      { type: "about-story",   variant: "",                 imageSlots: 1, required: true  },
      { type: "process-steps", variant: "",                 imageSlots: 0, required: true  },
      { type: "contact-block", variant: "split-form",       imageSlots: 0, required: true  },
    ],
  },
];

// ── Lookup helpers ─────────────────────────────────────────────────────────────

export const TEMPLATE_BY_CATEGORY: Record<string, SiteTemplate[]> = {};
for (const t of TEMPLATES) {
  (TEMPLATE_BY_CATEGORY[t.category] ??= []).push(t);
}

export const TEMPLATE_BY_ID: Record<string, SiteTemplate> =
  Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

// Map existing GPT category values → template category
export const GPT_CATEGORY_TO_TEMPLATE: Record<string, string> = {
  hotel:      "hospitality",
  restaurant: "hospitality",
  clinic:     "medical",
  medical:    "medical",
  gym:        "professional",
  salon:      "retail",
  realestate: "professional",
  saas:       "saas",
  agency:     "saas",
  ecommerce:  "retail",
  education:  "professional",
  legal:      "professional",
  consulting: "professional",
  other:      "professional",
};

// Sections whose data must be checked before including (optional skip rules)
export const OPTIONAL_SKIP_RULES: Record<string, (content: Record<string, unknown>) => boolean> = {
  "team-grid":        (c) => !Array.isArray(c.members)  || (c.members  as unknown[]).length < 1,
  "stats-band":       (c) => !Array.isArray(c.items)    || (c.items    as unknown[]).length < 1,
  "logo-strip":       (c) => !Array.isArray(c.names)    || (c.names    as unknown[]).length < 1,
  "pricing-tiers":    (c) => !Array.isArray(c.tiers)    || (c.tiers    as unknown[]).length < 1,
  "product-grid":     (c) => !Array.isArray(c.items)    || (c.items    as unknown[]).length < 1,
  "listings-grid":    (c) => !Array.isArray(c.items)    || (c.items    as unknown[]).length < 1,
  // Phase 2b — trust & conversion pool sections
  "comparison-table":  (c) => !Array.isArray(c.rows)     || (c.rows     as unknown[]).length < 1,
  "agent-card":        (c) => !c.name                    || String(c.name).trim() === "",
  "press-quote-band":  (c) => !c.quote                   || String(c.quote).trim() === "",
  "trainer-showcase":  (c) => !Array.isArray(c.trainers) || (c.trainers as unknown[]).length < 1,
  "trust-badges-band": (c) => !Array.isArray(c.badges)   || (c.badges   as unknown[]).length < 1,
  "appointment-form":  (c) => !Array.isArray(c.services) || (c.services as unknown[]).length < 1,
  "membership-form":   (c) => !Array.isArray(c.tiers)    || (c.tiers    as unknown[]).length < 1,
  // Phase 2c — showcase pool
  "property-listings-grid":   (c) => !Array.isArray(c.listings) || (c.listings as unknown[]).length < 1,
  "treatment-gallery":         (c) => !Array.isArray(c.services) || (c.services as unknown[]).length < 1,
  "portfolio-grid":            (c) => !Array.isArray(c.projects) || (c.projects as unknown[]).length < 2,
  "membership-plans-display":  (c) => !Array.isArray(c.tiers)    || (c.tiers    as unknown[]).length < 1,
  // Phase 2d — content pool
  "testimonial-single-quote":  (c) => !c.quote                   || String(c.quote).trim() === "",
  "testimonial-grid":          (c) => !Array.isArray(c.items)    || (c.items    as unknown[]).length < 1,
};
