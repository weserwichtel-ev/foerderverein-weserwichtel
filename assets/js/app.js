/**
 * Förderverein der Kita Weserwichtel e.V.
 * Main Application Controller
 * Handles smart autofill helpers, ISO-7064 Mod-97 IBAN validation,
 * automatic German BLZ -> Bank/BIC detection, inline validation,
 * PDF generation, Web Share API file attachment, and mailto integration.
 */

(function () {
  'use strict';

  // Built-in directory of common Berlin & German banks by 8-digit Bankleitzahl (BLZ)
  // Enables 0ms offline bank & BIC detection on GitHub Pages without a backend.
  const GERMAN_BANK_DIRECTORY = {
    '10050000': { name: 'Berliner Sparkasse', bic: 'BELADEBEXXX' },
    '12030000': { name: 'Deutsche Kreditbank (DKB)', bic: 'BYLADEM1001' },
    '50010517': { name: 'ING', bic: 'INGDDEFFXXX' },
    '10011001': { name: 'N26 Bank', bic: 'NTSBDEB1XXX' },
    '83065408': { name: 'GLS Gemeinschaftsbank eG', bic: 'GENODEF1SLR' },
    '43060967': { name: 'GLS Gemeinschaftsbank eG', bic: 'GENODEM1GLS' },
    '10040000': { name: 'Commerzbank', bic: 'COBADEFFXXX' },
    '10080000': { name: 'Commerzbank', bic: 'DRESDEFF100' },
    '37040044': { name: 'Commerzbank', bic: 'COBADEFFXXX' },
    '10070000': { name: 'Deutsche Bank', bic: 'DEUTDEBBXXX' },
    '10070024': { name: 'Deutsche Bank', bic: 'DEUTDEDBBER' },
    '50070010': { name: 'Deutsche Bank', bic: 'DEUTDEFFXXX' },
    '50070024': { name: 'Deutsche Bank', bic: 'DEUTODBEXXX' },
    '10010010': { name: 'Postbank', bic: 'PBNKDEFFXXX' },
    '37010050': { name: 'Postbank', bic: 'PBNKDEFFXXX' },
    '10090000': { name: 'Berliner Volksbank', bic: 'BEVODEBBXXX' },
    '12096597': { name: 'Sparda-Bank Berlin', bic: 'GENODEF1S10' },
    '30020900': { name: 'Targobank', bic: 'CMCIDEDDXXX' },
    '20041111': { name: 'comdirect', bic: 'COBADEHDXXX' },
    '20041133': { name: 'comdirect', bic: 'COBADEHD001' },
    '20041144': { name: 'comdirect', bic: 'COBADEHD044' },
    '20041155': { name: 'comdirect', bic: 'COBADEHD055' },
    '20041177': { name: 'comdirect', bic: 'COBADEHD077' },
    '76030080': { name: 'Consorsbank', bic: 'CSDBDE71XXX' },
    '51230800': { name: '1822direkt', bic: 'HELADEF1822' },
    '37020500': { name: 'Bank für Sozialwirtschaft', bic: 'BFSWDE33XXX' },
    '10010123': { name: 'Solaris / Tomorrow', bic: 'SOBKDEB2XXX' },
    '70020270': { name: 'HypoVereinsbank (UniCredit)', bic: 'HYVEDEMMXXX' },
    '50010900': { name: 'Santander Bank', bic: 'SCFBDE33XXX' },
    '16050000': { name: 'Mittelbrandenburgische Sparkasse', bic: 'WELADED1PMB' },
    '10020890': { name: 'HypoVereinsbank Berlin', bic: 'HYVEDEMM488' },
    '50110800': { name: 'Triodos Bank', bic: 'TRWIBEBBXXX' },
    '70011110': { name: ' UmweltBank', bic: 'UMWBDEM1XXX' }
  };

  // DOM Elements
  const form = document.getElementById('membershipForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');
  const submitSpinner = document.getElementById('submitSpinner');

  // Personal fields
  const firstNameInput = document.getElementById('firstName');
  const lastNameInput = document.getElementById('lastName');
  const emailInput = document.getElementById('email');
  const streetInput = document.getElementById('street');
  const houseNumberInput = document.getElementById('houseNumber');
  const zipInput = document.getElementById('zip');
  const cityInput = document.getElementById('city');
  const phoneInput = document.getElementById('phone');
  const birthDateInput = document.getElementById('birthDate');

  // Contribution fields
  const customCardLabel = document.getElementById('customCardLabel');
  const customCardText = document.getElementById('customCardText');
  const customCardInputWrapper = document.getElementById('customCardInputWrapper');
  const customMonthlyHint = document.getElementById('customMonthlyHint');
  const customAmountInput = document.getElementById('customAmount');
  const customAmountError = document.getElementById('customAmountError');
  const radioAmounts = document.querySelectorAll('input[name="feePreset"]');

  // SEPA fields
  const sameAsMemberCheckbox = document.getElementById('sameAsMember');
  const accountHolderWrapper = document.getElementById('accountHolderWrapper');
  const accountHolderInput = document.getElementById('accountHolder');
  const accountHolderPreview = document.getElementById('accountHolderPreview');
  const ibanInput = document.getElementById('iban');
  const ibanStatusBadge = document.getElementById('ibanStatusBadge');
  const detectedBankBanner = document.getElementById('detectedBankBanner');
  const detectedBankText = document.getElementById('detectedBankText');
  const detectedBicText = document.getElementById('detectedBicText');
  const bicInput = document.getElementById('bic');
  const bankNameInput = document.getElementById('bankName');

  // Signature & Consent
  const signatureWrapper = document.querySelector('.signature-wrapper');
  const signatureError = document.getElementById('signatureError');
  const consentStatute = document.getElementById('consentStatute');
  const consentPrivacy = document.getElementById('consentPrivacy');
  const consentError = document.getElementById('consentError');

  // Modal Elements
  const successModal = document.getElementById('successModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const step1StatusBadge = document.getElementById('step1StatusBadge');
  const modalMailtoBtn = document.getElementById('modalMailtoBtn');
  const modalMailDefaultBtn = document.getElementById('modalMailDefaultBtn');
  const modalMailGmailBtn = document.getElementById('modalMailGmailBtn');
  const modalMailProtonBtn = document.getElementById('modalMailProtonBtn');
  const modalMailOutlookBtn = document.getElementById('modalMailOutlookBtn');
  const modalPdfBtn = document.getElementById('modalPdfBtn');
  const nativeShareSection = document.getElementById('nativeShareSection');
  const modalNativeShareBtn = document.getElementById('modalNativeShareBtn');
  const copyEmailBtn = document.getElementById('copyEmailBtn');

  let lastGeneratedPdfData = null;
  let lastGeneratedPdfResult = null;
  let lastMailSubject = '';
  let lastMailBodyPlain = '';
  let lastMailtoUrl = '';
  let lastShareText = '';
  let lastOpenIbanLookupCode = '';

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

    // 3. Setup Smart Autofill Street/House-Nr. splitter & Date auto-formatter
    setupSmartAddressSplit();
    setupFastBirthDateFormatter();

    // 4. Setup Account Holder auto-sync (checked by default)
    setupAccountHolderAutoFill();

    // 5. Setup IBAN live formatting, Mod-97 checksum & Bank/BIC detection
    setupIbanSmartHandler();

    // 6. Setup Inline Error Clearing on Input
    setupInlineValidationClearers();

    // 7. Setup Form Submit Listener
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }

    // 8. Setup Modal Listeners
    setupModalListeners();
  });

  /**
   * Calculate and update the dynamic monthly hint inside the custom amount pill
   */
  function updateCustomMonthlyHint() {
    if (!customAmountInput || !customMonthlyHint) return;
    const raw = customAmountInput.value.trim();
    const val = parseFloat(raw);
    const minFee = (window.APP_CONFIG && window.APP_CONFIG.MIN_ANNUAL_FEE) || 12;

    if (isNaN(val) || val < minFee) {
      customMonthlyHint.textContent = `mind. ${minFee} € / Jahr`;
      customMonthlyHint.className = 'block text-[10px] sm:text-[11px] text-rose-600 font-bold mt-1 leading-none truncate max-w-full';
      customAmountInput.classList.add('border-rose-500', 'focus:ring-rose-500');
      customAmountInput.classList.remove('border-brand-500', 'focus:ring-brand-500');
    } else {
      const monthly = val / 12;
      const formatted = monthly % 1 === 0 ? monthly.toFixed(0) : monthly.toFixed(2).replace('.', ',');
      customMonthlyHint.textContent = `${formatted} € / Monat`;
      customMonthlyHint.className = 'block text-[10px] sm:text-[11px] text-brand-700 font-semibold mt-1 leading-none truncate max-w-full';
      customAmountInput.classList.remove('border-rose-500', 'focus:ring-rose-500');
      customAmountInput.classList.add('border-brand-500', 'focus:ring-brand-500');
      hideFieldError('customAmount', 'customAmountError');
    }
  }

  /**
   * Contribution preset radios vs custom input logic blended into the 4th pill
   */
  function setupContributionAmountLogic() {
    radioAmounts.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (this.value === 'custom') {
          if (customCardText) customCardText.classList.add('hidden');
          if (customCardInputWrapper) {
            customCardInputWrapper.classList.remove('hidden');
            customCardInputWrapper.classList.add('flex');
          }
          if (customAmountInput) {
            customAmountInput.disabled = false;
            if (!customAmountInput.value || parseFloat(customAmountInput.value) < 12) {
              customAmountInput.value = '60';
            }
            updateCustomMonthlyHint();
            customAmountInput.focus();
            customAmountInput.select();
          }
        } else {
          if (customCardText) customCardText.classList.remove('hidden');
          if (customCardInputWrapper) {
            customCardInputWrapper.classList.add('hidden');
            customCardInputWrapper.classList.remove('flex');
          }
          if (customAmountInput) {
            customAmountInput.disabled = true;
          }
          hideFieldError('customAmount', 'customAmountError');
        }
      });
    });

    // Clicking anywhere on the 4th pill focuses the custom input
    if (customCardLabel) {
      customCardLabel.addEventListener('click', function (e) {
        if (e.target !== customAmountInput) {
          const customRadio = document.querySelector('input[name="feePreset"][value="custom"]');
          if (customRadio && !customRadio.checked) {
            customRadio.checked = true;
            customRadio.dispatchEvent(new Event('change'));
          } else if (customRadio && customRadio.checked && customAmountInput) {
            customAmountInput.focus();
          }
        }
      });
    }

    if (customAmountInput) {
      // Prevent clicking the input from bubbling to label and causing toggle loops
      ['click', 'mousedown', 'touchstart'].forEach(function (evtType) {
        customAmountInput.addEventListener(evtType, function (e) {
          e.stopPropagation();
        });
      });

      customAmountInput.addEventListener('input', function () {
        const customRadio = document.querySelector('input[name="feePreset"][value="custom"]');
        if (customRadio && !customRadio.checked) {
          customRadio.checked = true;
        }
        updateCustomMonthlyHint();
      });
    }
  }

  /**
   * Smart Street & House Number Autofill Splitter:
   * When iOS/Android/Chrome autofills "Weserstraße 42" into the Street field
   * while House Number is empty, automatically move "42" into House Number.
   */
  function setupSmartAddressSplit() {
    if (!streetInput || !houseNumberInput) return;

    function trySplitStreetAndNumber() {
      const val = streetInput.value.trim();
      if (!val || houseNumberInput.value.trim() !== '') return;

      // Match street name followed by house number (e.g. "Weserstraße 106", "Weserstr. 42a", "Sonnenallee 12-14")
      const match = val.match(/^([a-zA-ZäöüÄÖÜß.\-\s]{3,}?)\s+(\d+\s*[a-zA-Z]?(?:\s*[\/-]\s*\d+\s*[a-zA-Z]?)?)$/);
      if (match) {
        streetInput.value = match[1].trim();
        houseNumberInput.value = match[2].replace(/\s+/g, '');
        hideFieldError('houseNumber', 'houseNumberError');
      }
    }

    streetInput.addEventListener('change', trySplitStreetAndNumber);
    streetInput.addEventListener('blur', trySplitStreetAndNumber);
    streetInput.addEventListener('input', function () {
      // Trigger immediately if autofill pasted a full street + number
      if (houseNumberInput.value.trim() === '' && /\s+\d+/.test(streetInput.value)) {
        trySplitStreetAndNumber();
      }
    });
  }

  /**
   * Fast Numeric Birth Date Formatter (TT.MM.JJJJ):
   * Automatically inserts dots after DD and MM when typing numbers.
   */
  function setupFastBirthDateFormatter() {
    if (!birthDateInput) return;

    birthDateInput.addEventListener('input', function (e) {
      // Allow backspace/deletion naturally
      if (e.inputType && e.inputType.startsWith('delete')) return;

      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
      let formatted = '';
      if (digits.length > 0) {
        formatted = digits.slice(0, 2);
      }
      if (digits.length >= 2) {
        formatted += '.' + digits.slice(2, 4);
      }
      if (digits.length >= 4) {
        formatted += '.' + digits.slice(4, 8);
      }
      e.target.value = formatted;
    });
  }

  /**
   * Auto-sync Account Holder with Member Name (enabled by default)
   */
  function setupAccountHolderAutoFill() {
    if (!sameAsMemberCheckbox || !accountHolderInput) return;

    function syncMemberNameToAccountHolder() {
      const first = firstNameInput ? firstNameInput.value.trim() : '';
      const last = lastNameInput ? lastNameInput.value.trim() : '';
      const fullName = `${first} ${last}`.trim();

      if (sameAsMemberCheckbox.checked) {
        accountHolderInput.value = fullName;
        if (accountHolderPreview) {
          accountHolderPreview.textContent = fullName || 'Wird automatisch übernommen';
        }
      }
    }

    sameAsMemberCheckbox.addEventListener('change', function () {
      if (this.checked) {
        if (accountHolderWrapper) accountHolderWrapper.classList.add('hidden');
        if (accountHolderPreview) accountHolderPreview.classList.remove('hidden');
        syncMemberNameToAccountHolder();
        hideFieldError('accountHolder', 'accountHolderError');
      } else {
        if (accountHolderWrapper) accountHolderWrapper.classList.remove('hidden');
        if (accountHolderPreview) accountHolderPreview.classList.add('hidden');
        accountHolderInput.focus();
      }
    });

    [firstNameInput, lastNameInput].forEach(function (input) {
      if (input) {
        input.addEventListener('input', syncMemberNameToAccountHolder);
        input.addEventListener('change', syncMemberNameToAccountHolder);
      }
    });

    // Initial sync
    syncMemberNameToAccountHolder();
  }

  /**
   * ISO-7064 Mod-97 Checksum Validation for IBAN
   */
  function isValidIBANChecksum(iban) {
    const clean = (iban || '').replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(clean)) {
      return false;
    }
    // German IBANs must be strictly 22 characters
    if (clean.startsWith('DE') && clean.length !== 22) {
      return false;
    }

    // Rearrange: move first 4 characters to the end
    const rearranged = clean.slice(4) + clean.slice(0, 4);

    // Replace letters with numbers (A=10, B=11, ..., Z=35)
    let numericStr = '';
    for (let i = 0; i < rearranged.length; i++) {
      const code = rearranged.charCodeAt(i);
      if (code >= 65 && code <= 90) {
        numericStr += (code - 55).toString();
      } else {
        numericStr += rearranged[i];
      }
    }

    // Calculate Mod-97 in chunks to avoid integer overflow
    let remainder = 0;
    for (let i = 0; i < numericStr.length; i += 7) {
      const chunk = String(remainder) + numericStr.slice(i, i + 7);
      remainder = parseInt(chunk, 10) % 97;
    }

    return remainder === 1;
  }

  /**
   * IBAN live 4-char formatting, Mod-97 validation, and automatic German BLZ -> Bank/BIC lookup
   */
  function setupIbanSmartHandler() {
    if (!ibanInput) return;

    ibanInput.addEventListener('input', function (e) {
      const raw = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const chunks = raw.match(/.{1,4}/g);
      e.target.value = chunks ? chunks.join(' ') : raw;

      hideFieldError('iban', 'ibanError');
      updateIbanStatusAndBank(raw);
    });

    ibanInput.addEventListener('blur', function () {
      const raw = ibanInput.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (raw.length > 0 && !isValidIBANChecksum(raw)) {
        showFieldError('iban', 'ibanError');
      }
    });
  }

  function updateIbanStatusAndBank(cleanIban) {
    if (!cleanIban) {
      ibanInput.classList.remove('input-valid', 'input-invalid');
      if (ibanStatusBadge) {
        ibanStatusBadge.textContent = 'DE + 20 Ziffern';
        ibanStatusBadge.className = 'text-[11px] font-medium text-slate-400';
      }
      hideDetectedBankBanner();
      return;
    }

    const isGerman = cleanIban.startsWith('DE');

    // Check if German BLZ (chars 4..12) is complete so we can preview the bank immediately
    if (isGerman && cleanIban.length >= 12) {
      const blz = cleanIban.slice(4, 12);
      const localBank = GERMAN_BANK_DIRECTORY[blz];
      if (localBank) {
        applyDetectedBank(localBank.name, localBank.bic);
      }
    } else {
      hideDetectedBankBanner();
    }

    // While still typing a German IBAN (< 22 chars)
    if (isGerman && cleanIban.length < 22) {
      ibanInput.classList.remove('input-valid', 'input-invalid');
      if (ibanStatusBadge) {
        ibanStatusBadge.textContent = `${cleanIban.length} / 22 Zeichen`;
        ibanStatusBadge.className = 'text-[11px] font-medium text-slate-500';
      }
      return;
    }

    // Validate full IBAN via Mod-97
    if (isValidIBANChecksum(cleanIban)) {
      ibanInput.classList.remove('input-invalid');
      ibanInput.classList.add('input-valid');
      if (ibanStatusBadge) {
        ibanStatusBadge.textContent = '✓ Gültige IBAN';
        ibanStatusBadge.className = 'text-[11px] font-bold text-emerald-600';
      }

      // If German IBAN not in local dictionary, try non-blocking CORS lookup via OpenIBAN
      if (isGerman) {
        const blz = cleanIban.slice(4, 12);
        if (!GERMAN_BANK_DIRECTORY[blz] && lastOpenIbanLookupCode !== cleanIban) {
          lastOpenIbanLookupCode = cleanIban;
          fetchBankFromOpenIban(cleanIban);
        }
      }
    } else {
      ibanInput.classList.remove('input-valid');
      ibanInput.classList.add('input-invalid');
      if (ibanStatusBadge) {
        ibanStatusBadge.textContent = '⚠️ Prüfsumme ungültig';
        ibanStatusBadge.className = 'text-[11px] font-bold text-rose-600';
      }
      hideDetectedBankBanner();
    }
  }

  function applyDetectedBank(bankName, bic) {
    if (bankNameInput && (!bankNameInput.value || bankNameInput.dataset.autoFilled === 'true')) {
      bankNameInput.value = bankName;
      bankNameInput.dataset.autoFilled = 'true';
    }
    if (bicInput && (!bicInput.value || bicInput.dataset.autoFilled === 'true')) {
      bicInput.value = bic;
      bicInput.dataset.autoFilled = 'true';
    }

    if (detectedBankBanner && detectedBankText) {
      detectedBankText.textContent = bankName;
      if (detectedBicText) {
        detectedBicText.textContent = bic ? `BIC: ${bic}` : '';
      }
      detectedBankBanner.classList.remove('hidden');
      detectedBankBanner.classList.add('flex');
    }
  }

  function hideDetectedBankBanner() {
    if (detectedBankBanner) {
      detectedBankBanner.classList.add('hidden');
      detectedBankBanner.classList.remove('flex');
    }
  }

  function fetchBankFromOpenIban(cleanIban) {
    fetch(`https://openiban.com/validate/${encodeURIComponent(cleanIban)}?getBIC=true&validateBankCode=true`)
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (data && data.valid && data.bankData && data.bankData.name) {
          applyDetectedBank(data.bankData.name, data.bankData.bic || '');
        }
      })
      .catch(function () {
        // Silent fallback: BIC & Bank Name remain optional for SEPA mandates
      });
  }

  /**
   * Inline Validation Helpers
   */
  function showFieldError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    if (input) input.classList.add('input-invalid');
    if (err) err.classList.remove('hidden');
  }

  function hideFieldError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    if (input) input.classList.remove('input-invalid');
    if (err) err.classList.add('hidden');
  }

  function setupInlineValidationClearers() {
    const pairs = [
      ['firstName', 'firstNameError'],
      ['lastName', 'lastNameError'],
      ['email', 'emailError'],
      ['street', 'streetError'],
      ['houseNumber', 'houseNumberError'],
      ['zip', 'zipError'],
      ['city', 'cityError'],
      ['accountHolder', 'accountHolderError']
    ];

    pairs.forEach(function (pair) {
      const el = document.getElementById(pair[0]);
      if (el) {
        el.addEventListener('input', function () {
          hideFieldError(pair[0], pair[1]);
        });
      }
    });

    [consentStatute, consentPrivacy].forEach(function (cb) {
      if (cb) {
        cb.addEventListener('change', function () {
          if (consentStatute?.checked && consentPrivacy?.checked && consentError) {
            consentError.classList.add('hidden');
          }
        });
      }
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Primary Form Submission Handler
   */
  async function handleFormSubmit(e) {
    e.preventDefault();

    // Clear previous error states
    signatureWrapper?.classList.remove('is-invalid');
    if (signatureError) signatureError.classList.add('hidden');
    if (consentError) consentError.classList.add('hidden');

    // Ensure smart street split ran if user autofilled right before submitting
    if (streetInput && houseNumberInput && houseNumberInput.value.trim() === '') {
      streetInput.dispatchEvent(new Event('change'));
    }

    // Collect values
    const firstName = firstNameInput?.value.trim() || '';
    const lastName = lastNameInput?.value.trim() || '';
    const birthDate = birthDateInput?.value.trim() || '';
    const street = streetInput?.value.trim() || '';
    const houseNumber = houseNumberInput?.value.trim() || '';
    const zip = zipInput?.value.trim() || '';
    const city = cityInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const phone = phoneInput?.value.trim() || '';
    const childName = document.getElementById('childName')?.value.trim() || '';
    const childGroup = document.getElementById('childGroup')?.value.trim() || '';

    // Contribution amount
    const checkedRadio = document.querySelector('input[name="feePreset"]:checked');
    let contributionAmount = checkedRadio ? checkedRadio.value : '24';
    if (contributionAmount === 'custom') {
      contributionAmount = customAmountInput?.value.trim() || '0';
    }
    const numericFee = parseFloat(contributionAmount);
    const minFee = (window.APP_CONFIG && window.APP_CONFIG.MIN_ANNUAL_FEE) || 12;

    // Sync Account Holder if sameAsMember is checked
    if (sameAsMemberCheckbox && sameAsMemberCheckbox.checked && accountHolderInput) {
      accountHolderInput.value = `${firstName} ${lastName}`.trim();
    }
    const accountHolder = accountHolderInput?.value.trim() || `${firstName} ${lastName}`.trim();
    const iban = ibanInput?.value.trim() || '';
    const bic = bicInput?.value.trim() || '';
    const bankName = bankNameInput?.value.trim() || '';

    // Validate all required fields inline and collect first invalid element
    let firstInvalidEl = null;
    function markInvalid(el, inputId, errorId) {
      showFieldError(inputId, errorId);
      if (!firstInvalidEl && el) firstInvalidEl = el;
    }

    if (isNaN(numericFee) || numericFee < minFee) {
      const customRadio = document.querySelector('input[name="feePreset"][value="custom"]');
      if (customRadio && !customRadio.checked) {
        customRadio.checked = true;
        customRadio.dispatchEvent(new Event('change'));
      }
      updateCustomMonthlyHint();
      markInvalid(customAmountInput, 'customAmount', 'customAmountError');
    }
    if (!firstName) markInvalid(firstNameInput, 'firstName', 'firstNameError');
    if (!lastName) markInvalid(lastNameInput, 'lastName', 'lastNameError');
    if (!isValidEmail(email)) markInvalid(emailInput, 'email', 'emailError');
    if (!street) markInvalid(streetInput, 'street', 'streetError');
    if (!houseNumber) markInvalid(houseNumberInput, 'houseNumber', 'houseNumberError');
    if (!/^\d{5}$/.test(zip)) markInvalid(zipInput, 'zip', 'zipError');
    if (!city) markInvalid(cityInput, 'city', 'cityError');
    if (!isValidIBANChecksum(iban)) markInvalid(ibanInput, 'iban', 'ibanError');
    if (!accountHolder) {
      if (accountHolderWrapper) accountHolderWrapper.classList.remove('hidden');
      markInvalid(accountHolderInput, 'accountHolder', 'accountHolderError');
    }

    // Check Signature
    if (!window.SignatureController || window.SignatureController.isEmpty()) {
      signatureWrapper?.classList.add('is-invalid');
      if (signatureError) signatureError.classList.remove('hidden');
      if (!firstInvalidEl) firstInvalidEl = signatureWrapper;
    }

    // Check Consent
    if (!consentStatute?.checked || !consentPrivacy?.checked) {
      if (consentError) consentError.classList.remove('hidden');
      if (!firstInvalidEl) firstInvalidEl = consentStatute;
    }

    // If any validation failed, smoothly scroll to the first invalid field
    if (firstInvalidEl) {
      firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof firstInvalidEl.focus === 'function') {
        setTimeout(function () {
          firstInvalidEl.focus({ preventScroll: true });
        }, 350);
      }
      return;
    }

    const signatureDataUrl = window.SignatureController.getDataURL();
    const generatedMandateRef = `WW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

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
      mandateRef: generatedMandateRef,
      submissionDate: new Date().toISOString()
    };

    lastGeneratedPdfData = {
      formData,
      signatureDataUrl
    };

    setButtonLoading(true);

    try {
      // 1. Generate PDF in memory (WITHOUT triggering an unexpected auto-download)
      const pdfResult = window.PDFGenerator.generateMembershipPDF(formData, signatureDataUrl, {
        autoDownload: false
      });
      lastGeneratedPdfResult = pdfResult;
      const generatedFileName = pdfResult.fileName;

      // Extract Base64 PDF so Code.gs can auto-file the signed PDF straight into the locked Google Drive folder
      let pdfBase64 = '';
      try {
        if (pdfResult && pdfResult.doc) {
          const dataUri = pdfResult.doc.output('datauristring');
          pdfBase64 = dataUri.indexOf(',') !== -1 ? dataUri.split(',')[1] : dataUri;
        }
      } catch (pdfErr) {
        console.warn('[App] Could not extract PDF base64 for auto-filing:', pdfErr);
      }

      // 2. Non-blocking background fetch to Google Sheets Write-Only webhook
      const webhookUrl = window.APP_CONFIG ? window.APP_CONFIG.DATABASE_WEBHOOK_URL : '';
      if (webhookUrl && webhookUrl.trim() !== '') {
        sendToWebhook(webhookUrl, formData, pdfBase64);
      }

      // 3. Prepare Mailto URL and Share Text (with [MITGLIEDSANTRAG] prefix for automatic separation)
      const recipient = (window.APP_CONFIG && window.APP_CONFIG.RECIPIENT_EMAIL) || 'foerdervereinweserwichtel@gmail.com';
      const prefix = (window.APP_CONFIG && window.APP_CONFIG.APPLICATION_SUBJECT_PREFIX) || '[MITGLIEDSANTRAG]';
      const mailSubject = `${prefix} ${firstName} ${lastName} (${generatedMandateRef}) - Förderverein Weserwichtel`;
      const mailBodyPlain =
        `>>> BITTE HÄNGEN SIE JETZT NOCH DIE PDF-DATEI ("${generatedFileName}") ÜBER DAS BÜROKLAMMER-SYMBOL (📎) AN DIESE E-MAIL AN! <<<\n\n` +
        `Liebes Team des Fördervereins der Kita Weserwichtel e.V.,\n\n` +
        `hiermit übersende ich meinen ausgefüllten und digital unterschriebenen Antrag auf Mitgliedschaft im Anhang.\n\n` +
        `Name: ${firstName} ${lastName}\n` +
        `Anschrift: ${street} ${houseNumber}, ${zip} ${city}\n` +
        `E-Mail: ${email}\n` +
        `Telefon: ${phone || '–'}\n` +
        `Mandatsreferenz: ${generatedMandateRef}\n` +
        `Jahresbeitrag: ${numericFee.toFixed(2)} €\n\n` +
        `Viele Grüße\n` +
        `${firstName} ${lastName}`;

      lastMailSubject = mailSubject;
      lastMailBodyPlain = mailBodyPlain;

      lastShareText =
        `Liebes Team des Fördervereins der Kita Weserwichtel e.V.,\n\n` +
        `anbei mein digital unterschriebener Mitgliedsantrag (${firstName} ${lastName}, Mandatsreferenz ${generatedMandateRef}, Jahresbeitrag ${numericFee.toFixed(2)} €).\n\n` +
        `Empfänger-E-Mail: ${recipient}`;

      lastMailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBodyPlain)}`;

      // 4. Open the calm Step-by-Step Confirmation Modal
      openSuccessModal(generatedFileName, pdfResult.file);

    } catch (err) {
      console.error('[App] Error during submission flow:', err);
    } finally {
      setButtonLoading(false);
    }
  }

  /**
   * Non-blocking background webhook dispatch (Write-Only Registration + Auto-Filing Signed PDF to Google Drive)
   */
  function sendToWebhook(url, data, pdfBase64) {
    if (!url || typeof url !== 'string' || url.trim() === '') return;

    const payload = {
      action: 'register',
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
      mandateRef: data.mandateRef || '',
      pdfBase64: pdfBase64 || '',
      timestamp: new Date().toISOString()
    };

    const isGoogleAppsScript = url.includes('script.google.com');

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': isGoogleAppsScript ? 'text/plain;charset=utf-8' : 'application/json'
      },
      body: JSON.stringify(payload),
      mode: isGoogleAppsScript ? 'no-cors' : 'cors'
    }).catch(function (error) {
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
      if (submitBtnText) submitBtnText.textContent = 'PDF wird erstellt...';
    } else {
      submitBtn.disabled = false;
      if (submitSpinner) submitSpinner.classList.add('hidden');
      if (submitBtnText) submitBtnText.textContent = 'PDF-Antrag jetzt erstellen & absenden';
    }
  }

  /**
   * Checks if the current browser supports Web Share API Level 2 with PDF files
   */
  function canNativeShareFile(file) {
    if (!file || typeof navigator === 'undefined') return false;
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
    try {
      return navigator.canShare({ files: [file] });
    } catch (e) {
      return false;
    }
  }

  /**
   * Modal control
   */
  function openSuccessModal(fileName, pdfFile) {
    const fileNameDisplay = document.getElementById('downloadedFileName');
    if (fileNameDisplay) {
      fileNameDisplay.textContent = fileName;
    }

    // Reset Step 1 button and badge for fresh modal open
    if (modalPdfBtn) {
      modalPdfBtn.innerHTML = '<span>💾 Jetzt PDF-Datei herunterladen</span>';
      modalPdfBtn.className = 'mt-3 w-full inline-flex justify-center items-center gap-2 py-2.5 px-3 rounded-lg bg-[#1B4D3E] hover:bg-[#14382D] text-white font-bold text-xs shadow-sm transition-all';
    }
    if (step1StatusBadge) {
      step1StatusBadge.textContent = 'Bereit';
      step1StatusBadge.className = 'text-[11px] font-semibold text-[#D97706] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full shrink-0';
    }

    // Show Native Mobile Share option if device supports sharing files (e.g., iPhone / Android)
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const canShare = canNativeShareFile(pdfFile);

    if (nativeShareSection) {
      if (canShare || (isMobileDevice && typeof navigator.share === 'function')) {
        nativeShareSection.classList.remove('hidden');
      } else {
        nativeShareSection.classList.add('hidden');
      }
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

  function copyRecipientEmailToClipboard() {
    const recipient = (window.APP_CONFIG && window.APP_CONFIG.RECIPIENT_EMAIL) || 'foerdervereinweserwichtel@gmail.com';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(recipient).then(function () {
        if (copyEmailBtn) {
          const orig = copyEmailBtn.textContent;
          copyEmailBtn.textContent = '✓ Kopiert!';
          setTimeout(function () {
            copyEmailBtn.textContent = orig;
          }, 2500);
        }
      }).catch(function () {});
    }
  }

  function setupModalListeners() {
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', closeSuccessModal);
    }

    // Close modal when clicking backdrop
    if (successModal) {
      successModal.addEventListener('click', function (e) {
        if (e.target === successModal) {
          closeSuccessModal();
        }
      });
    }

    // Copy recipient email button
    if (copyEmailBtn) {
      copyEmailBtn.addEventListener('click', copyRecipientEmailToClipboard);
    }

    // Native Share Button (attaches actual PDF file on iOS / Android!)
    if (modalNativeShareBtn) {
      modalNativeShareBtn.addEventListener('click', async function () {
        if (!lastGeneratedPdfResult) return;
        copyRecipientEmailToClipboard();

        const shareData = {
          title: 'Mitgliedsantrag Förderverein Weserwichtel',
          text: lastShareText
        };

        // If file sharing is supported, attach the PDF File object
        if (lastGeneratedPdfResult.file && canNativeShareFile(lastGeneratedPdfResult.file)) {
          shareData.files = [lastGeneratedPdfResult.file];
        }

        try {
          await navigator.share(shareData);
        } catch (err) {
          if (err && err.name !== 'AbortError') {
            console.warn('[App] Native share fallback to mailto:', err);
            if (lastMailtoUrl) window.location.href = lastMailtoUrl;
          }
        }
      });
    }

    // Step 2: Open Mail Options
    // A) Default OS Mail client (Apple Mail, Thunderbird, Outlook desktop)
    function openDefaultMailApp() {
      if (lastMailtoUrl) {
        window.location.href = lastMailtoUrl;
      }
    }
    if (modalMailtoBtn) modalMailtoBtn.addEventListener('click', openDefaultMailApp);
    if (modalMailDefaultBtn) modalMailDefaultBtn.addEventListener('click', openDefaultMailApp);

    // B) Gmail Web (Direct compose window with recipient, subject, and body pre-filled)
    if (modalMailGmailBtn) {
      modalMailGmailBtn.addEventListener('click', function () {
        const recipient = (window.APP_CONFIG && window.APP_CONFIG.RECIPIENT_EMAIL) || 'foerdervereinweserwichtel@gmail.com';
        copyRecipientEmailToClipboard();
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(lastMailSubject)}&body=${encodeURIComponent(lastMailBodyPlain)}`;
        window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      });
    }

    // C) ProtonMail Web (Direct compose window)
    if (modalMailProtonBtn) {
      modalMailProtonBtn.addEventListener('click', function () {
        const recipient = (window.APP_CONFIG && window.APP_CONFIG.RECIPIENT_EMAIL) || 'foerdervereinweserwichtel@gmail.com';
        copyRecipientEmailToClipboard();
        const protonUrl = `https://mail.proton.me/u/0/compose?to=${encodeURIComponent(recipient)}&subject=${encodeURIComponent(lastMailSubject)}&body=${encodeURIComponent(lastMailBodyPlain)}`;
        window.open(protonUrl, '_blank', 'noopener,noreferrer');
      });
    }

    // D) Outlook Web / Office 365
    if (modalMailOutlookBtn) {
      modalMailOutlookBtn.addEventListener('click', function () {
        const recipient = (window.APP_CONFIG && window.APP_CONFIG.RECIPIENT_EMAIL) || 'foerdervereinweserwichtel@gmail.com';
        copyRecipientEmailToClipboard();
        const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(recipient)}&subject=${encodeURIComponent(lastMailSubject)}&body=${encodeURIComponent(lastMailBodyPlain)}`;
        window.open(outlookUrl, '_blank', 'noopener,noreferrer');
      });
    }

    // Step 1: Download PDF on explicit user click
    if (modalPdfBtn) {
      modalPdfBtn.addEventListener('click', function () {
        if (lastGeneratedPdfResult && lastGeneratedPdfResult.doc) {
          lastGeneratedPdfResult.doc.save(lastGeneratedPdfResult.fileName);
        } else if (lastGeneratedPdfData && window.PDFGenerator) {
          lastGeneratedPdfResult = window.PDFGenerator.generateMembershipPDF(
            lastGeneratedPdfData.formData,
            lastGeneratedPdfData.signatureDataUrl,
            { autoDownload: true }
          );
        }

        // Update UI to show it has been saved to device
        modalPdfBtn.innerHTML = '<span>✓ PDF gespeichert (erneut herunterladen)</span>';
        modalPdfBtn.classList.remove('bg-[#1B4D3E]', 'hover:bg-[#14382D]', 'text-white');
        modalPdfBtn.classList.add('bg-white', 'hover:bg-[#F7F4EC]', 'text-[#1B4D3E]', 'border', 'border-[#D4CEBE]');
        if (step1StatusBadge) {
          step1StatusBadge.textContent = 'Gespeichert ✓';
          step1StatusBadge.className = 'text-[11px] font-semibold text-[#1B4D3E] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full shrink-0';
        }
      });
    }
  }

})();
