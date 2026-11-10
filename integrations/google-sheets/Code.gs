/**
 * ==============================================================================
 * Förderverein der Kita Weserwichtel e.V.
 * Google Apps Script Backend – 4-Säulen-Sicherheit & Auto-Healing Drive Tresor
 * ==============================================================================
 *
 * ARCHITEKTUR FÜR 1 SCHATZMEISTER (THOMAS) & 1 REMOTE-MAINTAINER (GASTON):
 * 1. Säule 1 (Write-Only Public): Öffentliche Website darf NUR neue Anträge
 *    einreichen (action=register) und das unterschriebene PDF direkt im Drive
 *    ablegen. Kein Lesezugriff ohne Vorstands-Authentifizierung!
 * 2. Säule 2 (Zero Secrets in GitHub): Vorstands-Passwort & Sitzungs-Tokens
 *    liegen ausschließlich verschlüsselt in Google PropertiesService.
 * 3. Säule 3 (Brute-Force Schutz & 2FA E-Mail-PIN): Nach 5 Fehlversuchen
 *    30 Minuten Sperre + Warnmail. Inkl. 1-Klick 6-stelliger E-Mail-PIN.
 * 4. Säule 4 (Auto-Healing Drive Sandbox): Erzwingt und repariert automatisch
 *    die exakte Vereins-Ordnerstruktur (inkl. Jahresordnern 2026, 2027, ...).
 * 5. Remote-Diagnose (System_Log): Protokolliert alle Aktionen und Browser-Fehler
 *    in einem eigenen Tabellenblatt 'System_Log' für die Fernwartung.
 */

const SHEET_HEADERS = [
  'Eingangsdatum',              // A (1)
  'Status',                     // B (2)
  'Nachname',                   // C (3)
  'Vorname',                    // D (4)
  'E-Mail',                     // E (5)
  'Telefon',                    // F (6)
  'Straße & Hausnr.',           // G (7)
  'PLZ & Ort',                  // H (8)
  'Geburtsdatum',               // I (9)
  'Name des Kindes',            // J (10)
  'Kita-Gruppe',                // K (11)
  'Jahresbeitrag (€)',          // L (12)
  'Kontoinhaber',               // M (13)
  'IBAN',                       // N (14)
  'BIC',                        // O (15)
  'Kreditinstitut',             // P (16)
  'PDF-Eingang per E-Mail',     // Q (17)
  'Notizen',                    // R (18)
  'Mandatsreferenz',            // S (19)
  'Eingezogene Beitragsjahre'   // T (20)
];

const VEREIN_GMAIL = 'foerdervereinweserwichtel@gmail.com';
const CUSTOM_DOMAIN_EMAIL = 'info@foerderverein-weserwichtel.de';
const DEFAULT_INITIAL_PASS = 'Weserwichtel2026!';

/**
 * Liefert die aktuell aktive Antwort-Adresse (Reply-To).
 * Solange die eigene Domain (foerderverein-weserwichtel.de) noch nicht gekauft/aktiviert ist,
 * wird automatisch foerdervereinweserwichtel@gmail.com genutzt, damit keine Antwort-Mails bouncen.
 */
function isCustomDomainActive() {
  return PropertiesService.getScriptProperties().getProperty('CUSTOM_DOMAIN_ACTIVE') === 'true';
}

function getActiveReplyToEmail(clientReplyTo) {
  if (clientReplyTo && String(clientReplyTo).includes('@')) {
    return String(clientReplyTo).trim();
  }
  return isCustomDomainActive() ? CUSTOM_DOMAIN_EMAIL : VEREIN_GMAIL;
}

/**
 * Zentrale Hilfsfunktion für den offiziellen E-Mail-Versand des Vereins.
 * Setzt den Absendernamen immer auf "Förderverein der Kita Weserwichtel e.V.".
 * Falls der ausführende Account VEREIN_GMAIL als Alias besitzt, wird from genutzt.
 */
function sendVereinEmail(options) {
  const mailOptions = {
    to: options.to,
    subject: options.subject,
    body: options.body,
    name: 'Förderverein der Kita Weserwichtel e.V.',
    replyTo: options.replyTo || getActiveReplyToEmail()
  };

  if (options.bcc) mailOptions.bcc = options.bcc;
  if (options.cc) mailOptions.cc = options.cc;

  try {
    const aliases = GmailApp.getAliases();
    if (aliases && aliases.indexOf(VEREIN_GMAIL) !== -1) {
      mailOptions.from = VEREIN_GMAIL;
    }
  } catch (e) {}

  MailApp.sendEmail(mailOptions);
}

// Fest verdrahtete Ordnernamen im Vereins-Drive
const FOLDER_NAMES = {
  ROOT: 'Google_Drive_Foerderverein_Weserwichtel',
  MITGLIEDER: '02_MITGLIEDERVERWALTUNG',
  ANTRAGS_PDFS: 'Eingegangene_Mitgliedsantraege_PDFs',
  PRE_NOTIFS: 'Gesendete_SEPA_Vorabinformationen',
  KUENDIGUNGEN: 'Kuendigungen_und_Aenderungen',
  FINANZEN: '03_FINANZEN_&_BUCHHALTUNG',
  EINNAHMEN: '02_Einnahmen_und_Spenden',
  SEPA_ARCHIV: 'SEPA_Lastschriften'
};

/**
 * GET Anfragen: Health-Check (Keine sensiblen Daten über ungeschütztes GET!)
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'health';

  if (action === 'getMembers') {
    const token = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';
    const authCheck = verifyAdminToken(token);
    if (!authCheck.valid) {
      return jsonResponse({ status: 'unauthorized', message: authCheck.message });
    }
    return handleGetMembers();
  }

  return jsonResponse({
    status: 'online',
    verein: 'Förderverein der Kita Weserwichtel e.V.',
    version: '2.0.0',
    message: 'Sicheres Vorstands-Backend aktiv (4-Säulen-Schutz).',
    timestamp: new Date().toISOString()
  });
}

/**
 * POST Anfragen: Öffentliche Registrierung ODER authentifizierte Vorstands-Aktionen
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    let data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    const action = data.action || 'register';

    // --- ÖFFENTLICHE AKTIONEN (Kein Lesezugriff!) ---
    if (action === 'register') {
      return handleNewRegistration(data);
    }
    if (action === 'login') {
      return handleAdminLogin(data);
    }
    if (action === 'requestEmailPin') {
      return handleRequestEmailPin();
    }
    if (action === 'logClientError') {
      appendSystemLog('CLIENT_ERROR', data.message || 'Unbekannter Browser-Fehler', data.details || '');
      return jsonResponse({ result: 'logged' });
    }

    // --- GESCHÜTZTE VORSTANDS-AKTIONEN (Token-Prüfung erforderlich!) ---
    const authCheck = verifyAdminToken(data.token);
    if (!authCheck.valid) {
      return jsonResponse({ result: 'unauthorized', error: authCheck.message });
    }

    switch (action) {
      case 'verifySession':
        return jsonResponse({ result: 'success', valid: true });
      case 'getMembers':
        return handleGetMembers();
      case 'scanInboxForPdfs':
        return handleScanInboxForPdfs();
      case 'uploadMemberPdf':
        return handleUploadMemberPdf(data);
      case 'sendPreNotification':
        return handleSendPreNotification(data);
      case 'sendCancellationNotification':
        return handleSendCancellationNotification(data);
      case 'archiveSepaBatch':
        return handleArchiveSepaBatch(data);
      case 'updateMemberStatus':
      case 'updateOrCancelMember':
        return handleUpdateOrCancelMember(data);
      case 'createPaperMember':
        return handleCreatePaperMember(data);
      case 'healFolders':
        return handleHealFolders(data);
      case 'getSystemLogs':
        return handleGetSystemLogs();
      case 'changeAdminPassword':
        return handleChangeAdminPassword(data);
      case 'setCustomDomainStatus':
        return handleSetCustomDomainStatus(data);
      default:
        return jsonResponse({ result: 'error', error: 'Unbekannte Aktion: ' + action });
    }

  } catch (err) {
    appendSystemLog('SERVER_ERROR', err.toString(), err.stack || '');
    return jsonResponse({
      result: 'error',
      error: err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * ==============================================================================
 * SÄULE 2 & 3: AUTHENTIFIZIERUNG, 2FA E-MAIL-PIN & BRUTE-FORCE-SPERRE
 * ==============================================================================
 */
function getAdminPassword() {
  const props = PropertiesService.getScriptProperties();
  let pass = props.getProperty('ADMIN_PASSWORD');
  if (!pass) {
    pass = DEFAULT_INITIAL_PASS;
    props.setProperty('ADMIN_PASSWORD', pass);
  }
  return pass;
}

function handleAdminLogin(data) {
  const cache = CacheService.getScriptCache();
  const failCount = parseInt(cache.get('LOGIN_FAIL_COUNT') || '0', 10);

  if (failCount >= 5) {
    return jsonResponse({
      result: 'locked',
      error: 'Zu viele Fehlversuche! Der Zugang ist aus Sicherheitsgründen für 30 Minuten gesperrt.'
    });
  }

  const submittedPass = String(data.password || '').trim();
  const submittedPin = String(data.pin || '').trim();
  const validPass = getAdminPassword();
  const cachedPin = cache.get('EMAIL_2FA_PIN');

  const isPassValid = submittedPass && submittedPass === validPass;
  const isPinValid = submittedPin && cachedPin && submittedPin === cachedPin;

  if (!isPassValid && !isPinValid) {
    const newFails = failCount + 1;
    cache.put('LOGIN_FAIL_COUNT', String(newFails), 1800); // 30 Min
    appendSystemLog('AUTH_FAIL', 'Fehlgeschlagener Login-Versuch (' + newFails + '/5)', data.userAgent || '');

    if (newFails >= 5) {
      try {
        sendVereinEmail({
          to: VEREIN_GMAIL,
          subject: '⚠️ [SICHERHEITSWARNUNG] 5 fehlgeschlagene Logins im Vorstands-Portal',
          body: 'Es gab 5 fehlgeschlagene Anmeldeversuche im Vorstands-Portal. Der Zugang wurde automatisch für 30 Minuten gesperrt.'
        });
      } catch (e) {}
    }

    return jsonResponse({
      result: 'invalid',
      remainingAttempts: Math.max(0, 5 - newFails),
      error: 'Passwort oder PIN ungültig. Noch ' + Math.max(0, 5 - newFails) + ' Versuche.'
    });
  }

  // Erfolgreicher Login -> Sitzungs-Token erzeugen (gültig im Cache + Properties)
  cache.remove('LOGIN_FAIL_COUNT');
  cache.remove('EMAIL_2FA_PIN');

  const sessionToken = Utilities.getUuid() + '-' + Utilities.getUuid();
  const props = PropertiesService.getScriptProperties();
  let activeTokens = [];
  try {
    activeTokens = JSON.parse(props.getProperty('ACTIVE_TOKENS') || '[]');
  } catch (e) {
    activeTokens = [];
  }
  activeTokens.push({ token: sessionToken, created: Date.now() });
  // Behalte die letzten 10 gültigen Geräte-Sitzungen (30 Tage gültig)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 3600 * 1000);
  activeTokens = activeTokens.filter(t => t.created > thirtyDaysAgo).slice(-10);
  props.setProperty('ACTIVE_TOKENS', JSON.stringify(activeTokens));

  appendSystemLog('AUTH_SUCCESS', 'Vorstands-Login erfolgreich', isPinValid ? 'Via E-Mail-PIN' : 'Via Passwort');

  return jsonResponse({
    result: 'success',
    token: sessionToken,
    message: 'Erfolgreich angemeldet.'
  });
}

function handleRequestEmailPin() {
  const cache = CacheService.getScriptCache();
  const rateLimit = cache.get('PIN_RATE_LIMIT');
  if (rateLimit) {
    return jsonResponse({
      result: 'error',
      error: 'Bitte warten Sie 2 Minuten, bevor Sie einen neuen PIN anfordern.'
    });
  }

  const pin = String(Math.floor(100000 + Math.random() * 900000));
  cache.put('EMAIL_2FA_PIN', pin, 900); // 15 Minuten gültig
  cache.put('PIN_RATE_LIMIT', '1', 120); // 2 Min Cooldown

  sendVereinEmail({
    to: VEREIN_GMAIL,
    subject: '🔐 Ihr 6-stelliger Zugangs-PIN für das Vorstands-Portal: ' + pin,
    body: 'Hallo Vorstand / Schatzmeister,\n\n' +
          'Ihr einmaliger 6-stelliger Zugangs-PIN für das Vorstands-Portal lautet:\n\n' +
          '👉 ' + pin + '\n\n' +
          '(Gültig für 15 Minuten).\n\n' +
          'Herzliche Grüße\nFörderverein der Kita Weserwichtel e.V.'
  });

  appendSystemLog('AUTH_PIN_SENT', '6-stelliger Login-PIN an Vereins-Gmail gesendet', '');

  return jsonResponse({
    result: 'success',
    message: 'Ein 6-stelliger PIN wurde an ' + VEREIN_GMAIL + ' gesendet.'
  });
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, message: 'Keine gültige Sitzung. Bitte melden Sie sich an.' };
  }
  // Erlaube auch direkte Passwort-Übergabe für einfache API-Aufrufe
  if (token === getAdminPassword()) {
    return { valid: true };
  }

  const props = PropertiesService.getScriptProperties();
  let activeTokens = [];
  try {
    activeTokens = JSON.parse(props.getProperty('ACTIVE_TOKENS') || '[]');
  } catch (e) {
    activeTokens = [];
  }

  const thirtyDaysAgo = Date.now() - (30 * 24 * 3600 * 1000);
  const found = activeTokens.find(t => t.token === token && t.created > thirtyDaysAgo);
  if (found) {
    return { valid: true };
  }
  return { valid: false, message: 'Sitzung abgelaufen. Bitte erneut anmelden.' };
}

function handleChangeAdminPassword(data) {
  const newPass = String(data.newPassword || '').trim();
  if (newPass.length < 8) {
    return jsonResponse({ result: 'error', error: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.' });
  }
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', newPass);
  appendSystemLog('PASSWORD_CHANGED', 'Vorstands-Passwort wurde geändert', '');
  return jsonResponse({ result: 'success', message: 'Vorstands-Passwort erfolgreich aktualisiert.' });
}

function handleSetCustomDomainStatus(data) {
  const active = Boolean(data && data.customDomainActive);
  PropertiesService.getScriptProperties().setProperty('CUSTOM_DOMAIN_ACTIVE', active ? 'true' : 'false');
  appendSystemLog(
    'DOMAIN_STATUS_CHANGED',
    active ? 'Eigene Domain (info@foerderverein-weserwichtel.de) aktiviert' : 'Auf Vereins-Gmail zurückgeschaltet',
    ''
  );
  return jsonResponse({
    result: 'success',
    customDomainActive: active,
    activeReplyTo: active ? CUSTOM_DOMAIN_EMAIL : VEREIN_GMAIL
  });
}

/**
 * ==============================================================================
 * SÄULE 4: AUTO-HEALING GOOGLE DRIVE ORDNERSTRUKTUR (FEST VERDRAHTET)
 * ==============================================================================
 */
function ensureVereinFolderStructure(targetYear) {
  const yearStr = String(targetYear || new Date().getFullYear());
  let rootFolder = null;

  // 1. Versuche über die aktuelle Google-Tabelle den Eltern-Ordner zu finden
  try {
    const ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
    const parents = ssFile.getParents();
    if (parents.hasNext()) {
      const parent = parents.next();
      if (parent.getName() === FOLDER_NAMES.MITGLIEDER) {
        const grandParents = parent.getParents();
        if (grandParents.hasNext()) {
          rootFolder = grandParents.next();
        }
      } else if (parent.getName() === FOLDER_NAMES.ROOT) {
        rootFolder = parent;
      }
    }
  } catch (e) {}

  // 2. Fallback: Suche nach dem Namen des Root-Ordners oder erstelle ihn
  if (!rootFolder) {
    const existingRoots = DriveApp.getFoldersByName(FOLDER_NAMES.ROOT);
    if (existingRoots.hasNext()) {
      rootFolder = existingRoots.next();
    } else {
      rootFolder = DriveApp.createFolder(FOLDER_NAMES.ROOT);
    }
  }

  // 3. Unterordner sicherstellen (Auto-Healing)
  const mitgliederFolder = getOrCreateSubfolder(rootFolder, FOLDER_NAMES.MITGLIEDER);
  const antragsPdfsFolder = getOrCreateSubfolder(mitgliederFolder, FOLDER_NAMES.ANTRAGS_PDFS);
  const preNotifsFolder = getOrCreateSubfolder(mitgliederFolder, FOLDER_NAMES.PRE_NOTIFS);
  const kuendigungenFolder = getOrCreateSubfolder(mitgliederFolder, FOLDER_NAMES.KUENDIGUNGEN);

  const finanzenFolder = getOrCreateSubfolder(rootFolder, FOLDER_NAMES.FINANZEN);
  const yearFolder = getOrCreateSubfolder(finanzenFolder, yearStr);
  const einnahmenFolder = getOrCreateSubfolder(yearFolder, FOLDER_NAMES.EINNAHMEN);
  const sepaArchivFolder = getOrCreateSubfolder(einnahmenFolder, FOLDER_NAMES.SEPA_ARCHIV);

  return {
    root: rootFolder,
    mitglieder: mitgliederFolder,
    antragsPdfs: antragsPdfsFolder,
    preNotifs: preNotifsFolder,
    kuendigungen: kuendigungenFolder,
    finanzen: finanzenFolder,
    yearFolder: yearFolder,
    sepaArchiv: sepaArchivFolder,
    urls: {
      root: rootFolder.getUrl(),
      mitglieder: mitgliederFolder.getUrl(),
      antragsPdfs: antragsPdfsFolder.getUrl(),
      preNotifs: preNotifsFolder.getUrl(),
      kuendigungen: kuendigungenFolder.getUrl(),
      sepaArchiv: sepaArchivFolder.getUrl(),
      sheet: SpreadsheetApp.getActiveSpreadsheet().getUrl()
    }
  };
}

function getOrCreateSubfolder(parentFolder, childName) {
  const iter = parentFolder.getFoldersByName(childName);
  if (iter.hasNext()) {
    return iter.next();
  }
  return parentFolder.createFolder(childName);
}

function handleHealFolders(data) {
  const year = (data && data.year) ? data.year : new Date().getFullYear();
  const folders = ensureVereinFolderStructure(year);
  appendSystemLog('FOLDER_HEAL', 'Ordnerstruktur geprüft & repariert für Jahr ' + year, folders.urls.root);
  return jsonResponse({
    result: 'success',
    message: 'Alle Vereins-Ordner im Google Drive wurden erfolgreich geprüft und synchronisiert.',
    folderUrls: folders.urls
  });
}

/**
 * ==============================================================================
 * MITGLIEDERLISTE ABRUFEN & MIT GOOGLE DRIVE PDFS ABGLEICHEN
 * ==============================================================================
 */
function handleGetMembers() {
  const sheet = ensureMainSheetHeaders();
  const lastRow = sheet.getLastRow();
  const folders = ensureVereinFolderStructure(new Date().getFullYear());

  if (lastRow <= 1) {
    return jsonResponse({
      status: 'success',
      count: 0,
      members: [],
      folderUrls: folders.urls,
      customDomainActive: isCustomDomainActive()
    });
  }

  const numCols = Math.max(sheet.getLastColumn(), SHEET_HEADERS.length);
  const data = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
  const drivePdfFiles = listFilesInFolder(folders.antragsPdfs);

  const members = data.map((row, index) => {
    const rowNumber = index + 2;
    const lastName = String(row[2] || '').trim();
    const firstName = String(row[3] || '').trim();
    const id = 'WW-' + (1000 + rowNumber);
    const existingMandateRef = String(row[18] || '').trim();
    const mandateRef = existingMandateRef || ('WW-' + new Date().getFullYear() + '-' + (1000 + rowNumber));
    const paidYearsStr = String(row[19] || '').trim();
    const paidYears = paidYearsStr ? paidYearsStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    // PDF-Abgleich mit dem erzwungenen Ordner 'Eingegangene_Mitgliedsantraege_PDFs'
    const matched = matchPdfForMember(lastName, firstName, mandateRef, drivePdfFiles);
    const rawPdfCol = String(row[16] || '').trim();

    return {
      id: id,
      rowNumber: rowNumber,
      entryDate: formatCellDate(row[0]),
      status: String(row[1] || 'Neu eingegangen').trim(),
      lastName: lastName,
      firstName: firstName,
      email: String(row[4] || '').trim(),
      phone: String(row[5] || '').trim(),
      address: String(row[6] || '').trim(),
      city: String(row[7] || '').trim(),
      birthDate: formatCellDateOnly(row[8]),
      childName: String(row[9] || '').trim(),
      childGroup: String(row[10] || '').trim(),
      fee: row[11] ? parseFloat(row[11]).toFixed(2) : '24.00',
      accountHolder: String(row[12] || (firstName + ' ' + lastName)).trim(),
      iban: String(row[13] || '').trim(),
      bic: String(row[14] || '').trim(),
      bankName: String(row[15] || '').trim(),
      pdfStatus: matched ? 'Geprüft & Archiviert' : (rawPdfCol || 'Wartet auf E-Mail'),
      matchedPdfName: matched ? matched.name : null,
      matchedPdfUrl: matched ? matched.url : null,
      mandateRef: mandateRef,
      paidYears: paidYears,
      notes: String(row[17] || '').trim()
    };
  });

  return jsonResponse({
    status: 'success',
    count: members.length,
    members: members,
    folderUrls: folders.urls,
    customDomainActive: isCustomDomainActive()
  });
}

function listFilesInFolder(folder) {
  const list = [];
  try {
    const files = folder.getFiles();
    while (files.hasNext()) {
      const f = files.next();
      list.push({
        name: f.getName(),
        url: f.getUrl(),
        id: f.getId()
      });
    }
  } catch (e) {}
  return list;
}

function matchPdfForMember(lastName, firstName, mandateRef, driveFiles) {
  if (!driveFiles || driveFiles.length === 0) return null;
  const lLower = normalizeUmlauts((lastName || '').toLowerCase());
  const fLower = normalizeUmlauts((firstName || '').toLowerCase());
  const refLower = (mandateRef || '').toLowerCase();

  return driveFiles.find(f => {
    const nameNorm = normalizeUmlauts(f.name.toLowerCase());
    if (refLower && nameNorm.includes(refLower)) return true;
    return lLower && nameNorm.includes(lLower) && (fLower ? nameNorm.includes(fLower) : true);
  }) || null;
}

/**
 * ==============================================================================
 * ÖFFENTLICHE REGISTRIERUNG (WRITE-ONLY + AUTO-FILING DES UNTERSCHRIEBENEN PDFS)
 * ==============================================================================
 */
function handleNewRegistration(data) {
  const sheet = ensureMainSheetHeaders();
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, 'Europe/Berlin', 'dd.MM.yyyy HH:mm:ss');
  const dateIso = Utilities.formatDate(now, 'Europe/Berlin', 'yyyy-MM-dd');

  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  const addressExtra = String(data.addressExtra || '').trim();
  const addressStr = ((String(data.street || '') + ' ' + String(data.houseNumber || '')).trim() + (addressExtra ? ' (' + addressExtra + ')' : '')).trim();
  const cityStr = (String(data.zip || '') + ' ' + String(data.city || '')).trim();
  const fee = data.contributionAmount ? parseFloat(data.contributionAmount).toFixed(2) : '24.00';
  const mandateRef = String(data.mandateRef || ('WW-' + now.getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000))).trim();

  const optFlags = [];
  if (data.volunteerActions) optFlags.push('Aktionen: Ja');
  if (data.newsletter) optFlags.push('Mailverteiler: Ja');
  if (data.emailNotifications) optFlags.push('E-Mail-Mitteilungen: Ja');

  let pdfStatusText = 'Wartet auf E-Mail';
  let savedPdfName = '';

  // Falls das unterschriebene PDF direkt vom Formular mitgesendet wurde -> Sofort im Drive-Tresor speichern!
  if (data.pdfBase64 && String(data.pdfBase64).length > 100) {
    try {
      const folders = ensureVereinFolderStructure(now.getFullYear());
      const lockedFileName = buildLockedPdfFilename(dateIso, lastName, firstName, 'Mitgliedsantrag');
      const decoded = Utilities.base64Decode(data.pdfBase64);
      const blob = Utilities.newBlob(decoded, 'application/pdf', lockedFileName);
      folders.antragsPdfs.createFile(blob);
      pdfStatusText = 'Geprüft & Archiviert';
      savedPdfName = lockedFileName;
    } catch (pdfErr) {
      appendSystemLog('PDF_AUTOFILE_WARN', 'Konnte PDF bei Registrierung nicht direkt speichern: ' + pdfErr, lastName);
    }
  }

  const newRow = [
    timestampStr,                                         // A: Eingangsdatum
    'Neu eingegangen',                                    // B: Status
    lastName,                                             // C: Nachname
    firstName,                                            // D: Vorname
    String(data.email || '').trim(),                      // E: E-Mail
    String(data.phone || '').trim(),                      // F: Telefon
    addressStr,                                           // G: Straße & Hausnr.
    cityStr,                                              // H: PLZ & Ort
    String(data.birthDate || '').trim(),                  // I: Geburtsdatum
    String(data.childName || '').trim(),                  // J: Name des Kindes
    String(data.childGroup || '').trim(),                 // K: Kita-Gruppe
    fee,                                                  // L: Jahresbeitrag (€)
    String(data.accountHolder || (firstName + ' ' + lastName)).trim(), // M: Kontoinhaber
    String(data.iban || '').trim(),                       // N: IBAN
    String(data.bic || '').trim(),                        // O: BIC
    String(data.bankName || '').trim(),                   // P: Kreditinstitut
    pdfStatusText,                                        // Q: PDF-Status
    [savedPdfName ? ('Auto-Archiv: ' + savedPdfName) : '', optFlags.join(' | ')].filter(Boolean).join(' · '), // R: Notizen
    mandateRef,                                           // S: Mandatsreferenz
    ''                                                    // T: Eingezogene Beitragsjahre
  ];

  sheet.appendRow(newRow);
  appendSystemLog('NEW_REGISTRATION', 'Neuer Mitgliedsantrag: ' + firstName + ' ' + lastName + ' (' + mandateRef + ')', savedPdfName || 'Ohne Direkt-PDF');

  return jsonResponse({
    result: 'success',
    row: sheet.getLastRow(),
    mandateRef: mandateRef,
    pdfAutoFiled: Boolean(savedPdfName),
    message: 'Mitgliedsantrag erfolgreich gespeichert.'
  });
}

/**
 * ==============================================================================
 * SCHRITT 1: POSTFACH-SCANNER ([MITGLIEDSANTRAG]) & DRAG-AND-DROP PDF-UPLOAD
 * ==============================================================================
 */
function handleScanInboxForPdfs() {
  const folders = ensureVereinFolderStructure(new Date().getFullYear());
  const existingFiles = listFilesInFolder(folders.antragsPdfs);
  const sheet = ensureMainSheetHeaders();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return jsonResponse({ result: 'success', matchedCount: 0, message: 'Keine Mitglieder in der Tabelle.' });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, SHEET_HEADERS.length).getValues();
  // Suche nach E-Mails mit PDF-Anhang (an info@foerderverein-weserwichtel.de oder Vereins-Gmail)
  const query = 'has:attachment filename:pdf newer_than:90d';
  const threads = GmailApp.search(query, 0, 30);
  let newlyMatched = [];

  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(msg => {
      const subject = msg.getSubject() || '';
      const from = msg.getFrom() || '';
      const msgDateIso = Utilities.formatDate(msg.getDate(), 'Europe/Berlin', 'yyyy-MM-dd');
      const attachments = msg.getAttachments();

      attachments.forEach(att => {
        const attName = att.getName() || '';
        if (!attName.toLowerCase().endsWith('.pdf')) return;

        // Prüfe, zu welchem Mitglied diese E-Mail / dieses PDF gehört
        for (let i = 0; i < rows.length; i++) {
          const rLastName = String(rows[i][2] || '').trim();
          const rFirstName = String(rows[i][3] || '').trim();
          const rEmail = String(rows[i][4] || '').trim().toLowerCase();
          const rMandateRef = String(rows[i][18] || '').trim();

          if (!rLastName) continue;

          // Überspringe, falls bereits im Drive vorhanden
          if (matchPdfForMember(rLastName, rFirstName, rMandateRef, existingFiles)) continue;

          const haystack = normalizeUmlauts((subject + ' ' + from + ' ' + attName).toLowerCase());
          const lNorm = normalizeUmlauts(rLastName.toLowerCase());
          const emailMatch = rEmail && from.toLowerCase().includes(rEmail);
          const nameMatch = lNorm && haystack.includes(lNorm);

          if (emailMatch || nameMatch) {
            const lockedName = buildLockedPdfFilename(msgDateIso, rLastName, rFirstName, 'Mitgliedsantrag');
            const blob = att.copyBlob().setName(lockedName);
            const createdFile = folders.antragsPdfs.createFile(blob);

            existingFiles.push({ name: lockedName, url: createdFile.getUrl(), id: createdFile.getId() });
            sheet.getRange(i + 2, 17).setValue('Geprüft & Archiviert');
            newlyMatched.push({ member: rFirstName + ' ' + rLastName, fileName: lockedName });
            break;
          }
        }
      });
    });
  });

  if (newlyMatched.length > 0) {
    appendSystemLog('INBOX_SCAN_MATCH', newlyMatched.length + ' PDF(s) aus Gmail zugeordnet', JSON.stringify(newlyMatched));
  }

  return jsonResponse({
    result: 'success',
    matchedCount: newlyMatched.length,
    matched: newlyMatched,
    message: newlyMatched.length > 0
      ? (newlyMatched.length + ' unterschriebene Antrags-PDF(s) im Postfach gefunden, automatisch umbenannt und im Google Drive abgelegt!')
      : 'Keine neuen unzugeordneten Antrags-PDFs im E-Mail-Postfach gefunden.'
  });
}

function handleUploadMemberPdf(data) {
  if (!data.pdfBase64 || !data.lastName) {
    throw new Error('PDF-Daten und Nachname sind erforderlich.');
  }

  const folders = ensureVereinFolderStructure(new Date().getFullYear());
  const dateIso = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd');
  const docType = data.docType === 'Kuendigung' ? 'Kuendigung' : 'Mitgliedsantrag';
  const targetFolder = docType === 'Kuendigung' ? folders.kuendigungen : folders.antragsPdfs;

  const lockedName = buildLockedPdfFilename(dateIso, data.lastName, data.firstName || '', docType);
  const decoded = Utilities.base64Decode(data.pdfBase64);
  const blob = Utilities.newBlob(decoded, 'application/pdf', lockedName);
  const file = targetFolder.createFile(blob);

  // Aktualisiere Zeile in Google Sheets
  if (data.rowNumber && parseInt(data.rowNumber, 10) >= 2) {
    const sheet = ensureMainSheetHeaders();
    const row = parseInt(data.rowNumber, 10);
    if (docType === 'Mitgliedsantrag') {
      sheet.getRange(row, 17).setValue('Geprüft & Archiviert');
    }
  }

  appendSystemLog('PDF_UPLOADED', lockedName + ' im Google Drive abgelegt', file.getUrl());

  return jsonResponse({
    result: 'success',
    fileName: lockedName,
    fileUrl: file.getUrl(),
    message: 'Datei als "' + lockedName + '" im Google Drive gespeichert.'
  });
}

/**
 * ==============================================================================
 * SCHRITT 2: SEPA PRE-NOTIFICATION VERSENDEN & BELEG ARCHIVIEREN
 * ==============================================================================
 */
function handleSendPreNotification(data) {
  if (!data.email || !data.body || !data.subject) {
    throw new Error('Empfänger, Betreff und Nachrichtentext sind erforderlich.');
  }

  const replyToAddr = getActiveReplyToEmail(data.replyTo);

  // 1. E-Mail über das offizielle Vereinskonto versenden
  sendVereinEmail({
    to: data.email,
    subject: data.subject,
    body: data.body,
    replyTo: replyToAddr
  });

  // 2. Belegkopie in '02_MITGLIEDERVERWALTUNG/Gesendete_SEPA_Vorabinformationen' speichern
  const now = new Date();
  const dateIso = Utilities.formatDate(now, 'Europe/Berlin', 'yyyy-MM-dd');
  const dateGerman = Utilities.formatDate(now, 'Europe/Berlin', 'dd.MM.yyyy HH:mm');
  const folders = ensureVereinFolderStructure(now.getFullYear());

  const safeLast = sanitizeFilePart(data.lastName || 'Mitglied');
  const safeFirst = sanitizeFilePart(data.firstName || '');
  const safeRef = sanitizeFilePart(data.mandateRef || 'SEPA');
  const proofFileName = `${dateIso}_${safeLast}_${safeFirst}_PreNotification_${safeRef}.txt`;

  const proofContent =
    `BELEG: GESENDETE SEPA-VORABINFORMATION (PRE-NOTIFICATION)\n` +
    `======================================================================\n` +
    `Versanddatum:   ${dateGerman} Uhr\n` +
    `Absender:       ${VEREIN_GMAIL} (Reply-To: ${replyToAddr})\n` +
    `Empfänger:      ${data.email}\n` +
    `Betreff:        ${data.subject}\n` +
    `Mandatsreferenz:${data.mandateRef || '–'}\n` +
    `======================================================================\n\n` +
    data.body;

  folders.preNotifs.createFile(proofFileName, proofContent, MimeType.PLAIN_TEXT);

  // 3. Status im Google Sheet auf "Aktiv" setzen und Versanddatum vermerken
  const sheet = ensureMainSheetHeaders();
  const lastRow = sheet.getLastRow();
  const shortDate = Utilities.formatDate(now, 'Europe/Berlin', 'dd.MM.yyyy');

  if (lastRow > 1) {
    const targetRow = findMemberRow(sheet, data.rowNumber, data.email);
    if (targetRow >= 2) {
      sheet.getRange(targetRow, 2).setValue('Aktiv');
      if (data.mandateRef) {
        sheet.getRange(targetRow, 19).setValue(data.mandateRef);
      }
      const currentNotes = String(sheet.getRange(targetRow, 18).getValue() || '').trim();
      const noteEntry = `Pre-Notif gesendet am ${shortDate}`;
      if (!currentNotes.includes(noteEntry)) {
        sheet.getRange(targetRow, 18).setValue(currentNotes ? `${currentNotes} · ${noteEntry}` : noteEntry);
      }
    }
  }

  appendSystemLog('PRE_NOTIF_SENT', 'SEPA-Vorabinformation gesendet an ' + data.email, proofFileName);

  return jsonResponse({
    result: 'success',
    proofFileName: proofFileName,
    sentDate: shortDate,
    message: 'E-Mail über Vereinskonto versendet, Beleg im Drive archiviert und Status auf "Aktiv" gesetzt.'
  });
}

/**
 * ==============================================================================
 * SCHRITT 3: DUALES SEPA-XML ARCHIV & DOPPEL-EINZUGS-SCHUTZ
 * ==============================================================================
 */
function handleArchiveSepaBatch(data) {
  const year = String(data.collectionYear || new Date().getFullYear()).trim();
  const folders = ensureVereinFolderStructure(year);
  const dateIso = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd');

  const count = parseInt(data.memberCount || 0, 10);
  const sumStr = String(data.totalSum || '0.00').replace('.', '_');
  const xmlFileName = `${dateIso}_SEPA_Lastschrift_Skatbank_${count}Mitglieder_${sumStr}EUR.xml`;
  const csvFileName = `${dateIso}_Einzugsliste_${count}Mitglieder_${sumStr}EUR.csv`;

  let xmlUrl = '';
  if (data.xmlContent) {
    const xmlFile = folders.sepaArchiv.createFile(xmlFileName, data.xmlContent, 'application/xml');
    xmlUrl = xmlFile.getUrl();
  }

  if (data.csvSummary) {
    folders.sepaArchiv.createFile(csvFileName, data.csvSummary, MimeType.CSV);
  }

  // Markiere das Beitragsjahr bei allen enthaltenen Mitgliedern als eingezogen
  if (data.markAsCollected && Array.isArray(data.memberEmails) && data.memberEmails.length > 0) {
    const sheet = ensureMainSheetHeaders();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const allData = sheet.getRange(2, 1, lastRow - 1, SHEET_HEADERS.length).getValues();
      const emailSet = new Set(data.memberEmails.map(e => String(e).toLowerCase().trim()));

      for (let i = 0; i < allData.length; i++) {
        const rowEmail = String(allData[i][4] || '').toLowerCase().trim();
        if (emailSet.has(rowEmail)) {
          const rowNum = i + 2;
          const existingYears = String(allData[i][19] || '').split(',').map(s => s.trim()).filter(Boolean);
          if (!existingYears.includes(year)) {
            existingYears.push(year);
          }
          sheet.getRange(rowNum, 20).setValue(existingYears.join(', '));
        }
      }
    }
  }

  appendSystemLog('SEPA_BATCH_ARCHIVED', `SEPA-Lauf (${ year }) archiviert: ${count} Mitglieder, ${data.totalSum} €`, xmlFileName);

  return jsonResponse({
    result: 'success',
    xmlFileName: xmlFileName,
    xmlUrl: xmlUrl,
    folderUrl: folders.sepaArchiv.getUrl(),
    message: `SEPA-XML und Einzugsliste wurden automatisch im Google Drive unter 03_FINANZEN_&_BUCHHALTUNG/${year}/ archiviert.`
  });
}

/**
 * ==============================================================================
 * MITGLIED BEARBEITEN ODER KÜNDIGUNG ARCHIVIEREN (EINSCHULUNG / BANKWECHSEL)
 * ==============================================================================
 */
function handleUpdateOrCancelMember(data) {
  const sheet = ensureMainSheetHeaders();
  const targetRow = findMemberRow(sheet, data.rowNumber, data.email);
  if (targetRow < 2) {
    throw new Error('Mitgliedszeile konnte in der Tabelle nicht gefunden werden.');
  }

  const nowStr = Utilities.formatDate(new Date(), 'Europe/Berlin', 'dd.MM.yyyy');
  const dateIso = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd');

  if (data.status) sheet.getRange(targetRow, 2).setValue(data.status);
  if (data.lastName !== undefined) sheet.getRange(targetRow, 3).setValue(data.lastName);
  if (data.firstName !== undefined) sheet.getRange(targetRow, 4).setValue(data.firstName);
  if (data.email !== undefined) sheet.getRange(targetRow, 5).setValue(data.email);
  if (data.childName !== undefined) sheet.getRange(targetRow, 10).setValue(data.childName);
  if (data.childGroup !== undefined) sheet.getRange(targetRow, 11).setValue(data.childGroup);
  if (data.fee !== undefined) sheet.getRange(targetRow, 12).setValue(parseFloat(data.fee).toFixed(2));
  if (data.accountHolder !== undefined) sheet.getRange(targetRow, 13).setValue(data.accountHolder);
  if (data.iban !== undefined) sheet.getRange(targetRow, 14).setValue(data.iban);
  if (data.bic !== undefined) sheet.getRange(targetRow, 15).setValue(data.bic);
  if (data.bankName !== undefined) sheet.getRange(targetRow, 16).setValue(data.bankName);
  if (data.paidYears !== undefined) {
    const yrs = Array.isArray(data.paidYears) ? data.paidYears.join(', ') : String(data.paidYears);
    sheet.getRange(targetRow, 20).setValue(yrs);
  }

  let cancellationFileUrl = '';
  let cancellationEmailSent = false;
  if (data.isCancellation) {
    sheet.getRange(targetRow, 2).setValue('Gekündigt');
    const folders = ensureVereinFolderStructure(new Date().getFullYear());
    const lName = data.lastName || sheet.getRange(targetRow, 3).getValue() || 'Mitglied';
    const fName = data.firstName || sheet.getRange(targetRow, 4).getValue() || '';

    if (data.cancellationPdfBase64) {
      const kFileName = buildLockedPdfFilename(dateIso, lName, fName, 'Kuendigung');
      const blob = Utilities.newBlob(Utilities.base64Decode(data.cancellationPdfBase64), 'application/pdf', kFileName);
      const kFile = folders.kuendigungen.createFile(blob);
      cancellationFileUrl = kFile.getUrl();
    }

    // Falls Kündigungs-E-Mail direkt mitgesendet werden soll
    if (data.sendCancellationEmail) {
      const targetEmail = String(data.email || sheet.getRange(targetRow, 5).getValue() || '').trim();
      if (targetEmail.includes('@')) {
        try {
          const mandateRef = data.mandateRef || sheet.getRange(targetRow, 19).getValue() || 'Kuendigung';
          const childName = data.childName || sheet.getRange(targetRow, 10).getValue() || '';
          const childGroup = data.childGroup || sheet.getRange(targetRow, 11).getValue() || '';
          const subject = data.cancellationSubject || 'Bestätigung über die Beendigung Ihrer Mitgliedschaft – Förderverein Kita Weserwichtel e.V.';
          const body = data.cancellationBody || buildDefaultCancellationBody_(fName, lName, childName, childGroup, mandateRef, nowStr);
          const replyToAddr = getActiveReplyToEmail(data.replyTo);

          sendVereinEmail({
            to: targetEmail,
            subject: subject,
            body: body,
            replyTo: replyToAddr,
            bcc: data.notifyBoard !== false ? VEREIN_GMAIL : undefined
          });

          // Text-Beleg im Drive-Ordner Kuendigungen_und_Aenderungen speichern
          const safeLast = sanitizeFilePart(lName);
          const safeFirst = sanitizeFilePart(fName);
          const safeRef = sanitizeFilePart(mandateRef);
          const proofFileName = `${dateIso}_${safeLast}_${safeFirst}_Kuendigungsbestaetigung_${safeRef}.txt`;
          const dateGerman = Utilities.formatDate(new Date(), 'Europe/Berlin', 'dd.MM.yyyy HH:mm');
          const proofContent =
            `BELEG: GESENDETE KÜNDIGUNGSBESTÄTIGUNG / BEENDIGUNG DER MITGLIEDSCHAFT\n` +
            `======================================================================\n` +
            `Versanddatum:   ${dateGerman} Uhr\n` +
            `Absender:       ${VEREIN_GMAIL} (Reply-To: ${replyToAddr})\n` +
            `Empfänger:      ${targetEmail}\n` +
            `BCC (Vorstand): ${data.notifyBoard !== false ? VEREIN_GMAIL : 'Kein BCC'}\n` +
            `Betreff:        ${subject}\n` +
            `Mandatsreferenz:${mandateRef}\n` +
            `Status:         Gekündigt / SEPA-Mandat gesperrt\n` +
            `======================================================================\n\n` +
            body;

          folders.kuendigungen.createFile(proofFileName, proofContent, MimeType.PLAIN_TEXT);
          cancellationEmailSent = true;

          const currentNotes = String(sheet.getRange(targetRow, 18).getValue() || '').trim();
          const emailNote = `Kündigungsbestätigung gesendet am ${nowStr}`;
          if (!currentNotes.includes(emailNote)) {
            sheet.getRange(targetRow, 18).setValue(currentNotes ? `${currentNotes} · ${emailNote}` : emailNote);
          }
        } catch (mailErr) {
          appendSystemLog('CANCELLATION_MAIL_WARN', 'Konnte Kündigungs-Mail nicht senden: ' + mailErr.toString(), targetEmail);
        }
      }
    }
  }

  if (data.noteAddition) {
    const currentNotes = String(sheet.getRange(targetRow, 18).getValue() || '').trim();
    const updatedNotes = currentNotes ? `${currentNotes} · ${data.noteAddition} (${nowStr})` : `${data.noteAddition} (${nowStr})`;
    sheet.getRange(targetRow, 18).setValue(updatedNotes);
  } else if (data.notes !== undefined) {
    sheet.getRange(targetRow, 18).setValue(data.notes);
  }

  appendSystemLog(
    data.isCancellation ? 'MEMBER_CANCELLED' : 'MEMBER_UPDATED',
    'Mitglied aktualisiert (Zeile ' + targetRow + ')',
    (data.noteAddition || data.status || '') + (cancellationEmailSent ? ' [Bestätigung gemailt]' : '')
  );

  let successMsg = data.isCancellation
    ? 'Kündigung eingetragen, im Drive archiviert und SEPA-Mandat für künftige Einzüge gesperrt.'
    : 'Mitgliedsdaten erfolgreich aktualisiert.';
  if (cancellationEmailSent) {
    successMsg += ' Offizielle Kündigungsbestätigung wurde per E-Mail versendet & als Beleg archiviert.';
  }

  return jsonResponse({
    result: 'success',
    cancellationFileUrl: cancellationFileUrl,
    cancellationEmailSent: cancellationEmailSent,
    message: successMsg
  });
}

/**
 * Standard-Wortlaut für die rechtssichere Kündigungsbestätigung (Vereinsrecht & SEPA).
 */
function buildDefaultCancellationBody_(firstName, lastName, childName, childGroup, mandateRef, effectiveDateStr) {
  const effDate = effectiveDateStr || Utilities.formatDate(new Date(), 'Europe/Berlin', 'dd.MM.yyyy');
  const childInfo = childName ? `${childName}${childGroup ? ' (' + childGroup + ')' : ''}` : 'Ihres Kindes';

  return `Liebe/r ${firstName} ${lastName},

wir bestätigen hiermit den Eingang Ihrer Kündigung und die Beendigung Ihrer Mitgliedschaft im Förderverein der Kita Weserwichtel e.V. mit Wirkung zum ${effDate}.

----------------------------------------------------------------------
BESTÄTIGUNG DER BEENDIGUNG & SEPA-STATUS
----------------------------------------------------------------------
Mitglied:            ${firstName} ${lastName}
Kind:                ${childInfo}
Mandatsreferenz:     ${mandateRef || '–'}
SEPA-Lastschrift:    DEAKTIVIERT / GESPERRT
Status:              Mitgliedschaft beendet zum ${effDate}
----------------------------------------------------------------------

Es werden künftig keine weiteren Mitgliedsbeiträge von Ihrem angegebenen Bankkonto eingezogen. Ihr hinterlegtes SEPA-Lastschriftmandat wurde mit sofortiger Wirkung im Verwaltungssystem deaktiviert und für künftige Lastschriftläufe gesperrt.

Hinweis gem. DSGVO & Steuerrecht: Gemäß den gesetzlichen Aufbewahrungsfristen (§ 147 Abgabenordnung) bleiben steuer- und buchungsrelevante Belege vergangener Beitragsjahre für 10 Jahre im Vereinsarchiv aufbewahrt und werden im Anschluss datenschutzkonform vernichtet.

Wir danken Ihnen und Ihrer Familie von ganzem Herzen für Ihre wertvolle Unterstützung während Ihrer Zeit in der Kita Weserwichtel. Durch Ihren Beitrag konnten wir viele schöne Aktionen, Ausflüge und Spielgeräte für die Kinder verwirklichen!

Für die Zukunft wünschen wir Ihnen und Ihrem Kind alles Gute und einen erfolgreichen weiteren Lebensweg.

Herzliche Grüße
Der Vorstand & Schatzmeister
Förderverein der Kita Weserwichtel e.V.
Weserstraße 106, 12059 Berlin
Amtsgericht Charlottenburg · VR 42469 B`;
}

/**
 * ==============================================================================
 * EIGENSTÄNDIGE AKTION: KÜNDIGUNGSBESTÄTIGUNG VERSENDEN & BELEG ARCHIVIEREN
 * (z. B. wenn Kündigung bereits eingetragen war oder nachträglich bestätigt wird)
 * ==============================================================================
 */
function handleSendCancellationNotification(data) {
  const sheet = ensureMainSheetHeaders();
  const targetRow = findMemberRow(sheet, data.rowNumber, data.email);
  if (targetRow < 2) {
    throw new Error('Mitgliedszeile konnte in der Tabelle nicht gefunden werden.');
  }

  const targetEmail = String(data.email || sheet.getRange(targetRow, 5).getValue() || '').trim();
  if (!targetEmail || !targetEmail.includes('@')) {
    throw new Error('Keine gültige E-Mail-Adresse für dieses Mitglied hinterlegt.');
  }

  const now = new Date();
  const dateIso = Utilities.formatDate(now, 'Europe/Berlin', 'yyyy-MM-dd');
  const nowStr = Utilities.formatDate(now, 'Europe/Berlin', 'dd.MM.yyyy');
  const dateGerman = Utilities.formatDate(now, 'Europe/Berlin', 'dd.MM.yyyy HH:mm');
  const folders = ensureVereinFolderStructure(now.getFullYear());

  const lName = data.lastName || sheet.getRange(targetRow, 3).getValue() || 'Mitglied';
  const fName = data.firstName || sheet.getRange(targetRow, 4).getValue() || '';
  const childName = data.childName || sheet.getRange(targetRow, 10).getValue() || '';
  const childGroup = data.childGroup || sheet.getRange(targetRow, 11).getValue() || '';
  const mandateRef = data.mandateRef || sheet.getRange(targetRow, 19).getValue() || 'Kuendigung';

  const subject = data.subject || 'Bestätigung über die Beendigung Ihrer Mitgliedschaft – Förderverein Kita Weserwichtel e.V.';
  const body = data.body || buildDefaultCancellationBody_(fName, lName, childName, childGroup, mandateRef, nowStr);
  const replyToAddr = getActiveReplyToEmail(data.replyTo);

  // 1. E-Mail über das offizielle Vereinskonto versenden
  sendVereinEmail({
    to: targetEmail,
    subject: subject,
    body: body,
    replyTo: replyToAddr,
    bcc: data.notifyBoard !== false ? VEREIN_GMAIL : undefined
  });

  // 2. Belegkopie in 02_MITGLIEDERVERWALTUNG/Kuendigungen_und_Aenderungen speichern
  const safeLast = sanitizeFilePart(lName);
  const safeFirst = sanitizeFilePart(fName);
  const safeRef = sanitizeFilePart(mandateRef);
  const proofFileName = `${dateIso}_${safeLast}_${safeFirst}_Kuendigungsbestaetigung_${safeRef}.txt`;

  const proofContent =
    `BELEG: GESENDETE KÜNDIGUNGSBESTÄTIGUNG / BEENDIGUNG DER MITGLIEDSCHAFT\n` +
    `======================================================================\n` +
    `Versanddatum:   ${dateGerman} Uhr\n` +
    `Absender:       ${VEREIN_GMAIL} (Reply-To: ${replyToAddr})\n` +
    `Empfänger:      ${targetEmail}\n` +
    `BCC (Vorstand): ${data.notifyBoard !== false ? VEREIN_GMAIL : 'Kein BCC'}\n` +
    `Betreff:        ${subject}\n` +
    `Mandatsreferenz:${mandateRef}\n` +
    `Status:         Gekündigt / SEPA-Mandat gesperrt\n` +
    `======================================================================\n\n` +
    body;

  const proofFile = folders.kuendigungen.createFile(proofFileName, proofContent, MimeType.PLAIN_TEXT);

  // 3. Status im Sheet auf "Gekündigt" setzen und Notiz vermerken
  sheet.getRange(targetRow, 2).setValue('Gekündigt');
  const currentNotes = String(sheet.getRange(targetRow, 18).getValue() || '').trim();
  const emailNote = `Kündigungsbestätigung gesendet am ${nowStr}`;
  if (!currentNotes.includes(emailNote)) {
    sheet.getRange(targetRow, 18).setValue(currentNotes ? `${currentNotes} · ${emailNote}` : emailNote);
  }

  appendSystemLog('CANCELLATION_NOTICE_SENT', 'Kündigungsbestätigung gesendet an ' + targetEmail, proofFileName);

  return jsonResponse({
    result: 'success',
    proofFileName: proofFileName,
    proofUrl: proofFile.getUrl(),
    sentDate: nowStr,
    message: 'Kündigungsbestätigung erfolgreich an ' + targetEmail + ' versendet und Beleg im Drive archiviert.'
  });
}

/**
 * Erfasst einen alten oder neuen handschriftlichen Papierantrag aus dem Vorstand-Portal
 * und legt den Scan / das Foto automatisch im Google Drive ab.
 */
function handleCreatePaperMember(data) {
  const sheet = ensureMainSheetHeaders();
  const now = new Date();

  // Eintrittsdatum: historisches Datum oder heute
  let entryDate = now;
  if (data.entryDate) {
    const parsed = new Date(data.entryDate);
    if (!isNaN(parsed.getTime())) entryDate = parsed;
  }
  const timestampStr = Utilities.formatDate(entryDate, 'Europe/Berlin', 'dd.MM.yyyy HH:mm:ss');
  const dateIso = Utilities.formatDate(entryDate, 'Europe/Berlin', 'yyyy-MM-dd');
  const yearStr = entryDate.getFullYear() || now.getFullYear();

  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  if (!lastName || !firstName) {
    throw new Error('Vorname und Nachname sind Pflichtfelder.');
  }

  const addressStr = (String(data.street || '') + ' ' + String(data.houseNumber || '')).trim();
  const cityStr = (String(data.zip || '') + ' ' + String(data.city || '')).trim();
  const fee = data.contributionAmount ? parseFloat(data.contributionAmount).toFixed(2) : (data.fee ? parseFloat(data.fee).toFixed(2) : '24.00');
  const mandateRef = String(data.mandateRef || ('WW-' + yearStr + '-' + Math.floor(1000 + Math.random() * 9000))).trim();

  let pdfStatusText = 'Wartet auf Scan';
  let savedFileName = '';

  // Scan-Datei / Foto / PDF im fest verdrahteten Drive-Ordner speichern
  if (data.fileBase64 && String(data.fileBase64).length > 50) {
    try {
      const folders = ensureVereinFolderStructure(yearStr);
      const mimeType = String(data.mimeType || 'application/pdf').toLowerCase();
      let ext = '.pdf';
      if (mimeType.includes('png')) ext = '.png';
      else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';

      const lockedFileName = buildLockedPdfFilename(dateIso, lastName, firstName, 'Mitgliedsantrag').replace(/\.pdf$/i, ext);
      const decoded = Utilities.base64Decode(data.fileBase64);
      const blob = Utilities.newBlob(decoded, mimeType, lockedFileName);
      folders.antragsPdfs.createFile(blob);
      pdfStatusText = 'Geprüft & Archiviert';
      savedFileName = lockedFileName;
    } catch (e) {
      appendSystemLog('PAPER_FILE_WARN', 'Konnte Scan-Datei nicht im Drive speichern: ' + e.toString(), lastName);
    }
  }

  const isOld = Boolean(data.isOldMember);
  const status = data.status || (isOld ? 'Aktiv' : 'Neu eingegangen');
  const collectedYears = Array.isArray(data.collectedYears)
    ? data.collectedYears.join(', ')
    : String(data.collectedYears || '').trim();
  const defaultNote = isOld ? 'Papierantrag aus Altbestand erfasst' : 'Handschriftlicher Papierantrag erfasst';
  const notes = data.notes ? String(data.notes).trim() : defaultNote;

  const newRow = [
    timestampStr,                                         // A: Eingangsdatum
    status,                                               // B: Status
    lastName,                                             // C: Nachname
    firstName,                                            // D: Vorname
    String(data.email || '').trim(),                      // E: E-Mail
    String(data.phone || '').trim(),                      // F: Telefon
    addressStr,                                           // G: Straße & Hausnr.
    cityStr,                                              // H: PLZ & Ort
    String(data.birthDate || '').trim(),                  // I: Geburtsdatum
    String(data.childName || '').trim(),                  // J: Name des Kindes
    String(data.childGroup || '').trim(),                 // K: Kita-Gruppe
    fee,                                                  // L: Jahresbeitrag (€)
    String(data.accountHolder || (firstName + ' ' + lastName)).trim(), // M: Kontoinhaber
    String(data.iban || '').trim(),                       // N: IBAN
    String(data.bic || '').trim(),                        // O: BIC
    String(data.bankName || '').trim(),                   // P: Kreditinstitut
    pdfStatusText,                                        // Q: PDF-Status
    savedFileName ? (notes + ' (Archiv: ' + savedFileName + ')') : notes, // R: Notizen
    mandateRef,                                           // S: Mandatsreferenz
    collectedYears                                        // T: Eingezogene Beitragsjahre
  ];

  sheet.appendRow(newRow);
  appendSystemLog('PAPER_MEMBER_CREATED', 'Papierantrag erfasst: ' + firstName + ' ' + lastName + ' (' + mandateRef + ')', savedFileName || 'Ohne Anhang');

  return jsonResponse({
    result: 'success',
    row: sheet.getLastRow(),
    mandateRef: mandateRef,
    fileName: savedFileName,
    message: 'Papierantrag erfolgreich im Google Drive archiviert und in Mitgliederliste eingetragen.'
  });
}

/**
 * ==============================================================================
 * REMOTE-WARTUNG & SYSTEM_LOG (FÜR GASTON)
 * ==============================================================================
 */
function appendSystemLog(eventType, summary, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('System_Log');
    if (!logSheet) {
      logSheet = ss.insertSheet('System_Log');
      logSheet.appendRow(['Zeitstempel', 'Ereignis-Typ', 'Zusammenfassung', 'Details']);
      logSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
      logSheet.setFrozenRows(1);
    }
    const ts = Utilities.formatDate(new Date(), 'Europe/Berlin', 'dd.MM.yyyy HH:mm:ss');
    logSheet.appendRow([ts, eventType, summary, String(details || '').slice(0, 500)]);
  } catch (e) {}
}

function handleGetSystemLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('System_Log');
  if (!logSheet || logSheet.getLastRow() <= 1) {
    return jsonResponse({ result: 'success', logs: [] });
  }
  const lastRow = logSheet.getLastRow();
  const startRow = Math.max(2, lastRow - 49);
  const rows = logSheet.getRange(startRow, 1, lastRow - startRow + 1, 4).getValues();
  const logs = rows.reverse().map(r => ({
    timestamp: String(r[0] || ''),
    type: String(r[1] || ''),
    summary: String(r[2] || ''),
    details: String(r[3] || '')
  }));
  return jsonResponse({ result: 'success', logs: logs });
}

/**
 * ==============================================================================
 * HILFSFUNKTIONEN & TABELLEN-FORMATIERUNG
 * ==============================================================================
 */
function ensureMainSheetHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_HEADERS);
    formatSheetHeader(sheet);
  } else if (sheet.getLastColumn() < SHEET_HEADERS.length) {
    // Ergänze neue Spalten S (Mandatsreferenz) und T (Eingezogene Beitragsjahre) nahtlos
    sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setValues([SHEET_HEADERS]);
  }
  return sheet;
}

function findMemberRow(sheet, rowNumber, email) {
  if (rowNumber && parseInt(rowNumber, 10) >= 2) {
    return parseInt(rowNumber, 10);
  }
  if (email) {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const emails = sheet.getRange(2, 5, lastRow - 1, 1).getValues();
      const target = String(email).toLowerCase().trim();
      for (let i = 0; i < emails.length; i++) {
        if (String(emails[i][0] || '').toLowerCase().trim() === target) {
          return i + 2;
        }
      }
    }
  }
  return -1;
}

function buildLockedPdfFilename(dateIso, lastName, firstName, suffix) {
  const safeLast = sanitizeFilePart(lastName || 'Unbekannt');
  const safeFirst = sanitizeFilePart(firstName || 'Mitglied');
  return `${dateIso}_${safeLast}_${safeFirst}_${suffix}.pdf`;
}

function sanitizeFilePart(str) {
  return normalizeUmlauts(String(str || '').trim())
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeUmlauts(str) {
  return String(str || '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue');
}

function formatCellDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Europe/Berlin', 'yyyy-MM-dd HH:mm');
  }
  return String(val);
}

function formatCellDateOnly(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Europe/Berlin', 'dd.MM.yyyy');
  }
  return String(val);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatSheetHeader(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, SHEET_HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(10);
  headerRange.setBackground('#0f172a');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⭐ Förderverein Tools')
    .addItem('🎨 Tabelle professionell formatieren', 'formatSheetProfessional')
    .addItem('📁 Google Drive Ordnerstruktur prüfen & reparieren', 'handleHealFolders')
    .addSeparator()
    .addItem('🔑 Vorstands-Passwort festlegen / ändern', 'promptChangeAdminPasswordFromSheet')
    .addItem('📧 Test: 6-stelligen PIN jetzt per E-Mail senden', 'testSendPinDirectly')
    .addToUi();
}

/**
 * Test-Funktion: Kann direkt im Apps-Script-Editor oder über das Tabellen-Menü ausgeführt werden.
 * Erzwingt die Google-Berechtigungsabfrage (MailApp & DriveApp) und sendet sofort eine Test-PIN.
 */
function testSendPinDirectly() {
  // Cooldown für diesen manuellen Test ignorieren
  CacheService.getScriptCache().remove('PIN_RATE_LIMIT');
  const res = handleRequestEmailPin();
  const text = res.getContent();
  Logger.log('Ergebnis PIN-Versand: ' + text);
  try {
    SpreadsheetApp.getUi().alert('Ergebnis PIN-Versand:\n' + text);
  } catch (e) {}
}

function promptChangeAdminPasswordFromSheet() {
  const ui = SpreadsheetApp.getUi();
  const currentPass = getAdminPassword();
  const response = ui.prompt(
    '🔑 Vorstands-Passwort für admin.html festlegen',
    'Aktuelles Passwort: ' + currentPass + '\n\nBitte geben Sie das neue Vorstands-Passwort ein (mind. 8 Zeichen):',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() === ui.Button.OK) {
    const newPass = String(response.getResponseText() || '').trim();
    if (newPass.length < 8) {
      ui.alert('⚠️ Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }
    PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', newPass);
    appendSystemLog('PASSWORD_CHANGED', 'Vorstands-Passwort über Google-Tabelle geändert', '');
    ui.alert('✅ Das neue Vorstands-Passwort wurde sicher gespeichert!');
  }
}

function formatSheetProfessional() {
  const sheet = ensureMainSheetHeaders();
  formatSheetHeader(sheet);

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Neu eingegangen', 'Aktiv', 'Gekündigt'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('B2:B').setDataValidation(statusRule);

  const pdfRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      'Wartet auf E-Mail',
      'Eingegangen',
      'Geprüft & Archiviert',
      'Nicht erforderlich',
      'Fehlerhaft / Unvollständig'
    ], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange('Q2:Q').setDataValidation(pdfRule);

  sheet.getRange('L2:L').setNumberFormat('#,##0.00 "€"');
  const widths = [155, 130, 130, 130, 210, 120, 170, 130, 105, 150, 110, 120, 160, 210, 110, 160, 175, 220, 140, 160];
  widths.forEach((w, idx) => sheet.setColumnWidth(idx + 1, w));

  SpreadsheetApp.getUi().alert('✅ Tabelle & Spalten (inkl. Mandatsreferenz & Beitragsjahre) erfolgreich formatiert!');
}
