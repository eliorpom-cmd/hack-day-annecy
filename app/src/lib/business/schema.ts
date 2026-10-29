import { z } from "zod";

export const hoursSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  enabled: z.boolean(),
  open_time: z.string().regex(/^\d{2}:\d{2}$/),
  close_time: z.string().regex(/^\d{2}:\d{2}$/),
});

export const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
  duration_minutes: z.number().int().min(0).max(1440).optional().nullable(),
  price: z.number().min(0).optional().nullable(),
  price_note: z.string().max(60).optional().nullable(),
});

export const faqSchema = z.object({
  id: z.string().uuid().optional(),
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(2000),
});

export const staffSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  role: z.string().max(120).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
});

export const businessProfileSchema = z.object({
  business_name: z.string().min(1).max(160),
  industry: z.string().max(80).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  address: z.string().max(240).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(80).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  timezone: z.string().max(60).optional().nullable(),
  booking_url: z.string().max(300).optional().nullable(),
  policies: z.string().max(3000).optional().nullable(),
  booking_rules: z.string().max(2000).optional().nullable(),
  cancellation_rules: z.string().max(2000).optional().nullable(),
  transfer_rules: z.string().max(2000).optional().nullable(),
  emergency_rules: z.string().max(2000).optional().nullable(),
  hours: z.array(hoursSchema).max(14).default([]),
  services: z.array(serviceSchema).max(60).default([]),
  faqs: z.array(faqSchema).max(60).default([]),
  staff: z.array(staffSchema).max(40).default([]),
});

export type BusinessProfileInput = z.input<typeof businessProfileSchema>;
export type BusinessProfile = z.output<typeof businessProfileSchema>;
export type ServiceInput = z.output<typeof serviceSchema>;
export type FaqInput = z.output<typeof faqSchema>;
export type StaffInput = z.output<typeof staffSchema>;
export type HoursInput = z.output<typeof hoursSchema>;

export const INDUSTRIES = [
  { value: "home-services", label: "Home services" },
  { value: "plumbers", label: "Plumbing" },
  { value: "salons", label: "Salon & spa" },
  { value: "dentists", label: "Dental" },
  { value: "law-firms", label: "Law firm" },
  { value: "real-estate", label: "Real estate" },
  { value: "medical", label: "Medical practice" },
  { value: "auto", label: "Auto services" },
  { value: "restaurant", label: "Restaurant" },
  { value: "fitness", label: "Fitness & wellness" },
  { value: "other", label: "Other" },
] as const;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function defaultHours(): HoursInput[] {
  return Array.from({ length: 7 }, (_, d) => ({
    day_of_week: d,
    enabled: d >= 1 && d <= 5,
    open_time: "09:00",
    close_time: "17:00",
  }));
}

export function emptyBusinessProfile(): BusinessProfile {
  return {
    business_name: "",
    industry: null,
    description: null,
    address: null,
    city: null,
    state: null,
    postal_code: null,
    country: "US",
    phone: null,
    email: null,
    website: null,
    timezone: "America/New_York",
    booking_url: null,
    policies: null,
    booking_rules: null,
    cancellation_rules: null,
    transfer_rules: null,
    emergency_rules: null,
    hours: defaultHours(),
    services: [],
    faqs: [],
    staff: [],
  };
}

export const receptionistInputSchema = z.object({
  name: z.string().min(1).max(120),
  voice_id: z.string().uuid(),
  greeting: z.string().min(1).max(400),
  personality: z.string().max(300).default("professional, warm, concise, helpful"),
  tone: z.enum(["warm", "professional", "friendly", "concise"]).default("warm"),
  language: z.string().max(10).default("en"),
  custom_instructions: z.string().max(4000).optional().nullable(),
});
export type ReceptionistInput = z.input<typeof receptionistInputSchema>;

export const RECEPTIONIST_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scanning: "Scanning",
  review_required: "Needs review",
  creating_agent: "Creating",
  agent_ready: "Ready to test",
  phone_pending: "Phone pending",
  phone_provisioning: "Activating number",
  phone_configuring: "Configuring number",
  live: "Live",
  error: "Needs attention",
  suspended: "Suspended",
};

export function defaultGreeting(businessName: string) {
  return `Hi! Thanks for calling ${businessName}. How can I help you today?`;
}
