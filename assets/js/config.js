/**
 * Förderverein der Kita Weserwichtel e.V.
 * Centralized Application Configuration
 */

const APP_CONFIG = {
  // Official Association Details
  ASSOCIATION_NAME: "Förderverein der Kita Weserwichtel e.V.",
  ASSOCIATION_SUBTITLE: "Gemeinsam stark für unsere Kinder",
  ASSOCIATION_CITY: "Berlin",
  ASSOCIATION_ADDRESS: "Weserstraße 106, 12059 Berlin",
  
  // Official Registration Data (Amtsgericht Charlottenburg)
  REGISTER_COURT: "Amtsgericht Charlottenburg (Berlin)",
  REGISTER_NUMBER: "VR 42469 B",

  // Official Creditor Identifier for SEPA Direct Debit Mandates
  CREDITOR_ID: "DE83ZZZ00002910027",

  // Official Association Bank Details (GLS Bank)
  BANK_NAME: "GLS Gemeinschaftsbank eG",
  BANK_IBAN: "DE67 8306 5408 0007 0069 93",
  BANK_BIC: "GENODEF1SLR",

  // Official Board Members (Vorstand & Schatzmeister)
  BOARD_MEMBERS: [
    { name: "Kanchan Noack", role: "Vorstand" },
    { name: "Tanja Ganser", role: "Vorstand" },
    { name: "Thomas Land", role: "Schatzmeister" }
  ],

  // Primary Contact & Application Recipient
  RECIPIENT_EMAIL: "FoerdervereinKitaWeserwichtel@gmail.com",
  CONTACT_NAME: "Tanja Ganser",

  // Optional Webhook Endpoint for non-blocking backend data storage
  // (e.g., Google Sheets / Make.com / Zapier / Supabase / n8n / Custom API)
  DATABASE_WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbyLjMGvrS9k4bCJvGUYKr3hvnaInec53rV1SUjP7AA1k2fXrnfhfbqS26enc9GkJa01/exec",

  // Membership contribution defaults
  MIN_ANNUAL_FEE: 12,
  DEFAULT_ANNUAL_FEE: 24,

  // Application metadata
  VERSION: "1.0.0",
  ENVIRONMENT: "production"
};

// Freeze configuration to prevent accidental modification at runtime
Object.freeze(APP_CONFIG);

// Export for ES modular or browser window scope
if (typeof window !== "undefined") {
  window.APP_CONFIG = APP_CONFIG;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = APP_CONFIG;
}
