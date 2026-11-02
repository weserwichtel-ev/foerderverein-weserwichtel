/**
 * Förderverein der Kita Weserwichtel e.V.
 * Main Application Controller
 * Handles form validation, interactive behaviors, background webhooks,
 * PDF generation triggering, and mailto client integration.
 */

(function () {
  'use strict';

  // DOM Elements
  const form = document.getElementById('membershipForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');
  const submitSpinner = document.getElementById('submitSpinner');
  const sameAsMemberCheckbox = document.getElementById('sameAsMember');
  const accountHolderInput = document.getElementById('accountHolder');
  const ibanInput = document.getElementById('iban');
  const customAmountInput = document.getElementById('customAmount');
  const radioAmounts = document.querySelectorAll('input[name="feePreset"]');
  const successModal = document.getElementById('successModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalMailtoBtn = document.getElementById('modalMailtoBtn');
  const modalPdfBtn = document.getElementById('modalPdfBtn');
  const signatureWrapper = document.querySelector('.signature-wrapper');
  const signatureError = document.getElementById('signatureError');

  let lastGeneratedPdfData = null;
  let lastMailtoUrl = '';

  /**
   * Initialize on DOM Ready
   */
  document.addEventListener('DOMContentLoaded', function () {
    // 1. Initialize Signature Pad
    if (window.SignatureController) {
      window.SignatureController.init('#signatureCanvas', '#clearSignatureBtn');
    }

    // 2. Setup Contribution Amount sync
    setupContributionAmountLogic();

    // 3. Setup Account Holder auto-fill
    setupAccountHolderAutoFill();

    // 4. Setup IBAN live formatting
    setupIbanFormatting();

    // 5. Setup Form Submit Listener
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }

    // 6. Setup Modal Listeners
    setupModalListeners();
  });

  /**
   * Contribution preset radios vs custom input logic
   */
  function setupContributionAmountLogic() {
    radioAmounts.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (this.value === 'custom') {
          customAmountInput.disabled = false;
          customAmountInput.focus();
        } else {
          customAmountInput.disabled = true;
          customAmountInput.value = this.value;
        }
      });
    });

    if (customAmountInput) {
      customAmountInput.addEventListener('input', function () {
        const customRadio = document.querySelector('input[name="feePreset"][value="custom"]');
        if (customRadio) {
          customRadio.checked = true;
        }
      });
    }
  }

  /**
   * Checkbox to auto-fill Account Holder with Member Name
   */
  function setupAccountHolderAutoFill() {
    if (!sameAsMemberCheckbox || !accountHolderInput) return;

    sameAsMemberCheckbox.addEventListener('change', function () {
      if (this.checked) {
        const firstName = document.getElementById('firstName')?.value.trim() || '';
        const lastName = document.getElementById('lastName')?.value.trim() || '';
        accountHolderInput.value = `${firstName} ${lastName}`.trim();
      }
    });

    // Update if member name changes while checkbox is checked
    ['firstName', 'lastName'].forEach(function (id) {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', function () {
          if (sameAsMemberCheckbox.checked) {
            const firstName = document.getElementById('firstName')?.value.trim() || '';
            const lastName = document.getElementById('lastName')?.value.trim() || '';
            accountHolderInput.value = `${firstName} ${lastName}`.trim();
          }
        });
      }
    });
  }

  /**
   * IBAN live formatting (4-character chunks and uppercase)
   */
  function setupIbanFormatting() {
    if (!ibanInput) return;
    ibanInput.addEventListener('input', function (e) {
      let raw = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      // Format into blocks of 4
      const chunks = raw.match(/.{1,4}/g);
      e.target.value = chunks ? chunks.join(' ') : raw;
    });
  }

  /**
   * Basic validation helpers
   */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidIBAN(iban) {
    const clean = iban.replace(/\s+/g, '');
    // German IBAN: DE + 20 digits = 22 characters total; European min 15 max 34
    return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(clean);
  }

  /**
   * Primary Form Submission Handler
   */
  async function handleFormSubmit(e) {
    e.preventDefault();

    // Clear previous error styles
    signatureWrapper?.classList.remove('is-invalid');
    if (signatureError) signatureError.classList.add('hidden');

    // Collect values
    const firstName = document.getElementById('firstName')?.value.trim() || '';
    const lastName = document.getElementById('lastName')?.value.trim() || '';
    const birthDate = document.getElementById('birthDate')?.value.trim() || '';
    const street = document.getElementById('street')?.value.trim() || '';
    const houseNumber = document.getElementById('houseNumber')?.value.trim() || '';
    const zip = document.getElementById('zip')?.value.trim() || '';
    const city = document.getElementById('city')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim() || '';
    const phone = document.getElementById('phone')?.value.trim() || '';
    const childName = document.getElementById('childName')?.value.trim() || '';
    const childGroup = document.getElementById('childGroup')?.value.trim() || '';

    // Contribution amount
    const checkedRadio = document.querySelector('input[name="feePreset"]:checked');
    let contributionAmount = checkedRadio ? checkedRadio.value : '24';
    if (contributionAmount === 'custom') {
      contributionAmount = customAmountInput?.value.trim() || '24';
    }
    const numericFee = parseFloat(contributionAmount);
    const minFee = (window.APP_CONFIG && window.APP_CONFIG.MIN_ANNUAL_FEE) || 12;

    if (isNaN(numericFee) || numericFee < minFee) {
      alert(`Bitte geben Sie einen gültigen Mindestjahresbeitrag von mindestens ${minFee} € ein.`);
      customAmountInput?.focus();
      return;
    }

    // Bank Details
    const accountHolder = document.getElementById('accountHolder')?.value.trim() || '';
    const iban = document.getElementById('iban')?.value.trim() || '';
    const bic = document.getElementById('bic')?.value.trim() || '';
    const bankName = document.getElementById('bankName')?.value.trim() || '';

    // Consent checkboxes
    const consentStatute = document.getElementById('consentStatute')?.checked;
    const consentPrivacy = document.getElementById('consentPrivacy')?.checked;

    if (!consentStatute || !consentPrivacy) {
      alert('Bitte bestätigen Sie die Kenntnisnahme der Satzung und der Datenschutzerklärung.');
      return;
    }

    if (!isValidEmail(email)) {
      alert('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      document.getElementById('email')?.focus();
      return;
    }

    if (!isValidIBAN(iban)) {
      alert('Bitte geben Sie eine gültige IBAN ein (z. B. DE...).');
      document.getElementById('iban')?.focus();
      return;
    }

    // Check Signature
    if (!window.SignatureController || window.SignatureController.isEmpty()) {
      signatureWrapper?.classList.add('is-invalid');
      if (signatureError) signatureError.classList.remove('hidden');
      signatureWrapper?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const signatureDataUrl = window.SignatureController.getDataURL();

    // Prepare clean data packet
    const formData = {
      firstName,
      lastName,
      birthDate,
      street,
      houseNumber,
      zip,
      city,
      email,
      phone,
      childName,
      childGroup,
      contributionAmount: numericFee,
      accountHolder,
      iban,
      bic,
      bankName,
      submissionDate: new Date().toISOString()
    };

    lastGeneratedPdfData = {
      formData,
      signatureDataUrl
    };

    // UI: Set loading state
    setButtonLoading(true);

    try {
      // 1. Generate & trigger PDF download
      const pdfResult = window.PDFGenerator.generateMembershipPDF(formData, signatureDataUrl);
      const generatedFileName = pdfResult.fileName;

      // 2. Non-blocking background fetch to webhook endpoint (if configured)
      const webhookUrl = window.APP_CONFIG ? window.APP_CONFIG.DATABASE_WEBHOOK_URL : '';
      if (webhookUrl && webhookUrl.trim() !== '') {
        sendToWebhook(webhookUrl, formData);
      }

      // 3. Prepare & Trigger Mailto Client
      const recipient = (window.APP_CONFIG && window.APP_CONFIG.RECIPIENT_EMAIL) || 'FoerdervereinKitaWeserwichtel@gmail.com';
      const mailSubject = encodeURIComponent(`Mitgliedsantrag Förderverein Weserwichtel - ${firstName} ${lastName}`);
      const mailBody = encodeURIComponent(
        `Liebes Team des Fördervereins der Kita Weserwichtel e.V.,\n\n` +
        `hiermit übersende ich meinen ausgefüllten und digital unterschriebenen Antrag auf Mitgliedschaft.\n\n` +
        `Name: ${firstName} ${lastName}\n` +
        `Anschrift: ${street} ${houseNumber}, ${zip} ${city}\n` +
        `E-Mail: ${email}\n` +
        `Telefon: ${phone || '–'}\n` +
        `Jahresbeitrag: ${numericFee.toFixed(2)} €\n\n` +
        `WICHTIGER HINWEIS:\n` +
        `Das PDF-Dokument "${generatedFileName}" wurde soeben automatisch auf mein Gerät heruntergeladen.\n` +
        `Ich habe das PDF dieser E-Mail als Dateianhang beigefügt.\n\n` +
        `Viele Grüße\n` +
        `${firstName} ${lastName}`
      );

      lastMailtoUrl = `mailto:${recipient}?subject=${mailSubject}&body=${mailBody}`;

      // Open mail client in non-blocking fashion
      setTimeout(function () {
        window.location.href = lastMailtoUrl;
      }, 600);

      // 4. Show success modal
      openSuccessModal(generatedFileName);

    } catch (err) {
      console.error('[App] Error during submission flow:', err);
      alert('Es gab ein Problem bei der PDF-Erstellung. Bitte prüfen Sie Ihre Eingaben und versuchen Sie es erneut.');
    } finally {
      setButtonLoading(false);
    }
  }

  /**
   * Non-blocking background webhook dispatch
   * Supports Google Apps Script Web Apps & standard REST endpoints.
   * STRICT DSGVO COMPLIANCE: Digital signature is explicitly excluded.
   */
  function sendToWebhook(url, data) {
    if (!url || typeof url !== 'string' || url.trim() === '') return;

    // Sanitize payload: ONLY text fields, strictly NO signature data
    const payload = {
      source: 'foerderverein-weserwichtel-web',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      birthDate: data.birthDate || '',
      street: data.street || '',
      houseNumber: data.houseNumber || '',
      zip: data.zip || '',
      city: data.city || '',
      email: data.email || '',
      phone: data.phone || '',
      childName: data.childName || '',
      childGroup: data.childGroup || '',
      contributionAmount: data.contributionAmount || 24,
      accountHolder: data.accountHolder || '',
      iban: data.iban || '',
      bic: data.bic || '',
      bankName: data.bankName || '',
      timestamp: new Date().toISOString()
    };

    // Google Apps Script requires text/plain and no-cors to bypass CORS 302 redirect limits
    const isGoogleAppsScript = url.includes('script.google.com');

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': isGoogleAppsScript ? 'text/plain;charset=utf-8' : 'application/json'
      },
      body: JSON.stringify(payload),
      mode: isGoogleAppsScript ? 'no-cors' : 'cors'
    })
      .then(function (res) {
        if (!isGoogleAppsScript && !res.ok) {
          console.warn('[App] Webhook response not OK:', res.status);
        }
      })
      .catch(function (error) {
        // Non-blocking notice
        console.warn('[App] Background webhook call notice:', error);
      });
  }

  /**
   * Controls submit button loading state
   */
  function setButtonLoading(isLoading) {
    if (!submitBtn) return;
    if (isLoading) {
      submitBtn.disabled = true;
      if (submitSpinner) submitSpinner.classList.remove('hidden');
      if (submitBtnText) submitBtnText.textContent = 'PDF wird generiert...';
    } else {
      submitBtn.disabled = false;
      if (submitSpinner) submitSpinner.classList.add('hidden');
      if (submitBtnText) submitBtnText.textContent = 'Mitgliedsantrag absenden & PDF herunterladen';
    }
  }

  /**
   * Modal control
   */
  function openSuccessModal(fileName) {
    const fileNameDisplay = document.getElementById('downloadedFileName');
    if (fileNameDisplay) {
      fileNameDisplay.textContent = fileName;
    }
    if (successModal) {
      successModal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }
  }

  function closeSuccessModal() {
    if (successModal) {
      successModal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }

  function setupModalListeners() {
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', closeSuccessModal);
    }

    if (modalMailtoBtn) {
      modalMailtoBtn.addEventListener('click', function () {
        if (lastMailtoUrl) {
          window.location.href = lastMailtoUrl;
        }
      });
    }

    if (modalPdfBtn) {
      modalPdfBtn.addEventListener('click', function () {
        if (lastGeneratedPdfData && window.PDFGenerator) {
          window.PDFGenerator.generateMembershipPDF(
            lastGeneratedPdfData.formData,
            lastGeneratedPdfData.signatureDataUrl
          );
        }
      });
    }
  }

})();
