/**
 * Förderverein der Kita Weserwichtel e.V.
 * Client-Side PDF Generator for Membership Application & SEPA Mandate
 * Utilizes jsPDF (https://github.com/parallax/jsPDF)
 */

(function (window) {
  'use strict';

  /**
   * Helper to format today's date in German format (DD.MM.YYYY)
   */
  function formatDateGerman(date = new Date()) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
  }

  /**
   * Formats a birthDate string (accepts DD.MM.YYYY or YYYY-MM-DD) into DD.MM.YYYY
   */
  function formatBirthDate(val) {
    if (!val || typeof val !== 'string') return '–';
    const trimmed = val.trim();
    if (!trimmed) return '–';
    // Already in DD.MM.YYYY format
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    // ISO YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return formatDateGerman(parsed);
    }
    return trimmed;
  }

  /**
   * Format IBAN into readable 4-character chunks
   */
  function formatIBAN(iban) {
    if (!iban) return '';
    return iban.replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
  }

  /**
   * Sanitize text for filenames
   */
  function sanitizeFilename(text) {
    return text.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
  }

  /**
   * Generates and optionally downloads the official A4 PDF document.
   * @param {Object} data - Clean form data object
   * @param {string} signatureDataUrl - Base64 PNG data URL of signature
   * @param {Object} [options] - { autoDownload: boolean }
   * @returns {Object} { doc, fileName, blob, file }
   */
  function generateMembershipPDF(data, signatureDataUrl, options) {
    const opts = Object.assign({ autoDownload: true }, options || {});
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
      throw new Error('jsPDF library is not loaded. Please ensure jspdf.umd.min.js is included.');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const config = window.APP_CONFIG || {
      ASSOCIATION_NAME: 'Förderverein der Kita Weserwichtel e.V.',
      CREDITOR_ID: 'DE83ZZZ00002910027',
      RECIPIENT_EMAIL: 'foerdervereinweserwichtel@gmail.com'
    };

    const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2); // 180 mm
    let y = 15;

    // Embedded Kita Weserwichtel Sign Logo (480x164 PNG)
    const LOGO_DATA_URL = 'data:image/png;base64,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';

    // --- Header Section (Kita Weserwichtel Sign Identity) ---
    // Top accent bar in Wichtel Green & Weserwichtel Burgundy
    doc.setFillColor(69, 18, 23); // Weserwichtel Burgundy (#451217)
    doc.rect(margin, y, contentWidth * 0.68, 2.2, 'F');
    doc.setFillColor(22, 157, 32); // Wichtel Green (#169d20)
    doc.rect(margin + contentWidth * 0.68, y, contentWidth * 0.32, 2.2, 'F');
    y += 7.5;

    // Embed Kita Weserwichtel Sign on top-right
    try {
      doc.addImage(LOGO_DATA_URL, 'PNG', pageWidth - margin - 52, y - 4.5, 52, 17.7);
    } catch (e) {
      // Fallback if image embedding is skipped
    }

    // Association title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(69, 18, 23); // Weserwichtel Burgundy
    doc.text(config.ASSOCIATION_NAME, margin, y);
    y += 5.2;

    // Subtitle / Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(21, 128, 61); // Wichtel Green (#15803d)
    doc.text('BEITRITTSERKLÄRUNG & SEPA-LASTSCHRIFTMANDAT', margin, y);

    // Date below subtitle
    const todayStr = formatDateGerman();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Stand / Datum: ${todayStr} • Weserstraße 106, 12059 Berlin`, margin, y + 4.5);
    y += 8.5;

    // Light divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // --- Section 1: Persönliche Angaben des Mitglieds ---
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.roundedRect(margin, y, contentWidth, 48, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 48, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(69, 18, 23);
    doc.text('1. PERSÖNLICHE ANGABEN DES MITGLIEDS', margin + 4, y + 6);

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    const col1 = margin + 4;
    const col2 = margin + 92;
    let rowY = y + 13;

    // Row 1: Name
    doc.setFont('helvetica', 'bold');
    doc.text('Name, Vorname:', col1, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.lastName || ''}, ${data.firstName || ''}`, col1 + 30, rowY);

    doc.setFont('helvetica', 'bold');
    doc.text('Geburtsdatum:', col2, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatBirthDate(data.birthDate), col2 + 25, rowY);

    // Row 2: Straße & PLZ/Ort
    rowY += 6.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Straße / Nr.:', col1, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.street || ''} ${data.houseNumber || ''}`.trim(), col1 + 30, rowY);

    doc.setFont('helvetica', 'bold');
    doc.text('PLZ / Ort:', col2, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.zip || ''} ${data.city || ''}`.trim(), col2 + 25, rowY);

    // Row 3: E-Mail & Telefon
    rowY += 6.5;
    doc.setFont('helvetica', 'bold');
    doc.text('E-Mail:', col1, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(data.email || '–', col1 + 30, rowY);

    doc.setFont('helvetica', 'bold');
    doc.text('Telefon:', col2, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(data.phone || '–', col2 + 25, rowY);

    // Row 4: Bezug zur Kita (Kind & Gruppe)
    rowY += 6.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Kind in Kita:', col1, rowY);
    doc.setFont('helvetica', 'normal');
    const childInfo = data.childName ? `${data.childName} ${data.childGroup ? '(' + data.childGroup + ')' : ''}` : 'Förderer / Kein Kind in der Kita';
    doc.text(childInfo, col1 + 30, rowY);

    // Row 5: Mitgliedsbeitrag
    rowY += 6.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Jahresbeitrag:', col1, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    const amountVal = parseFloat(data.contributionAmount || 24).toFixed(2);
    doc.text(`${amountVal} € / Jahr (Fälligkeit jährlich)`, col1 + 30, rowY);
    doc.setTextColor(15, 23, 42);

    y += 52;

    // --- Section 2: SEPA-Basislastschriftmandat ---
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 74, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 74, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(69, 18, 23);
    doc.text('2. SEPA-BASISLASTSCHRIFTMANDAT', margin + 4, y + 6);

    // Creditor ID & Mandate Reference Banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Gläubiger-Identifikationsnummer:', margin + 4, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(config.CREDITOR_ID, margin + 55, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.text('Mandatsreferenz:', margin + 105, y + 12);
    doc.setFont('helvetica', 'normal');
    const mandateRef = data.mandateRef || `WW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    doc.text(mandateRef, margin + 135, y + 12);

    // Legal Mandate Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const sepaLegalNotice =
      'Ich ermächtige den Förderverein der Kita Weserwichtel e.V., Zahlungen von meinem Konto mittels Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die vom Förderverein der Kita Weserwichtel e.V. auf mein Konto gezogenen Lastschriften einzulösen.\n' +
      'Hinweis: Ich kann innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, die Erstattung des belasteten Betrages verlangen. Es gelten dabei die mit meinem Kreditinstitut vereinbarten Bedingungen.';
    const splitLegal = doc.splitTextToSize(sepaLegalNotice, contentWidth - 8);
    doc.text(splitLegal, margin + 4, y + 18);

    // Bank Details Table
    let bankY = y + 36;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 4, bankY, pageWidth - margin - 4, bankY);
    bankY += 5;

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    // Kontoinhaber
    doc.setFont('helvetica', 'bold');
    doc.text('Kontoinhaber:', col1, bankY);
    doc.setFont('helvetica', 'normal');
    doc.text(data.accountHolder || `${data.firstName || ''} ${data.lastName || ''}`.trim(), col1 + 30, bankY);

    // Kreditinstitut
    doc.setFont('helvetica', 'bold');
    doc.text('Kreditinstitut:', col2, bankY);
    doc.setFont('helvetica', 'normal');
    doc.text(data.bankName || '–', col2 + 25, bankY);

    bankY += 6.5;

    // IBAN & BIC
    doc.setFont('helvetica', 'bold');
    doc.text('IBAN:', col1, bankY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatIBAN(data.iban), col1 + 30, bankY);

    doc.setFont('helvetica', 'bold');
    doc.text('BIC:', col2, bankY);
    doc.setFont('helvetica', 'normal');
    doc.text(data.bic ? data.bic.toUpperCase() : '–', col2 + 25, bankY);

    y += 78;

    // --- Section 3: Erklärung & Digitale Unterschrift ---
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 54, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 54, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(69, 18, 23);
    doc.text('3. EINVERSTÄNDNISERKLÄRUNG & UNTERSCHRIFT', margin + 4, y + 6);

    // Privacy & Statute statement
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const consentText =
      'Mit meiner Unterschrift erkenne ich die Satzung des Fördervereins der Kita Weserwichtel e.V. an und willige in die satzungsgemäße Erhebung und Verarbeitung meiner personenbezogenen Daten zum Zwecke der Mitgliederverwaltung und des Beitragseinzugs ein (DSGVO Art. 6 Abs. 1 lit. b).';
    const splitConsent = doc.splitTextToSize(consentText, contentWidth - 8);
    doc.text(splitConsent, margin + 4, y + 12);

    // Location, Date & Signature line
    const signAreaY = y + 26;
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ort, Datum:`, margin + 4, signAreaY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.city || 'Berlin'}, den ${todayStr}`, margin + 26, signAreaY + 12);

    // Insert Signature image if available
    const sigBoxX = margin + 95;
    const sigBoxWidth = 75;
    const sigBoxHeight = 16;
    if (signatureDataUrl) {
      try {
        doc.addImage(signatureDataUrl, 'PNG', sigBoxX, signAreaY - 4, sigBoxWidth, sigBoxHeight);
      } catch (err) {
        console.error('[PDFGenerator] Error embedding signature image:', err);
      }
    }

    // Underline for signature
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(sigBoxX, signAreaY + 12, sigBoxX + sigBoxWidth, signAreaY + 12);

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Rechtsverbindliche Unterschrift (Mitglied / Kontoinhaber)', sigBoxX, signAreaY + 16);

    // --- Footer ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    const footerY = 286;
    doc.text(
      `${config.ASSOCIATION_NAME} • Kontakt: ${config.RECIPIENT_EMAIL} • Gläubiger-ID: ${config.CREDITOR_ID}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );

    // Prepare filename, Blob, and File object for sharing/downloading
    const safeLastName = sanitizeFilename(data.lastName || 'Mitglied');
    const fileName = `Mitgliedsantrag_Weserwichtel_${safeLastName}.pdf`;
    const blob = doc.output('blob');
    let file = null;
    try {
      file = new File([blob], fileName, { type: 'application/pdf' });
    } catch (e) {
      // Fallback for older browsers without File constructor
    }

    if (opts.autoDownload) {
      doc.save(fileName);
    }

    return {
      doc,
      fileName,
      blob,
      file
    };
  }

  // Expose PDFGenerator to global window scope
  window.PDFGenerator = {
    generateMembershipPDF: generateMembershipPDF,
    formatDateGerman: formatDateGerman,
    formatBirthDate: formatBirthDate,
    formatIBAN: formatIBAN
  };

})(window);
