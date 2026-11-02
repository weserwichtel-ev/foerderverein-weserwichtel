/**
 * ==============================================================================
 * Förderverein der Kita Weserwichtel e.V.
 * Google Apps Script Webhook für Mitgliederverwaltung in Google Sheets
 * ==============================================================================
 * 
 * Anleitung zur Einrichtung:
 * 1. Mit dem Google-Konto des Vereins (FoerdervereinKitaWeserwichtel@gmail.com)
 *    ein neues Google Sheet erstellen (z.B. "Mitgliederverwaltung Förderverein").
 * 2. Im Menü: "Erweiterungen" -> "Apps Script" öffnen.
 * 3. Diesen gesamten Code in "Code.gs" einfügen und speichern.
 * 4. Oben rechts auf "Bereitstellen" -> "Neue Bereitstellung" klicken:
 *    - Typ: "Web-App"
 *    - Beschreibung: "Mitglieder Webhook v1"
 *    - Ausführen als: "Ich (FoerdervereinKitaWeserwichtel@gmail.com)"
 *    - Wer hat Zugriff: "Jeder" (Anyone)
 * 5. Die generierte Web-App-URL kopieren und in assets/js/config.js bei
 *    DATABASE_WEBHOOK_URL eintragen.
 */

// Spaltenüberschriften für das Google Sheet
const SHEET_HEADERS = [
  'Eingangsdatum',
  'Status',
  'Nachname',
  'Vorname',
  'E-Mail',
  'Telefon',
  'Straße & Hausnr.',
  'PLZ & Ort',
  'Geburtsdatum',
  'Name des Kindes',
  'Kita-Gruppe',
  'Jahresbeitrag (€)',
  'Kontoinhaber',
  'IBAN',
  'BIC',
  'Kreditinstitut',
  'PDF-Eingang per E-Mail',
  'Notizen'
];

/**
 * Health-Check / Statusabfrage im Browser
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    verein: 'Förderverein der Kita Weserwichtel e.V.',
    message: 'Webhook-Endpunkt ist aktiv und empfangsbereit.'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Empfängt Formulardaten und fügt eine neue Zeile in Google Sheets ein
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Verhindert Überschneidungen bei gleichzeitigen Anfragen
  lock.tryLock(10000);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Automatische Initialisierung der Kopfzeile bei leerem Tabellenblatt
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(SHEET_HEADERS);
      const headerRange = sheet.getRange(1, 1, 1, SHEET_HEADERS.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f0f9ff'); // Hellblau
      headerRange.setFontColor('#0369a1');
      sheet.setFrozenRows(1);
    }

    // JSON-Payload parsen
    let data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    // Deutsches Datumsformat für den Zeitstempel (Berlin)
    const timestampStr = Utilities.formatDate(new Date(), 'Europe/Berlin', 'dd.MM.yyyy HH:mm:ss');

    // Zusammenfassung Adresse
    const addressStr = `${data.street || ''} ${data.houseNumber || ''}`.trim();
    const cityStr = `${data.zip || ''} ${data.city || ''}`.trim();

    // Beitrag formatieren
    const fee = data.contributionAmount ? parseFloat(data.contributionAmount).toFixed(2) : '24.00';

    // DATENSCHUTZ-HINWEIS (DSGVO):
    // Es wird bewusst KEINE digitale Unterschrift / Bilddatei gespeichert!
    // Die Unterschrift verbleibt ausschließlich im PDF-Dokument des Mitglieds.
    const newRow = [
      timestampStr,
      'Neu eingegangen',
      data.lastName || '',
      data.firstName || '',
      data.email || '',
      data.phone || '',
      addressStr,
      cityStr,
      data.birthDate || '',
      data.childName || '',
      data.childGroup || '',
      fee,
      data.accountHolder || '',
      data.iban || '',
      data.bic || '',
      data.bankName || '',
      'Wartet auf E-Mail',
      ''
    ];

    sheet.appendRow(newRow);

    return ContentService.createTextOutput(JSON.stringify({
      result: 'success',
      row: sheet.getLastRow(),
      message: 'Mitgliedsantrag erfolgreich in Google Sheets eingetragen.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      result: 'error',
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}
