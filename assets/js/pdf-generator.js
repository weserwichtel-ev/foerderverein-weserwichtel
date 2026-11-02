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
   * Generates and downloads the official A4 PDF document.
   * @param {Object} data - Clean form data object
   * @param {string} signatureDataUrl - Base64 PNG data URL of signature
   * @returns {jsPDF} The generated jsPDF instance
   */
  function generateMembershipPDF(data, signatureDataUrl) {
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
      RECIPIENT_EMAIL: 'tanja.ganser@ib.de'
    };

    const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2); // 180 mm
    let y = 15;

    // --- Header Section ---
    // Background accent bar
    doc.setFillColor(2, 132, 199); // Sky-600
    doc.rect(margin, y, contentWidth, 2.5, 'F');
    y += 8;

    // Association title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(config.ASSOCIATION_NAME, margin, y);

    // City & Date (Right aligned)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    const todayStr = formatDateGerman();
    doc.text(`Datum: ${todayStr}`, pageWidth - margin, y, { align: 'right' });
    y += 5.5;

    // Subtitle / Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(234, 88, 12); // Orange-600
    doc.text('BEITRITTSERKLÄRUNG & SEPA-LASTSCHRIFTMANDAT', margin, y);
    y += 7;

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
    doc.setTextColor(2, 132, 199);
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
    doc.text(data.birthDate ? formatDateGerman(new Date(data.birthDate)) : '–', col2 + 25, rowY);

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
    doc.setTextColor(234, 88, 12);
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
    doc.setTextColor(2, 132, 199);
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
    doc.setTextColor(2, 132, 199);
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

    // Save PDF file
    const safeLastName = sanitizeFilename(data.lastName || 'Mitglied');
    const fileName = `Mitgliedsantrag_Weserwichtel_${safeLastName}.pdf`;
    doc.save(fileName);

    return {
      doc,
      fileName
    };
  }

  // Expose PDFGenerator to global window scope
  window.PDFGenerator = {
    generateMembershipPDF: generateMembershipPDF,
    formatDateGerman: formatDateGerman,
    formatIBAN: formatIBAN
  };

})(window);
