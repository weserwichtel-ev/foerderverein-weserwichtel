/**
 * Förderverein der Kita Weserwichtel e.V.
 * Centralized Application Configuration
 *
 * SECURITY NOTE (4-Pillar Model):
 * This file contains ONLY public association details and the endpoint URL.
 * No passwords, tokens, or private Google Drive IDs are ever stored in client code.
 *
 * DOMAIN READINESS SWITCH:
 * While waiting for the custom domain (foerderverein-weserwichtel.de) to be purchased,
 * CUSTOM_DOMAIN_ACTIVE is set to `false` so all emails and replies go directly to
 * the working Gmail account (foerdervereinweserwichtel@gmail.com) without bouncing.
 * Once the domain & free Infomaniak email forwarding are active, simply set
 * CUSTOM_DOMAIN_ACTIVE to `true` (or access via foerderverein-weserwichtel.de).
 */

const _isCustomDomainHost =
  typeof window !== "undefined" &&
  window.location &&
  window.location.hostname.toLowerCase().includes("foerderverein-weserwichtel.de");

// >>> SCHALTER SOBALD DIE DOMAIN GEKAUFT IST: Auf `true` setzen <<<
const CUSTOM_DOMAIN_ACTIVE = false || _isCustomDomainHost;

const VEREIN_GMAIL_ADDRESS = "foerdervereinweserwichtel@gmail.com";
const CUSTOM_DOMAIN_EMAIL_ADDRESS = "info@foerderverein-weserwichtel.de";

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

  // Domain & Email Readiness Configuration
  CUSTOM_DOMAIN_ACTIVE: CUSTOM_DOMAIN_ACTIVE,
  CUSTOM_DOMAIN_NAME: "foerderverein-weserwichtel.de",
  CUSTOM_DOMAIN_EMAIL: CUSTOM_DOMAIN_EMAIL_ADDRESS,
  VEREIN_GMAIL: VEREIN_GMAIL_ADDRESS,
  GITHUB_PAGES_URL: "https://weserwichtel-ev.github.io/foerderverein-weserwichtel/",

  // Active Primary Contact & Application Recipient
  // Automatically uses foerdervereinweserwichtel@gmail.com until CUSTOM_DOMAIN_ACTIVE is true
  RECIPIENT_EMAIL: CUSTOM_DOMAIN_ACTIVE ? CUSTOM_DOMAIN_EMAIL_ADDRESS : VEREIN_GMAIL_ADDRESS,
  APPLICATION_SUBJECT_PREFIX: "[MITGLIEDSANTRAG]",
  CONTACT_NAME: "Tanja Ganser",
  TREASURER_NAME: "Thomas Land",

  // Google Apps Script Endpoint
  // Public calls (action=register) are strictly Write-Only.
  // Admin calls require server-side verified credentials stored in Google ScriptProperties.
  DATABASE_WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbyLjMGvrS9k4bCJvGUYKr3hvnaInec53rV1SUjP7AA1k2fXrnfhfbqS26enc9GkJa01/exec",

  // Membership contribution defaults
  MIN_ANNUAL_FEE: 12,
  DEFAULT_ANNUAL_FEE: 24,

  // Application metadata (Synced with version.json for zero-touch remote auto-updates)
  VERSION: "2.0.0",
  ENVIRONMENT: "production"
};

// Freeze configuration to prevent accidental modification at runtime
Object.freeze(APP_CONFIG);

// Export for ES modular or browser window scope
if (typeof window !== "undefined") {
  window.APP_CONFIG = APP_CONFIG;

  // Automatically sync any [data-verein-email] or #recipientEmailText elements in the DOM
  document.addEventListener("DOMContentLoaded", function () {
    const activeEmail = APP_CONFIG.RECIPIENT_EMAIL;
    const recipientSpan = document.getElementById("recipientEmailText");
    if (recipientSpan) {
      recipientSpan.textContent = activeEmail;
    }
    document.querySelectorAll("[data-verein-email]").forEach(function (el) {
      if (el.tagName === "A") {
        el.href = "mailto:" + activeEmail;
      }
      if (el.tagName === "INPUT") {
        el.value = activeEmail;
      } else {
        el.textContent = activeEmail;
      }
    });
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = APP_CONFIG;
}
