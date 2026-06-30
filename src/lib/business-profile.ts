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
  "Dental Clinic": "healthcare", "Medical Clinic": "healthcare", "Cosmetic Clinic": "healthcare",
  "Physiotherapy": "healthcare", "Dermatology": "healthcare", "Eye Clinic": "healthcare",
  "Veterinary Clinic": "healthcare", "Pharmacy": "healthcare", "Psychologist": "healthcare",
  "Nutritionist": "healthcare", "Life Coach": "healthcare",
  "Hair Salon": "beauty", "Barbershop": "beauty", "Nail Salon": "beauty", "Spa & Wellness": "beauty",
  "Personal Trainer": "fitness", "Gym & Fitness": "fitness", "Yoga Studio": "fitness",
  "Real Estate Agency": "realestate", "Property Management": "realestate",
  "Restaurant": "food", "Cafe": "food", "Bakery": "food", "Catering": "food", "Hotel": "food",
  "Language School": "education", "Tutoring Center": "education", "Driving School": "education", "Childcare": "education",
  "Law Firm": "professional", "Accounting Firm": "professional", "Consulting": "professional",
  "Architecture Studio": "professional", "Interior Design": "professional", "Marketing Agency": "professional",
  "Financial Advisor": "professional", "Insurance Agency": "professional",
  "Jewelry Store": "retail", "Clothing Boutique": "retail", "Furniture Store": "retail",
  "Electronics Shop": "retail", "Florist": "retail", "E-commerce": "retail",
  "Cleaning Service": "home", "Plumbing": "home", "Electrician": "home", "Landscaping": "home",
  "Moving Company": "home", "Security Services": "home",
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
