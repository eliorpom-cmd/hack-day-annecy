export interface IndustryContent {
  slug: string;
  name: string;
  headline: string;
  intro: string;
  painPoints: string[];
  useCases: string[];
  sampleQuestions: string[];
}

export const INDUSTRIES_CONTENT: Record<string, IndustryContent> = {
  "home-services": {
    slug: "home-services",
    name: "Home Services",
    headline: "Never miss a service call again",
    intro:
      "Plumbers, electricians, and HVAC techs lose jobs every time a call goes to voicemail. Your AI receptionist answers instantly, qualifies the job, and gets the caller booked or triaged for an emergency.",
    painPoints: [
      "Calls come in while you're under a sink or on a roof",
      "Voicemail loses jobs to the next company on Google",
      "After-hours emergencies need a fast answer, not a callback tomorrow",
    ],
    useCases: [
      "Answer calls 24/7, even nights and weekends",
      "Ask the right triage questions for the job type",
      "Book estimates and service windows on your calendar",
      "Flag true emergencies for an immediate callback",
    ],
    sampleQuestions: [
      "Do you install tankless water heaters?",
      "Can someone come out today for a leak?",
      "What do you charge for a service call?",
    ],
  },
  dental: {
    slug: "dental",
    name: "Dental",
    headline: "A friendly voice for every patient call",
    intro:
      "Front desk staff are busy with patients in the chair. Your AI receptionist handles routine calls — hours, insurance, new patient questions — and gets appointment requests into your schedule.",
    painPoints: [
      "Front desk can't answer the phone and greet patients at once",
      "New patient calls go unanswered during busy hours",
      "Insurance and pricing questions repeat all day",
    ],
    useCases: [
      "Answer questions about hours, services, and insurance",
      "Collect new patient details and preferred times",
      "Confirm appointment requests through your calendar",
      "Send your team a summary after every call",
    ],
    sampleQuestions: [
      "Do you take my insurance?",
      "How much is a cleaning without insurance?",
      "Can I get an appointment this week?",
    ],
  },
  "salons-spas": {
    slug: "salons-spas",
    name: "Salons & Spas",
    headline: "Book more appointments, answer fewer calls",
    intro:
      "Stylists and estheticians can't stop mid-service to answer the phone. Your AI receptionist takes booking requests, answers service and pricing questions, and keeps your chairs full.",
    painPoints: [
      "Staff can't step away from clients to answer calls",
      "Missed calls mean missed bookings",
      "Repeated questions about services and pricing take time",
    ],
    useCases: [
      "Answer questions about services, pricing, and availability",
      "Take booking requests for your team to confirm",
      "Explain cancellation and late policies consistently",
      "Send a call summary so nothing gets missed",
    ],
    sampleQuestions: [
      "How much is a balayage?",
      "Do you have anything open Saturday?",
      "What's your cancellation policy?",
    ],
  },
  "medical-clinics": {
    slug: "medical-clinics",
    name: "Medical Clinics",
    headline: "Answer patient calls without pulling staff from care",
    intro:
      "Clinics field a steady stream of scheduling and general questions. Your AI receptionist handles the routine calls so your staff can stay focused on patients in the office.",
    painPoints: [
      "Phones ring constantly while staff are with patients",
      "Basic questions (hours, location, insurance) take up staff time",
      "Scheduling requests get delayed until someone is free",
    ],
    useCases: [
      "Answer hours, location, and general practice questions",
      "Collect appointment requests for staff to confirm",
      "Direct urgent-sounding calls appropriately",
      "Provide a transcript and summary for your records",
    ],
    sampleQuestions: [
      "Are you accepting new patients?",
      "What insurance do you accept?",
      "Can I get in this week for a checkup?",
    ],
  },
  "law-offices": {
    slug: "law-offices",
    name: "Law Offices",
    headline: "Every caller gets answered, every lead gets captured",
    intro:
      "Missed calls can mean missed clients. Your AI receptionist greets callers professionally, gathers the basics of their situation, and routes them to the right person or a scheduled consultation.",
    painPoints: [
      "Attorneys and paralegals can't drop court prep to answer phones",
      "Prospective clients call several firms — the fastest response often wins",
      "Intake details get lost in a game of phone tag",
    ],
    useCases: [
      "Greet callers and capture the basics of their matter",
      "Route calls to the right attorney or team",
      "Schedule consultations on your calendar",
      "Deliver a summary and transcript after every call",
    ],
    sampleQuestions: [
      "Do you handle car accident cases?",
      "Is a consultation free?",
      "Can someone call me back today?",
    ],
  },
  "real-estate": {
    slug: "real-estate",
    name: "Real Estate",
    headline: "Respond to every buyer and seller lead instantly",
    intro:
      "Real estate moves fast, and slow responses lose leads. Your AI receptionist answers listing questions around the clock and books showings while you're with another client.",
    painPoints: [
      "Agents are often on calls or showings when new leads reach out",
      "Listing questions come in at all hours",
      "Slow follow-up loses leads to faster competitors",
    ],
    useCases: [
      "Answer listing, pricing, and availability questions",
      "Schedule showings on your calendar",
      "Capture buyer and seller lead details",
      "Send instant call summaries to your inbox",
    ],
    sampleQuestions: [
      "Is the property on Maple Street still available?",
      "Can I schedule a showing this weekend?",
      "What's the price range in this neighborhood?",
    ],
  },
  "auto-services": {
    slug: "auto-services",
    name: "Auto Services",
    headline: "Keep the bays full without living on the phone",
    intro:
      "Shops lose time answering routine calls while working on vehicles. Your AI receptionist handles scheduling and quote questions so your team can stay focused on the cars in the bay.",
    painPoints: [
      "Techs can't stop working to answer the phone",
      "Repeated questions about pricing and wait times slow the day down",
      "Missed calls send customers to the next shop",
    ],
    useCases: [
      "Answer questions about services and estimated pricing",
      "Book drop-off and pick-up appointments",
      "Explain hours, location, and what you service",
      "Send a summary of every call to your team",
    ],
    sampleQuestions: [
      "Do you do state inspections?",
      "How much for an oil change?",
      "Can I drop off my car tomorrow morning?",
    ],
  },
  restaurants: {
    slug: "restaurants",
    name: "Restaurants",
    headline: "Answer every call, even during the dinner rush",
    intro:
      "During peak hours, no one has time to answer the phone. Your AI receptionist handles hours, menu questions, and reservation requests so your team can stay on the floor.",
    painPoints: [
      "Staff can't leave the floor to answer calls during rushes",
      "Reservation and hours questions come in nonstop",
      "Missed calls mean missed reservations and takeout orders",
    ],
    useCases: [
      "Answer hours, location, and menu questions",
      "Take reservation requests for your team to confirm",
      "Explain private event and large party policies",
      "Send a summary after every call",
    ],
    sampleQuestions: [
      "Are you open on Sundays?",
      "Can I book a table for six on Friday?",
      "Do you have vegan options?",
    ],
  },
};

export const INDUSTRY_SLUGS = Object.keys(INDUSTRIES_CONTENT);
