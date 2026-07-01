export interface BusinessProfile {
  ownerName: string;
  email: string;
  businessName: string;
  businessType: string;
  country: string;
  city: string;
  phone: string;
  plan: string;
}

export interface IndustryVocab {
  customer: string;
  customers: string;
  service: string;
  services: string;
  booking: string;
  bookings: string;
  revenueLabel: string;
  bucket: "healthcare" | "beauty" | "fitness" | "realestate" | "food" | "education" | "professional" | "retail" | "home" | "general";
}

const BUCKET_VOCAB: Record<string, IndustryVocab> = {
  healthcare: { customer: "Patient", customers: "Patients", service: "Treatment", services: "Treatments", booking: "Appointment", bookings: "Appointments", revenueLabel: "Revenue (AED)", bucket: "healthcare" },
  beauty:     { customer: "Client",  customers: "Clients",  service: "Service",   services: "Services",   booking: "Appointment", bookings: "Appointments", revenueLabel: "Revenue (AED)", bucket: "beauty" },
  fitness:    { customer: "Member",  customers: "Members",  service: "Session",   services: "Sessions",   booking: "Session",     bookings: "Sessions",     revenueLabel: "Revenue (AED)", bucket: "fitness" },
  realestate: { customer: "Client",  customers: "Clients",  service: "Property",  services: "Properties", booking: "Viewing",     bookings: "Viewings",     revenueLabel: "Commission (AED)", bucket: "realestate" },
  food:       { customer: "Guest",   customers: "Guests",   service: "Dish",      services: "Items",      booking: "Reservation", bookings: "Reservations", revenueLabel: "Revenue (AED)", bucket: "food" },
  education:  { customer: "Student", customers: "Students", service: "Lesson",    services: "Lessons",    booking: "Session",     bookings: "Sessions",     revenueLabel: "Revenue (AED)", bucket: "education" },
  professional:{ customer: "Client", customers: "Clients",  service: "Service",   services: "Services",   booking: "Consultation",bookings: "Consultations",revenueLabel: "Revenue (AED)", bucket: "professional" },
  retail:     { customer: "Customer",customers: "Customers",service: "Product",   services: "Products",   booking: "Order",       bookings: "Orders",       revenueLabel: "Sales (AED)",   bucket: "retail" },
  home:       { customer: "Customer",customers: "Customers",service: "Job",       services: "Jobs",       booking: "Booking",     bookings: "Bookings",     revenueLabel: "Revenue (AED)", bucket: "home" },
  general:    { customer: "Customer",customers: "Customers",service: "Service",   services: "Services",   booking: "Appointment", bookings: "Appointments", revenueLabel: "Revenue (AED)", bucket: "general" },
};

const TYPE_TO_BUCKET: Record<string, keyof typeof BUCKET_VOCAB> = {
  // New simplified detection categories
  "Medical Clinic": "healthcare", "Dental Clinic": "healthcare", "Beauty & Wellness": "beauty",
  "Gym & Fitness": "fitness", "Real Estate": "realestate", "Restaurant": "food",
  "Coffee Shop": "food", "Hotel": "food", "Law Firm": "professional",
  "Education": "education", "E-Commerce": "retail", "Business": "general",
  // Legacy categories (kept for backward compat)
  "Cosmetic Clinic": "healthcare", "Physiotherapy": "healthcare", "Dermatology": "healthcare",
  "Eye Clinic": "healthcare", "Veterinary Clinic": "healthcare", "Pharmacy": "healthcare",
  "Hair Salon": "beauty", "Barbershop": "beauty", "Nail Salon": "beauty", "Spa & Wellness": "beauty",
  "Personal Trainer": "fitness", "Yoga Studio": "fitness",
  "Real Estate Agency": "realestate", "Property Management": "realestate",
  "Cafe": "food", "Bakery": "food", "Catering": "food",
  "Language School": "education", "Tutoring Center": "education",
  "Accounting Firm": "professional", "Consulting": "professional", "Marketing Agency": "professional",
  "Financial Advisor": "professional", "Insurance Agency": "professional",
  "E-commerce": "retail", "Jewelry Store": "retail", "Clothing Boutique": "retail",
  "Cleaning Service": "home", "Plumbing": "home", "Electrician": "home",
};

const STORAGE_KEY = "vela_profile";

export function getProfile(): BusinessProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BusinessProfile) : null;
  } catch { return null; }
}

export function saveProfile(partial: Partial<BusinessProfile>): void {
  if (typeof window === "undefined") return;
  const existing = getProfile() ?? ({} as BusinessProfile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...partial }));
}

export function getVocab(businessType?: string): IndustryVocab {
  if (!businessType) return BUCKET_VOCAB.general;
  const bucket = TYPE_TO_BUCKET[businessType] ?? "general";
  return BUCKET_VOCAB[bucket];
}
