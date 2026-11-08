/**
 * ==============================================================================
 * Förderverein der Kita Weserwichtel e.V.
 * Vorstands- & Schatzmeister-Portal (v2.0.0)
 * ==============================================================================
 *
 * ARCHITEKTUR FÜR 1 SCHATZMEISTER (THOMAS) & 1 REMOTE-MAINTAINER (GASTON):
 * - 4-Säulen-Sicherheit: Login über Server-Passwort oder 6-stelligen E-Mail-PIN.
 * - Idiotensichere 3-Schritt-Leitplanken:
 *   [1. PDF im Drive] ➔ [2. Vorab-Mail über Vereinskonto] ➔ [3. SEPA-Einzug]
 * - Doppel-Einzugs-Schutz pro Beitragsjahr (2026, 2027, ...).
 * - Duales SEPA-XML (pain.008.001.02): Lokaler Download für GLS Bank +
 *   automatische Archivierung im Google Drive inkl. CSV-Einzugsliste.
 * - Zero-Touch Fernwartung: Automatischer Versions-Check (version.json) &
 *   Remote-Fehlerprotokollierung in das Tabellenblatt 'System_Log'.
 */

(function () {
  'use strict';

  const config = window.APP_CONFIG || {
    ASSOCIATION_NAME: "Förderverein der Kita Weserwichtel e.V.",
    CREDITOR_ID: "DE83ZZZ00002910027",
    BANK_NAME: "GLS Gemeinschaftsbank eG",
    BANK_IBAN: "DE67 8306 5408 0007 0069 93",
    BANK_BIC: "GENODEF1SLR",
    REGISTER_COURT: "Amtsgericht Charlottenburg (Berlin)",
    REGISTER_NUMBER: "VR 42469 B",
    CUSTOM_DOMAIN_ACTIVE: false,
    CUSTOM_DOMAIN_NAME: "foerderverein-weserwichtel.de",
    CUSTOM_DOMAIN_EMAIL: "info@foerderverein-weserwichtel.de",
    VEREIN_GMAIL: "foerdervereinweserwichtel@gmail.com",
    RECIPIENT_EMAIL: "foerdervereinweserwichtel@gmail.com",
    DATABASE_WEBHOOK_URL: "",
    VERSION: "2.0.0"
  };

  const CURRENT_YEAR = String(new Date().getFullYear());

  // Fallback Demo Data (Only used when Gaston clicks "Offline-Testansicht")
  const DEMO_MEMBERS = [
    {
      id: "WW-1001",
      rowNumber: 2,
      entryDate: "2026-11-02 14:15",
      status: "Neu eingegangen",
      lastName: "Musterfrau",
      firstName: "Erika",
      email: "erika.musterfrau@beispiel.de",
      phone: "030 12345678",
      address: "Weserstraße 100",
      city: "12059 Berlin",
      birthDate: "15.05.1988",
      childName: "Lina Musterfrau",
      childGroup: "Wichtelgruppe",
      fee: "24.00",
      accountHolder: "Erika Musterfrau",
      iban: "DE67 8306 5408 0007 0069 93",
      bic: "GENODEF1SLR",
      bankName: "GLS Gemeinschaftsbank eG",
      pdfStatus: "Wartet auf E-Mail",
      matchedPdfName: null,
      matchedPdfUrl: null,
      mandateRef: "WW-2026-1001",
      paidYears: [],
      notes: "Wartet auf Schritt 1 (Antrags-PDF)"
    },
    {
      id: "WW-1002",
      rowNumber: 3,
      entryDate: "2026-11-04 11:20",
      status: "Neu eingegangen",
      lastName: "Weber",
      firstName: "Michael",
      email: "m.weber@beispiel.de",
      phone: "030 55443322",
      address: "Donaustraße 78",
      city: "12043 Berlin",
      birthDate: "03.07.1982",
      childName: "Clara Weber",
      childGroup: "Wichtelgruppe",
      fee: "60.00",
      accountHolder: "Michael Weber",
      iban: "DE06 1007 0024 0555 4443 32",
      bic: "DEUTDEDBBER",
      bankName: "Deutsche Bank",
      pdfStatus: "PDF erhalten & geprüft",
      matchedPdfName: "2026-11-04_Weber_Michael_Mitgliedsantrag.pdf",
      matchedPdfUrl: "#pdf-preview",
      mandateRef: "WW-2026-1002",
      paidYears: [],
      notes: "Auto-Archiv: PDF liegt vor, bereit für Schritt 2 (Vorab-Mail)"
    },
    {
      id: "WW-1003",
      rowNumber: 4,
      entryDate: "2026-10-28 09:30",
      status: "Aktiv",
      lastName: "Schmidt",
      firstName: "Alexander",
      email: "alex.schmidt@beispiel.de",
      phone: "0176 98765432",
      address: "Sonnenallee 45",
      city: "12045 Berlin",
      birthDate: "22.09.1984",
      childName: "Noah Schmidt",
      childGroup: "Räuberhöhle",
      fee: "36.00",
      accountHolder: "Alexander Schmidt",
      iban: "DE17 1005 0000 0123 4567 89",
      bic: "BELADEB1BRL",
      bankName: "Berliner Sparkasse",
      pdfStatus: "PDF erhalten & geprüft",
      matchedPdfName: "2026-10-28_Schmidt_Alexander_Mitgliedsantrag.pdf",
      matchedPdfUrl: "#pdf-preview",
      mandateRef: "WW-2026-1003",
      paidYears: [],
      notes: "Pre-Notif gesendet am 29.10.2026"
    },
    {
      id: "WW-1004",
      rowNumber: 5,
      entryDate: "2026-10-15 17:45",
      status: "Aktiv",
      lastName: "Yilmaz",
      firstName: "Fatma",
      email: "fatma.yilmaz@beispiel.de",
      phone: "0172 11223344",
      address: "Pannierstraße 12",
      city: "12047 Berlin",
      birthDate: "11.02.1990",
      childName: "Emir Yilmaz",
      childGroup: "Zwergenstube",
      fee: "24.00",
      accountHolder: "Fatma Yilmaz",
      iban: "DE29 1001 0010 0987 6543 21",
      bic: "PBNKDEFF",
      bankName: "Postbank",
      pdfStatus: "PDF erhalten & geprüft",
      matchedPdfName: "2026-10-15_Yilmaz_Fatma_Mitgliedsantrag.pdf",
      matchedPdfUrl: "#pdf-preview",
      mandateRef: "WW-2026-1004",
      paidYears: ["2026"],
      notes: "Pre-Notif gesendet am 16.10.2026 · Beitrag 2026 bereits eingezogen"
    }
  ];

  // Portal State
  const state = {
    isAuthenticated: false,
    isDemoMode: false,
    sessionToken: localStorage.getItem('ww_admin_session_token') || '',
    members: [],
    folderUrls: {},
    filter: 'ALL',
    searchQuery: '',
    selectedMemberForEmail: null,
    selectedMemberForPdfUpload: null,
    selectedMemberForManage: null,
    unmaskedIbans: new Set(),
    sepaCollectionYear: CURRENT_YEAR,
    sepaSelectedIds: new Set(),
    customDomainActive: Boolean(config.CUSTOM_DOMAIN_ACTIVE || localStorage.getItem('ww_custom_domain_active') === 'true')
  };

  function getActiveContactEmail() {
    return state.customDomainActive
      ? (config.CUSTOM_DOMAIN_EMAIL || 'info@foerderverein-weserwichtel.de')
      : (config.VEREIN_GMAIL || 'foerdervereinweserwichtel@gmail.com');
  }

  // DOM References
  const el = {
    loginOverlay: document.getElementById('loginOverlay'),
    loginForm: document.getElementById('loginForm'),
    loginPasswordInput: document.getElementById('loginPasswordInput'),
    loginSubmitBtn: document.getElementById('loginSubmitBtn'),
    loginErrorBox: document.getElementById('loginErrorBox'),
    loginInfoBox: document.getElementById('loginInfoBox'),
    requestEmailPinBtn: document.getElementById('requestEmailPinBtn'),
    enterDemoModeBtn: document.getElementById('enterDemoModeBtn'),

    connectionStatusBadge: document.getElementById('connectionStatusBadge'),
    connectionStatusLabel: document.getElementById('connectionStatusLabel'),
    scanInboxBtn: document.getElementById('scanInboxBtn'),
    openFoldersModalBtn: document.getElementById('openFoldersModalBtn'),
    openMaintainerModalBtn: document.getElementById('openMaintainerModalBtn'),
    installAppBtn: document.getElementById('installAppBtn'),
    refreshDataBtn: document.getElementById('refreshDataBtn'),
    logoutBtn: document.getElementById('logoutBtn'),

    kpiActiveCount: document.getElementById('kpiActiveCount'),
    kpiAnnualSum: document.getElementById('kpiAnnualSum'),
    kpiPendingCount: document.getElementById('kpiPendingCount'),
    kpiCurrentYearLabel: document.getElementById('kpiCurrentYearLabel'),
    kpiReadyForSepaCount: document.getElementById('kpiReadyForSepaCount'),

    memberSearchInput: document.getElementById('memberSearchInput'),
    filterButtonGroup: document.getElementById('filterButtonGroup'),
    countFilterAll: document.getElementById('countFilterAll'),
    countFilterPending: document.getElementById('countFilterPending'),
    countFilterActive: document.getElementById('countFilterActive'),
    countFilterCancelled: document.getElementById('countFilterCancelled'),

    membersTableBody: document.getElementById('membersTableBody'),
    emptyState: document.getElementById('emptyState'),
    displayedCount: document.getElementById('displayedCount'),
    totalCount: document.getElementById('totalCount'),
    hiddenPdfFileInput: document.getElementById('hiddenPdfFileInput'),

    // Email Modal
    emailModal: document.getElementById('emailModal'),
    closeEmailModalBtn: document.getElementById('closeEmailModalBtn'),
    emailModalRecipient: document.getElementById('emailModalRecipient'),
    emailModalReplyTo: document.getElementById('emailModalReplyTo'),
    emailModalSubject: document.getElementById('emailModalSubject'),
    emailModalBody: document.getElementById('emailModalBody'),
    openMailAppBtn: document.getElementById('openMailAppBtn'),
    copyEmailTextBtn: document.getElementById('copyEmailTextBtn'),
    sendViaVereinAccountBtn: document.getElementById('sendViaVereinAccountBtn'),

    // SEPA Modal
    openSepaModalBtn: document.getElementById('openSepaModalBtn'),
    sepaModal: document.getElementById('sepaModal'),
    closeSepaModalBtn: document.getElementById('closeSepaModalBtn'),
    cancelSepaModalBtn: document.getElementById('cancelSepaModalBtn'),
    sepaCollectionYear: document.getElementById('sepaCollectionYear'),
    sepaExecutionDate: document.getElementById('sepaExecutionDate'),
    sepaSelectedCount: document.getElementById('sepaSelectedCount'),
    sepaTotalSum: document.getElementById('sepaTotalSum'),
    sepaMemberList: document.getElementById('sepaMemberList'),
    selectAllSepaBtn: document.getElementById('selectAllSepaBtn'),
    deselectAllSepaBtn: document.getElementById('deselectAllSepaBtn'),
    sepaMarkCollectedCheck: document.getElementById('sepaMarkCollectedCheck'),
    downloadSepaXmlBtn: document.getElementById('downloadSepaXmlBtn'),

    // Manage / Cancel Member Modal
    manageMemberModal: document.getElementById('manageMemberModal'),
    closeManageMemberModalBtn: document.getElementById('closeManageMemberModalBtn'),
    cancelManageMemberBtn: document.getElementById('cancelManageMemberBtn'),
    manageMemberForm: document.getElementById('manageMemberForm'),
    manageMemberTitle: document.getElementById('manageMemberTitle'),
    editFirstName: document.getElementById('editFirstName'),
    editLastName: document.getElementById('editLastName'),
    editChildName: document.getElementById('editChildName'),
    editChildGroup: document.getElementById('editChildGroup'),
    editFee: document.getElementById('editFee'),
    editEmail: document.getElementById('editEmail'),
    editIban: document.getElementById('editIban'),
    editNotes: document.getElementById('editNotes'),
    editCancelCheck: document.getElementById('editCancelCheck'),
    editCancellationPdfInput: document.getElementById('editCancellationPdfInput'),

    // Folders & Maintainer Modal
    foldersModal: document.getElementById('foldersModal'),
    closeFoldersModalBtn: document.getElementById('closeFoldersModalBtn'),
    linkFolderSheet: document.getElementById('linkFolderSheet'),
    linkFolderAntraege: document.getElementById('linkFolderAntraege'),
    linkFolderPreNotifs: document.getElementById('linkFolderPreNotifs'),
    linkFolderKuendigungen: document.getElementById('linkFolderKuendigungen'),
    linkFolderSepaArchiv: document.getElementById('linkFolderSepaArchiv'),
    healFoldersBtn: document.getElementById('healFoldersBtn'),
    loadSystemLogsBtn: document.getElementById('loadSystemLogsBtn'),
    domainStatusText: document.getElementById('domainStatusText'),
    toggleCustomDomainBtn: document.getElementById('toggleCustomDomainBtn'),
    newAdminPasswordInput: document.getElementById('newAdminPasswordInput'),
    saveAdminPasswordBtn: document.getElementById('saveAdminPasswordBtn'),
    systemLogsBox: document.getElementById('systemLogsBox'),

    // PWA Install Modal
    installModal: document.getElementById('installModal'),
    closeInstallModalBtn: document.getElementById('closeInstallModalBtn'),
    dismissInstallModalBtn: document.getElementById('dismissInstallModalBtn'),
    triggerNativeInstallBtn: document.getElementById('triggerNativeInstallBtn'),

    // Toast
    toastNotification: document.getElementById('toastNotification'),
    toastMessage: document.getElementById('toastMessage'),
    toastIcon: document.getElementById('toastIcon')
  };

  let deferredPrompt = null;

  /**
   * Initialize Portal
   */
  function init() {
    setupGlobalErrorTelemetry();
    setupEventListeners();
    registerServiceWorker();
    setupPwaInstall();
    checkRemoteVersionUpdate();

    // Update year labels
    if (el.kpiCurrentYearLabel) el.kpiCurrentYearLabel.textContent = CURRENT_YEAR;
    document.querySelectorAll('.kpiYearText').forEach(node => {
      node.textContent = CURRENT_YEAR;
    });

    // If a saved session token exists, automatically attempt live login
    if (state.sessionToken) {
      el.loginOverlay.classList.add('hidden');
      state.isAuthenticated = true;
      fetchMembers();
    }
  }

  /**
   * Zero-Touch Remote Auto-Updater:
   * Checks version.json on GitHub whenever the Treasurer opens or focuses the app.
   */
  async function checkRemoteVersionUpdate() {
    if (window.location.protocol === 'file:') return;
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const storedVersion = localStorage.getItem('ww_app_build_version');
      if (data && data.version) {
        if (storedVersion && storedVersion !== data.version) {
          localStorage.setItem('ww_app_build_version', data.version);
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
          window.location.reload();
          return;
        }
        localStorage.setItem('ww_app_build_version', data.version);
      }
    } catch (e) {}
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkRemoteVersionUpdate();
    }
  });

  /**
   * Remote Error Telemetry (Logs unexpected browser errors on the Treasurer's computer to Google Sheets)
   */
  function setupGlobalErrorTelemetry() {
    window.addEventListener('error', (event) => {
      reportClientError(event.message || 'JS Error', `${event.filename || ''}:${event.lineno || ''}`);
    });
  }

  function reportClientError(message, details) {
    if (!config.DATABASE_WEBHOOK_URL || state.isDemoMode) return;
    fetch(config.DATABASE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'logClientError',
        message: message,
        details: `${details} | UA: ${navigator.userAgent}`
      })
    }).catch(() => {});
  }

  /**
   * Backend API Caller
   */
  async function callBackendApi(payload) {
    if (!config.DATABASE_WEBHOOK_URL) {
      throw new Error('Keine DATABASE_WEBHOOK_URL in config.js hinterlegt.');
    }
    const bodyObj = Object.assign({}, payload, { token: state.sessionToken });
    const response = await fetch(config.DATABASE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(bodyObj)
    });
    if (!response.ok) {
      throw new Error('Server-Antwort: HTTP ' + response.status);
    }
    const rawText = await response.text();
    let result;
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      if (rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
        throw new Error('Google Apps Script Zugriff gesperrt: Bitte Bereitstellung prüfen (Einstellung "Wer hat Zugriff" muss auf "Jeder" stehen).');
      }
      throw new Error('Ungültige Antwort vom Server: ' + rawText.slice(0, 100));
    }
    if (result && (result.result === 'unauthorized' || result.status === 'unauthorized')) {
      handleLogout('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
      throw new Error('Nicht autorisiert');
    }
    return result;
  }

  /**
   * Authentication Handlers
   */
  async function handleLoginSubmit(e) {
    e.preventDefault();
    const inputVal = (el.loginPasswordInput.value || '').trim();
    if (!inputVal) return;

    el.loginErrorBox.classList.add('hidden');
    el.loginInfoBox.classList.add('hidden');
    el.loginSubmitBtn.disabled = true;
    el.loginSubmitBtn.textContent = 'Prüfe Zugangsberechtigung...';

    try {
      const isSixDigitPin = /^\d{6}$/.test(inputVal);
      const res = await callBackendApi({
        action: 'login',
        password: isSixDigitPin ? '' : inputVal,
        pin: isSixDigitPin ? inputVal : '',
        userAgent: navigator.userAgent
      });

      if (res.result === 'success' && res.token) {
        state.sessionToken = res.token;
        state.isAuthenticated = true;
        state.isDemoMode = false;
        localStorage.setItem('ww_admin_session_token', res.token);
        el.loginPasswordInput.value = '';
        el.loginOverlay.classList.add('hidden');
        showToast('Erfolgreich mit Vereins-Tresor verbunden!', 'success');
        await fetchMembers();
      } else if (res.row !== undefined && !res.token) {
        el.loginErrorBox.innerHTML =
          '⚠️ <strong>Google Apps Script muss noch aktualisiert werden (läuft noch auf v1.0):</strong><br/>' +
          'Bitte kopieren Sie den neuen Code aus <code>integrations/google-sheets/Code.gs</code> in Ihre Google-Tabelle (<em>Erweiterungen ➔ Apps Script</em>) und wählen Sie <em>Bereitstellen ➔ Bereitstellungen verwalten ➔ ✏️ Bearbeiten ➔ Neue Version</em>.';
        el.loginErrorBox.classList.remove('hidden');
      } else {
        el.loginErrorBox.textContent = res.error || 'Anmeldung fehlgeschlagen.';
        el.loginErrorBox.classList.remove('hidden');
      }
    } catch (err) {
      el.loginErrorBox.textContent = 'Verbindungsfehler zum Google-Script. Nutzen Sie zum Offline-Testen unten die "Offline-Testansicht". (' + err.message + ')';
      el.loginErrorBox.classList.remove('hidden');
    } finally {
      el.loginSubmitBtn.disabled = false;
      el.loginSubmitBtn.innerHTML = '<span>🔓 Sicher anmelden & Mitgliederdaten laden</span>';
    }
  }

  async function handleRequestEmailPin() {
    el.loginErrorBox.classList.add('hidden');
    el.loginInfoBox.classList.add('hidden');
    el.requestEmailPinBtn.disabled = true;
    el.requestEmailPinBtn.textContent = 'Sende 6-stelligen PIN...';

    try {
      const res = await callBackendApi({ action: 'requestEmailPin' });
      if (res.row !== undefined) {
        el.loginErrorBox.innerHTML =
          '⚠️ <strong>Es wurde keine E-Mail gesendet, weil in Google Sheets noch das alte Script (v1.0) aktiv ist!</strong><br/>' +
          '1. Öffnen Sie die Google-Tabelle ➔ <em>Erweiterungen ➔ Apps Script</em>.<br/>' +
          '2. Ersetzen Sie den Code durch die neue Datei <code>integrations/google-sheets/Code.gs</code>.<br/>' +
          '3. Klicken Sie oben rechts auf <em>Bereitstellen ➔ Bereitstellungen verwalten ➔ ✏️ Bearbeiten ➔ Version: „Neue Version“ ➔ Bereitstellen</em> und bestätigen Sie einmalig die Google-Berechtigung für Mail & Drive.';
        el.loginErrorBox.classList.remove('hidden');
      } else if (res.result === 'success') {
        el.loginInfoBox.textContent = res.message + ' Bitte geben Sie den 6-stelligen Code oben in das Feld ein.';
        el.loginInfoBox.classList.remove('hidden');
      } else {
        el.loginErrorBox.textContent = res.error || 'Konnte PIN nicht senden.';
        el.loginErrorBox.classList.remove('hidden');
      }
    } catch (err) {
      el.loginErrorBox.textContent = 'Fehler beim Senden des PINs: ' + err.message;
      el.loginErrorBox.classList.remove('hidden');
    } finally {
      el.requestEmailPinBtn.disabled = false;
      el.requestEmailPinBtn.textContent = '📧 6-stelligen Einmal-PIN an Vereins-E-Mail senden';
    }
  }

  function enterDemoMode() {
    state.isDemoMode = true;
    state.isAuthenticated = true;
    const saved = localStorage.getItem('ww_admin_demo_members_v2');
    if (saved) {
      try {
        state.members = JSON.parse(saved);
      } catch (e) {
        state.members = JSON.parse(JSON.stringify(DEMO_MEMBERS));
      }
    } else {
      state.members = JSON.parse(JSON.stringify(DEMO_MEMBERS));
    }
    el.loginOverlay.classList.add('hidden');
    renderAll();
    showToast('Offline-Testansicht geladen.', 'info');
  }

  function handleLogout(reasonMsg) {
    state.sessionToken = '';
    state.isAuthenticated = false;
    state.isDemoMode = false;
    localStorage.removeItem('ww_admin_session_token');
    el.loginOverlay.classList.remove('hidden');
    if (reasonMsg && typeof reasonMsg === 'string') {
      el.loginErrorBox.textContent = reasonMsg;
      el.loginErrorBox.classList.remove('hidden');
    }
  }

  function saveDemoState() {
    if (state.isDemoMode) {
      localStorage.setItem('ww_admin_demo_members_v2', JSON.stringify(state.members));
    }
  }

  /**
   * Fetch Members & Locked Folder Links
   */
  async function fetchMembers() {
    if (state.isDemoMode) {
      renderAll();
      return;
    }

    try {
      showToast('Synchronisiere mit Google Sheets & Google Drive...', 'info');
      const res = await callBackendApi({ action: 'getMembers' });
      if (res && Array.isArray(res.members)) {
        state.members = res.members;
        if (res.folderUrls) {
          state.folderUrls = res.folderUrls;
          updateFolderModalLinks();
        }
        if (typeof res.customDomainActive === 'boolean') {
          state.customDomainActive = res.customDomainActive;
          localStorage.setItem('ww_custom_domain_active', String(res.customDomainActive));
        }
        renderAll();
        showToast('Mitglieder & Drive-PDFs erfolgreich abgeglichen!', 'success');
      }
    } catch (err) {
      console.warn('Fehler beim Abruf:', err);
      showToast('Verbindungsproblem: ' + err.message, 'warning');
    }
  }

  function updateFolderModalLinks() {
    const u = state.folderUrls || {};
    if (el.linkFolderSheet && u.sheet) el.linkFolderSheet.href = u.sheet;
    if (el.linkFolderAntraege && u.antragsPdfs) el.linkFolderAntraege.href = u.antragsPdfs;
    if (el.linkFolderPreNotifs && u.preNotifs) el.linkFolderPreNotifs.href = u.preNotifs;
    if (el.linkFolderKuendigungen && u.kuendigungen) el.linkFolderKuendigungen.href = u.kuendigungen;
    if (el.linkFolderSepaArchiv && u.sepaArchiv) el.linkFolderSepaArchiv.href = u.sepaArchiv;
  }

  /**
   * Step 1 Helper: Check if Member has Signed PDF on File
   */
  function memberHasPdf(member) {
    return Boolean(member.matchedPdfName || member.pdfStatus === 'PDF erhalten & geprüft');
  }

  /**
   * Step 2 Helper: Check if Member is Active / Pre-Notified
   */
  function memberIsActive(member) {
    return member.status === 'Aktiv';
  }

  /**
   * Step 3 Helper: Check if Member has already paid for a given year
   */
  function memberHasPaidYear(member, yearStr) {
    const yrs = Array.isArray(member.paidYears) ? member.paidYears : [];
    return yrs.includes(String(yearStr));
  }

  /**
   * Render All UI Elements
   */
  function renderAll() {
    updateConnectionBadge();
    updateDomainStatusUi();
    renderKpis();
    renderFilterCounts();
    renderTable();
  }

  function updateDomainStatusUi() {
    const activeEmail = getActiveContactEmail();
    if (el.emailModalReplyTo) {
      el.emailModalReplyTo.value = activeEmail;
    }
    if (el.domainStatusText) {
      el.domainStatusText.textContent = state.customDomainActive
        ? `Eigene Domain aktiv (${activeEmail})`
        : `Wartet auf Domain-Kauf – Aktuell aktiv: ${activeEmail}`;
    }
    if (el.toggleCustomDomainBtn) {
      el.toggleCustomDomainBtn.textContent = state.customDomainActive
        ? 'Auf Gmail zurückschalten'
        : 'Auf info@foerderverein-weserwichtel.de umschalten';
    }
  }

  function updateConnectionBadge() {
    if (!el.connectionStatusBadge || !el.connectionStatusLabel) return;
    if (state.isDemoMode) {
      el.connectionStatusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300';
      el.connectionStatusLabel.textContent = 'Offline-Testansicht (Lokale Demo-Daten)';
    } else {
      el.connectionStatusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200';
      el.connectionStatusLabel.textContent = 'Live verbunden mit Google Drive & Sheets';
    }
  }

  function renderKpis() {
    const active = state.members.filter(m => m.status === 'Aktiv');
    const pending = state.members.filter(m => m.status !== 'Aktiv' && m.status !== 'Gekündigt');
    const totalSum = active.reduce((sum, m) => sum + parseFloat(m.fee || 24), 0);
    const readyForSepa = active.filter(m => memberHasPdf(m) && !memberHasPaidYear(m, CURRENT_YEAR));

    if (el.kpiActiveCount) el.kpiActiveCount.textContent = active.length;
    if (el.kpiAnnualSum) el.kpiAnnualSum.textContent = formatCurrency(totalSum);
    if (el.kpiPendingCount) el.kpiPendingCount.textContent = pending.length;
    if (el.kpiReadyForSepaCount) el.kpiReadyForSepaCount.textContent = readyForSepa.length;
  }

  function renderFilterCounts() {
    if (el.countFilterAll) el.countFilterAll.textContent = state.members.length;
    if (el.countFilterPending) el.countFilterPending.textContent = state.members.filter(m => m.status !== 'Aktiv' && m.status !== 'Gekündigt').length;
    if (el.countFilterActive) el.countFilterActive.textContent = state.members.filter(m => m.status === 'Aktiv').length;
    if (el.countFilterCancelled) el.countFilterCancelled.textContent = state.members.filter(m => m.status === 'Gekündigt').length;
  }

  function getFilteredMembers() {
    return state.members.filter(member => {
      if (state.filter === 'PENDING' && (member.status === 'Aktiv' || member.status === 'Gekündigt')) return false;
      if (state.filter === 'ACTIVE' && member.status !== 'Aktiv') return false;
      if (state.filter === 'CANCELLED' && member.status !== 'Gekündigt') return false;

      if (state.searchQuery) {
        const q = state.searchQuery;
        const haystack = [
          member.firstName,
          member.lastName,
          member.childName,
          member.childGroup,
          member.email,
          member.iban,
          member.mandateRef,
          member.notes
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  /**
   * Render Main Table with Strict 3-Step Guardrails
   */
  function renderTable() {
    const list = getFilteredMembers();
    if (el.displayedCount) el.displayedCount.textContent = list.length;
    if (el.totalCount) el.totalCount.textContent = state.members.length;

    if (!el.membersTableBody) return;
    el.membersTableBody.innerHTML = '';

    if (list.length === 0) {
      if (el.emptyState) el.emptyState.classList.remove('hidden');
      return;
    }
    if (el.emptyState) el.emptyState.classList.add('hidden');

    list.forEach(member => {
      const tr = document.createElement('tr');
      tr.className = member.status === 'Gekündigt'
        ? 'bg-slate-50/60 opacity-60 transition-colors'
        : 'hover:bg-slate-50/90 transition-colors';

      const isIbanUnmasked = state.unmaskedIbans.has(member.id);
      const displayIban = isIbanUnmasked ? member.iban : maskIban(member.iban);
      const ibanValid = isValidIbanChecksum(member.iban);

      const hasPdf = memberHasPdf(member);
      const isActive = memberIsActive(member);
      const isCancelled = member.status === 'Gekündigt';
      const paidThisYear = memberHasPaidYear(member, CURRENT_YEAR);

      // --- SCHRITT 1 HTML: Antrags-PDF im Google Drive ---
      let step1Html = '';
      if (hasPdf) {
        const fileName = member.matchedPdfName || 'Antrags-PDF im Drive';
        const openLink = member.matchedPdfUrl && member.matchedPdfUrl !== '#'
          ? `<a href="${escapeHtml(member.matchedPdfUrl)}" target="_blank" rel="noopener" class="text-[11px] font-bold text-[#1B4D3E] hover:underline">Öffnen ↗</a>`
          : '';
        step1Html = `
          <div class="space-y-1">
            <div class="flex items-center gap-1.5">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                🟢 1. PDF im Drive
              </span>
              ${openLink}
            </div>
            <div class="text-[10px] text-slate-500 font-mono truncate max-w-[180px]" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</div>
          </div>
        `;
      } else {
        step1Html = `
          <div class="pdf-dropzone p-2 rounded-xl border border-dashed border-amber-400 bg-amber-50/60 space-y-1" data-id="${member.id}">
            <div class="text-[10px] font-bold text-amber-900">🔴 1. Unterschriebenes PDF fehlt</div>
            <button type="button" class="upload-pdf-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-bold shadow-2xs transition-colors" data-id="${member.id}">
              📄 PDF auswählen / hierher ziehen
            </button>
          </div>
        `;
      }

      // --- SCHRITT 2 HTML: Aufnahme & SEPA-Vorab-Mail (Guardrail: Erst wenn Schritt 1 🟢!) ---
      let step2Html = '';
      if (isCancelled) {
        step2Html = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">🚪 Mitgliedschaft beendet</span>`;
      } else if (!hasPdf) {
        step2Html = `
          <div class="text-[11px] text-slate-400 flex items-center gap-1" title="Sicherheitssperre: Bitte ordnen Sie zuerst in Schritt 1 das unterschriebene SEPA-Mandats-PDF zu.">
            <span>🔒</span>
            <span>Wartet auf Schritt 1 (PDF)</span>
          </div>
        `;
      } else if (!isActive) {
        step2Html = `
          <div class="space-y-1">
            <button type="button" class="open-email-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B4D3E] hover:bg-[#003629] text-white text-[11px] font-bold shadow-xs transition-colors animate-pulse" data-id="${member.id}">
              <span>✉️ 2. Vorab-Mail prüfen & senden</span>
            </button>
            <div class="text-[10px] text-amber-700 font-medium">Nächster Pflichtschritt!</div>
          </div>
        `;
      } else {
        step2Html = `
          <div class="space-y-1">
            <div class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
              🟢 2. Aktiv & Vorab-Mail gesendet
            </div>
            <div>
              <button type="button" class="open-email-btn text-[10px] text-slate-500 hover:text-[#1B4D3E] underline" data-id="${member.id}">
                Beleg / E-Mail erneut ansehen
              </button>
            </div>
          </div>
        `;
      }

      // --- SCHRITT 3 HTML: Jahresbeitrag SEPA-Einzug ---
      let step3Html = '';
      if (isCancelled) {
        step3Html = `<span class="text-[11px] text-rose-700 font-bold">⛔ SEPA-Mandat gesperrt</span>`;
      } else if (!isActive || !hasPdf) {
        step3Html = `<span class="text-[11px] text-slate-400">🔒 Erst nach Schritt 2</span>`;
      } else if (paidThisYear) {
        step3Html = `
          <div class="space-y-0.5">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900">
              ✅ ${CURRENT_YEAR} eingezogen
            </span>
            <div class="text-[10px] text-slate-400">Vor Doppel-Einzug geschützt</div>
          </div>
        `;
      } else {
        step3Html = `
          <div class="space-y-0.5">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-900">
              ⏳ Bereit für Einzug ${CURRENT_YEAR}
            </span>
            <div class="text-[10px] text-slate-500">Wird im SEPA-XML berücksichtigt</div>
          </div>
        `;
      }

      tr.innerHTML = `
        <td class="py-3.5 px-4">
          <div class="font-bold text-slate-900 text-xs">${escapeHtml(member.lastName)}, ${escapeHtml(member.firstName)}</div>
          <div class="text-[11px] text-slate-600">Kind: <strong>${escapeHtml(member.childName || '–')}</strong> (${escapeHtml(member.childGroup || 'Kita')})</div>
          <div class="text-[10px] text-slate-400 font-mono mt-0.5">${escapeHtml(member.email)}</div>
        </td>
        <td class="py-3.5 px-4">
          <div class="font-extrabold text-slate-900">${formatCurrency(member.fee)} <span class="text-[10px] font-normal text-slate-500">/ Jahr</span></div>
          <div class="flex items-center gap-1 mt-0.5">
            <span class="font-mono text-[11px] ${ibanValid ? 'text-slate-700' : 'text-red-600 font-bold'}">${escapeHtml(displayIban)}</span>
            <button type="button" class="toggle-iban-btn text-slate-400 hover:text-slate-700 px-1" data-id="${member.id}" title="IBAN zeigen/verbergen">
              ${isIbanUnmasked ? '🙈' : '👁️'}
            </button>
          </div>
          <div class="text-[10px] text-slate-400 font-mono">Mandat: ${escapeHtml(member.mandateRef || member.id)}</div>
        </td>
        <td class="py-3.5 px-4">${step1Html}</td>
        <td class="py-3.5 px-4">${step2Html}</td>
        <td class="py-3.5 px-4">${step3Html}</td>
        <td class="py-3.5 px-4 text-right">
          <button type="button" class="manage-member-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors" data-id="${member.id}">
            <span>✏️ Bearbeiten / Kündigung</span>
          </button>
          ${member.notes ? `<div class="text-[10px] text-slate-400 mt-1 truncate max-w-[160px] ml-auto" title="${escapeHtml(member.notes)}">${escapeHtml(member.notes)}</div>` : ''}
        </td>
      `;

      el.membersTableBody.appendChild(tr);
    });

    attachRowListeners();
  }

  function attachRowListeners() {
    // IBAN Toggle
    el.membersTableBody.querySelectorAll('.toggle-iban-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (state.unmaskedIbans.has(id)) state.unmaskedIbans.delete(id);
        else state.unmaskedIbans.add(id);
        renderTable();
      });
    });

    // Step 1: Upload PDF button & Drag-and-Drop
    el.membersTableBody.querySelectorAll('.upload-pdf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        state.selectedMemberForPdfUpload = state.members.find(m => m.id === id) || null;
        if (el.hiddenPdfFileInput) {
          el.hiddenPdfFileInput.value = '';
          el.hiddenPdfFileInput.click();
        }
      });
    });

    el.membersTableBody.querySelectorAll('.pdf-dropzone').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('bg-emerald-50', 'border-[#1B4D3E]');
      });
      zone.addEventListener('dragleave', () => {
        zone.classList.remove('bg-emerald-50', 'border-[#1B4D3E]');
      });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('bg-emerald-50', 'border-[#1B4D3E]');
        const id = zone.getAttribute('data-id');
        const member = state.members.find(m => m.id === id);
        if (member && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          uploadPdfFileForMember(member, e.dataTransfer.files[0]);
        }
      });
    });

    // Step 2: Open Pre-Notification Email Modal
    el.membersTableBody.querySelectorAll('.open-email-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openEmailModal(id);
      });
    });

    // Manage / Cancel Member Modal
    el.membersTableBody.querySelectorAll('.manage-member-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openManageMemberModal(id);
      });
    });
  }

  /**
   * Step 1 Execution: Upload & Auto-Rename PDF into Locked Google Drive Folder
   */
  async function uploadPdfFileForMember(member, file) {
    if (!file || !member) return;
    const dateIso = new Date().toISOString().slice(0, 10);
    const lockedName = `${dateIso}_${member.lastName}_${member.firstName}_Mitgliedsantrag.pdf`;

    try {
      showToast(`Speichere "${lockedName}" im Google Drive...`, 'info');
      const base64 = await fileToBase64(file);

      if (!state.isDemoMode) {
        const res = await callBackendApi({
          action: 'uploadMemberPdf',
          rowNumber: member.rowNumber,
          lastName: member.lastName,
          firstName: member.firstName,
          docType: 'Mitgliedsantrag',
          pdfBase64: base64
        });
        member.matchedPdfName = res.fileName || lockedName;
        member.matchedPdfUrl = res.fileUrl || '#';
      } else {
        member.matchedPdfName = lockedName;
        member.matchedPdfUrl = '#demo-pdf';
      }

      member.pdfStatus = 'PDF erhalten & geprüft';
      saveDemoState();
      renderAll();
      showToast(`Schritt 1 erledigt: "${member.matchedPdfName}" im Drive abgelegt!`, 'success');
    } catch (err) {
      alert('Fehler beim Speichern des PDFs im Google Drive: ' + err.message);
    }
  }

  /**
   * 1-Click Gmail Inbox Scanner for Signed PDFs
   */
  async function handleScanInbox() {
    if (state.isDemoMode) {
      const missing = state.members.find(m => !memberHasPdf(m));
      if (missing) {
        missing.matchedPdfName = `2026-11-05_${missing.lastName}_${missing.firstName}_Mitgliedsantrag.pdf`;
        missing.matchedPdfUrl = '#demo-pdf';
        missing.pdfStatus = 'PDF erhalten & geprüft';
        saveDemoState();
        renderAll();
        showToast(`[Demo] 1 Antrags-PDF im Postfach gefunden und automatisch für ${missing.firstName} ${missing.lastName} im Drive abgelegt!`, 'success');
      } else {
        showToast('[Demo] Alle Mitglieder haben bereits ihr Antrags-PDF im Drive.', 'info');
      }
      return;
    }

    el.scanInboxBtn.disabled = true;
    const origText = el.scanInboxBtn.innerHTML;
    el.scanInboxBtn.innerHTML = '<span>⏳ Durchsuche Vereins-Postfach...</span>';

    try {
      const res = await callBackendApi({ action: 'scanInboxForPdfs' });
      showToast(res.message || 'Postfach-Scan abgeschlossen.', res.matchedCount > 0 ? 'success' : 'info');
      if (res.matchedCount > 0) {
        await fetchMembers();
      }
    } catch (err) {
      showToast('Fehler beim Postfach-Scan: ' + err.message, 'warning');
    } finally {
      el.scanInboxBtn.disabled = false;
      el.scanInboxBtn.innerHTML = origText;
    }
  }

  /**
   * Step 2 Execution: Pre-Notification Email Preview & Central Verein Dispatch
   */
  function openEmailModal(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    if (!memberHasPdf(member)) {
      alert('Bitte schließen Sie zuerst Schritt 1 ab (Unterschriebenes Antrags-PDF zuordnen), bevor Sie die SEPA-Vorabinformation versenden.');
      return;
    }

    state.selectedMemberForEmail = member;
    const mandateRef = member.mandateRef || member.id;
    const feeStr = formatCurrency(member.fee || 24);
    const maskedIban = maskIban(member.iban);

    const subject = `Willkommen im Förderverein der Kita Weserwichtel e.V. – Aufnahmebestätigung & SEPA-Information (${mandateRef})`;
    const body = `Liebe/r ${member.firstName} ${member.lastName},

wir freuen uns sehr, Sie als neues Mitglied im Förderverein der Kita Weserwichtel e.V. begrüßen zu dürfen! Gemeinsam unterstützen wir Ausflüge, Spielgeräte und Projekte für unsere Kita-Kinder.

Der Vorstand hat Ihren Mitgliedsantrag geprüft und bestätigt hiermit herzlich Ihre Aufnahme.

----------------------------------------------------------------------
GESETZLICHE SEPA-VORABINFORMATION (PRE-NOTIFICATION)
----------------------------------------------------------------------
Gläubiger-Identifikationsnummer: ${config.CREDITOR_ID}
Ihre Mandatsreferenz:           ${mandateRef}
Zahlungspflichtige/r:           ${member.accountHolder || (member.firstName + ' ' + member.lastName)}
Bankverbindung (IBAN):          ${maskedIban} (${member.bankName || 'Bank'})
Jahresbeitrag:                  ${feeStr}
Einzugstermin:                  Jährlich zum 15. März (bzw. nächster Bankarbeitstag)

Hinweis: Der Mitgliedsbeitrag wird im Rahmen des SEPA-Basislastschriftverfahrens von Ihrem angegebenen Konto eingezogen. Bitte sorgen Sie zum Fälligkeitstag für ausreichende Kontodeckung.

Bei Fragen oder Änderungen erreichen Sie uns jederzeit unter:
${getActiveContactEmail()}

Herzliche Grüße
Der Vorstand & Schatzmeister
Förderverein der Kita Weserwichtel e.V.
Weserstraße 106, 12059 Berlin
Amtsgericht Charlottenburg · ${config.REGISTER_NUMBER}`;

    el.emailModalRecipient.value = member.email || '';
    if (el.emailModalReplyTo) el.emailModalReplyTo.value = getActiveContactEmail();
    el.emailModalSubject.value = subject;
    el.emailModalBody.value = body;
    el.emailModal.classList.remove('hidden');
  }

  function closeEmailModal() {
    el.emailModal.classList.add('hidden');
    state.selectedMemberForEmail = null;
  }

  async function handleSendViaVereinAccount() {
    const member = state.selectedMemberForEmail;
    if (!member) return;

    const to = el.emailModalRecipient.value;
    const subject = el.emailModalSubject.value;
    const body = el.emailModalBody.value;
    const replyTo = getActiveContactEmail();

    el.sendViaVereinAccountBtn.disabled = true;
    const origHtml = el.sendViaVereinAccountBtn.innerHTML;
    el.sendViaVereinAccountBtn.innerHTML = '<span>⏳ Sende über Vereinskonto & archiviere Beleg...</span>';

    try {
      const todayStr = new Date().toLocaleDateString('de-DE');
      if (!state.isDemoMode) {
        await callBackendApi({
          action: 'sendPreNotification',
          rowNumber: member.rowNumber,
          email: to,
          replyTo: replyTo,
          firstName: member.firstName,
          lastName: member.lastName,
          mandateRef: member.mandateRef || member.id,
          subject: subject,
          body: body
        });
      }

      member.status = 'Aktiv';
      const noteEntry = `Pre-Notif gesendet am ${todayStr}`;
      if (!String(member.notes || '').includes(noteEntry)) {
        member.notes = member.notes ? `${member.notes} · ${noteEntry}` : noteEntry;
      }

      saveDemoState();
      renderAll();
      closeEmailModal();
      showToast(`Schritt 2 erledigt: E-Mail an ${to} gesendet, Beleg im Drive gespeichert & Mitglied aktiviert!`, 'success');
    } catch (err) {
      alert('Fehler beim E-Mail-Versand: ' + err.message);
    } finally {
      el.sendViaVereinAccountBtn.disabled = false;
      el.sendViaVereinAccountBtn.innerHTML = origHtml;
    }
  }

  /**
   * Step 3 Execution: GLS Bank SEPA XML (pain.008.001.02) + Dual Drive Archive + Double-Debit Protection
   */
  function openSepaModal() {
    if (el.sepaCollectionYear) {
      state.sepaCollectionYear = el.sepaCollectionYear.value || CURRENT_YEAR;
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);
    if (el.sepaExecutionDate) {
      el.sepaExecutionDate.value = targetDate.toISOString().slice(0, 10);
    }

    autoSelectEligibleMembersForYear(state.sepaCollectionYear);
    renderSepaModalList();
    el.sepaModal.classList.remove('hidden');
  }

  function autoSelectEligibleMembersForYear(yearStr) {
    state.sepaSelectedIds.clear();
    state.members.forEach(m => {
      if (m.status === 'Aktiv' && memberHasPdf(m) && !memberHasPaidYear(m, yearStr) && isValidIbanChecksum(m.iban)) {
        state.sepaSelectedIds.add(m.id);
      }
    });
  }

  function closeSepaModal() {
    el.sepaModal.classList.add('hidden');
  }

  function renderSepaModalList() {
    if (!el.sepaMemberList) return;
    el.sepaMemberList.innerHTML = '';

    const yearStr = state.sepaCollectionYear;
    let totalSum = 0;
    let selectedCount = 0;

    state.members.forEach(member => {
      if (member.status === 'Gekündigt') return;

      const hasPdf = memberHasPdf(member);
      const isActive = memberIsActive(member);
      const alreadyPaid = memberHasPaidYear(member, yearStr);
      const ibanOk = isValidIbanChecksum(member.iban);
      const isEligible = hasPdf && isActive && !alreadyPaid && ibanOk;

      const isChecked = state.sepaSelectedIds.has(member.id);
      const feeNum = parseFloat(member.fee || 24);
      if (isChecked) {
        totalSum += feeNum;
        selectedCount++;
      }

      let statusNote = '';
      if (alreadyPaid) {
        statusNote = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">✅ Bereits ${yearStr} eingezogen</span>`;
      } else if (!hasPdf || !isActive) {
        statusNote = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">🔒 Noch nicht freigegeben (Schritt 1/2 fehlt)</span>`;
      } else if (!ibanOk) {
        statusNote = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">⚠️ IBAN-Prüfsumme ungültig</span>`;
      } else {
        statusNote = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900">Einzugsbereit ${yearStr}</span>`;
      }

      const row = document.createElement('label');
      row.className = `flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer select-none ${!isEligible ? 'opacity-60 bg-slate-50/50' : ''}`;
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <input type="checkbox" value="${member.id}" class="sepa-member-checkbox rounded border-slate-300 text-[#1B4D3E]" ${isChecked ? 'checked' : ''} ${(!hasPdf || !isActive || !ibanOk) ? 'disabled' : ''} />
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900">${escapeHtml(member.lastName)}, ${escapeHtml(member.firstName)}</span>
              ${statusNote}
            </div>
            <div class="text-[10px] text-slate-500 font-mono">${escapeHtml(member.iban)} · Mandat: ${escapeHtml(member.mandateRef || member.id)}</div>
          </div>
        </div>
        <div class="font-extrabold text-[#1B4D3E] text-xs">${formatCurrency(feeNum)}</div>
      `;

      const cb = row.querySelector('.sepa-member-checkbox');
      if (cb) {
        cb.addEventListener('change', (e) => {
          if (e.target.checked) state.sepaSelectedIds.add(member.id);
          else state.sepaSelectedIds.delete(member.id);
          renderSepaModalList();
        });
      }

      el.sepaMemberList.appendChild(row);
    });

    if (el.sepaSelectedCount) el.sepaSelectedCount.textContent = `${selectedCount} Mitglieder`;
    if (el.sepaTotalSum) el.sepaTotalSum.textContent = formatCurrency(totalSum);
  }

  async function handleDownloadAndArchiveSepaXml() {
    const selectedMembers = state.members.filter(m => state.sepaSelectedIds.has(m.id));
    if (selectedMembers.length === 0) {
      alert('Bitte wählen Sie mindestens ein fälliges Mitglied für den SEPA-Einzug aus.');
      return;
    }

    const yearStr = state.sepaCollectionYear;
    const executionDate = (el.sepaExecutionDate && el.sepaExecutionDate.value) || new Date().toISOString().slice(0, 10);
    const totalAmount = selectedMembers.reduce((sum, m) => sum + parseFloat(m.fee || 24), 0).toFixed(2);
    const nowIso = new Date().toISOString().replace(/\.\d+Z$/, '');
    const messageId = `WW-${yearStr}-${Date.now()}`;
    const pmtInfId = `PMT-${messageId}`;

    // 1. Build ISO 20022 pain.008.001.02 XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${escapeXml(messageId)}</MsgId>
      <CreDtTm>${nowIso}</CreDtTm>
      <NbOfTxs>${selectedMembers.length}</NbOfTxs>
      <CtrlSum>${totalAmount}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(config.ASSOCIATION_NAME)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(pmtInfId)}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${selectedMembers.length}</NbOfTxs>
      <CtrlSum>${totalAmount}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>CORE</Cd>
        </LclInstrm>
        <SeqTp>RCUR</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${executionDate}</ReqdColltnDt>
      <Cdtr>
        <Nm>${escapeXml(config.ASSOCIATION_NAME)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${cleanIban(config.BANK_IBAN)}</IBAN>
        </Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId>
          <BIC>${cleanBic(config.BANK_BIC)}</BIC>
        </FinInstnId>
      </CdtrAgt>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${escapeXml(config.CREDITOR_ID)}</Id>
              <SchmeNm>
                <Prtry>SEPA</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>`;

    // Also build CSV Audit Summary for the Kassenprüfung
    let csvLines = ['Mandatsreferenz;Nachname;Vorname;Kind;IBAN;BIC;Betrag_EUR;Beitragsjahr;Faelligkeitsdatum'];

    selectedMembers.forEach((m, idx) => {
      const amount = parseFloat(m.fee || 24).toFixed(2);
      const mndtId = m.mandateRef || m.id;
      const rawDate = (m.entryDate ? m.entryDate.slice(0, 10) : executionDate);
      const signatureDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : executionDate;
      const endToEndId = `WW-${yearStr}-${idx + 1}`;
      const remInfo = `Jahresbeitrag ${yearStr} Foerderverein Kita Weserwichtel e.V.`;

      xml += `
      <DrctDbtTxInf>
        <PmtId>
          <EndToEndId>${escapeXml(endToEndId)}</EndToEndId>
        </PmtId>
        <InstdAmt Ccy="EUR">${amount}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${escapeXml(mndtId)}</MndtId>
            <DtOfSgntr>${signatureDate}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId>
            <BIC>${cleanBic(m.bic || 'GENODEF1SLR')}</BIC>
          </FinInstnId>
        </DbtrAgt>
        <Dbtr>
          <Nm>${escapeXml(m.accountHolder || `${m.firstName} ${m.lastName}`)}</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id>
            <IBAN>${cleanIban(m.iban)}</IBAN>
          </Id>
        </DbtrAcct>
        <RmtInf>
          <Ustrd>${escapeXml(remInfo)}</Ustrd>
        </RmtInf>
      </DrctDbtTxInf>`;

      csvLines.push(`${mndtId};${m.lastName};${m.firstName};${m.childName || ''};${cleanIban(m.iban)};${cleanBic(m.bic)};${amount};${yearStr};${executionDate}`);
    });

    xml += `
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;

    // 2. Download XML locally for immediate upload into GLS Online-Banking
    const sumClean = totalAmount.replace('.', '_');
    const fileName = `${executionDate}_SEPA_Lastschrift_GLS_${selectedMembers.length}Mitglieder_${sumClean}EUR.xml`;
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 3. Archive in Google Drive & Mark Selected Members as Collected for `yearStr`
    const markCollected = el.sepaMarkCollectedCheck ? el.sepaMarkCollectedCheck.checked : true;
    el.downloadSepaXmlBtn.disabled = true;
    el.downloadSepaXmlBtn.textContent = '⏳ Archiviere im Google Drive...';

    try {
      if (!state.isDemoMode) {
        await callBackendApi({
          action: 'archiveSepaBatch',
          collectionYear: yearStr,
          memberCount: selectedMembers.length,
          totalSum: totalAmount,
          xmlContent: xml,
          csvSummary: csvLines.join('\r\n'),
          markAsCollected: markCollected,
          memberEmails: selectedMembers.map(m => m.email)
        });
      }

      if (markCollected) {
        selectedMembers.forEach(m => {
          if (!Array.isArray(m.paidYears)) m.paidYears = [];
          if (!m.paidYears.includes(yearStr)) m.paidYears.push(yearStr);
        });
        saveDemoState();
      }

      renderAll();
      closeSepaModal();
      showToast(`SEPA-XML heruntergeladen & sicher in 03_FINANZEN_&_BUCHHALTUNG/${yearStr}/ archiviert!`, 'success');
    } catch (err) {
      showToast('XML heruntergeladen, aber Drive-Archivierung meldete: ' + err.message, 'warning');
    } finally {
      el.downloadSepaXmlBtn.disabled = false;
      el.downloadSepaXmlBtn.innerHTML = '<span>📥 pain.008 XML herunterladen & im Drive archivieren</span>';
    }
  }

  /**
   * Guided Member Edit & Cancellation Modal
   */
  function openManageMemberModal(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    state.selectedMemberForManage = member;
    el.manageMemberTitle.textContent = `Mitglied verwalten: ${member.firstName} ${member.lastName}`;
    el.editFirstName.value = member.firstName || '';
    el.editLastName.value = member.lastName || '';
    el.editChildName.value = member.childName || '';
    el.editChildGroup.value = member.childGroup || '';
    el.editFee.value = parseFloat(member.fee || 24).toFixed(2);
    el.editEmail.value = member.email || '';
    el.editIban.value = member.iban || '';
    el.editNotes.value = member.notes || '';
    el.editCancelCheck.checked = (member.status === 'Gekündigt');
    if (el.editCancellationPdfInput) el.editCancellationPdfInput.value = '';

    el.manageMemberModal.classList.remove('hidden');
  }

  function closeManageMemberModal() {
    el.manageMemberModal.classList.add('hidden');
    state.selectedMemberForManage = null;
  }

  async function handleSaveManageMember(e) {
    e.preventDefault();
    const member = state.selectedMemberForManage;
    if (!member) return;

    const newIban = el.editIban.value.trim();
    if (newIban && !isValidIbanChecksum(newIban)) {
      alert('Die eingegebene IBAN hat eine ungültige Prüfsumme. Bitte prüfen Sie die Ziffern.');
      return;
    }

    const isCancelling = el.editCancelCheck.checked;
    let cancelPdfBase64 = '';
    if (isCancelling && el.editCancellationPdfInput && el.editCancellationPdfInput.files[0]) {
      cancelPdfBase64 = await fileToBase64(el.editCancellationPdfInput.files[0]);
    }

    try {
      if (!state.isDemoMode) {
        await callBackendApi({
          action: 'updateOrCancelMember',
          rowNumber: member.rowNumber,
          email: el.editEmail.value.trim(),
          firstName: el.editFirstName.value.trim(),
          lastName: el.editLastName.value.trim(),
          childName: el.editChildName.value.trim(),
          childGroup: el.editChildGroup.value.trim(),
          fee: el.editFee.value,
          iban: newIban,
          notes: el.editNotes.value.trim(),
          isCancellation: isCancelling,
          cancellationPdfBase64: cancelPdfBase64,
          noteAddition: isCancelling ? 'Gekündigt / SEPA gesperrt' : ''
        });
      }

      member.firstName = el.editFirstName.value.trim();
      member.lastName = el.editLastName.value.trim();
      member.childName = el.editChildName.value.trim();
      member.childGroup = el.editChildGroup.value.trim();
      member.fee = parseFloat(el.editFee.value || 24).toFixed(2);
      member.email = el.editEmail.value.trim();
      member.iban = newIban;
      member.notes = el.editNotes.value.trim();
      if (isCancelling) {
        member.status = 'Gekündigt';
      }

      saveDemoState();
      renderAll();
      closeManageMemberModal();
      showToast(isCancelling ? 'Kündigung gespeichert & SEPA-Mandat gesperrt.' : 'Mitgliedsdaten aktualisiert.', 'success');
    } catch (err) {
      alert('Fehler beim Speichern: ' + err.message);
    }
  }

  /**
   * Remote Maintainer Tools (Heal Folders & View System_Log)
   */
  async function handleHealFolders() {
    if (state.isDemoMode) {
      showToast('[Demo] Ordnerstruktur im Google Drive geprüft & OK.', 'success');
      return;
    }
    try {
      showToast('Prüfe und repariere Google Drive Ordnerstruktur...', 'info');
      const res = await callBackendApi({ action: 'healFolders', year: CURRENT_YEAR });
      if (res.folderUrls) {
        state.folderUrls = res.folderUrls;
        updateFolderModalLinks();
      }
      showToast(res.message || 'Ordnerstruktur erfolgreich synchronisiert!', 'success');
    } catch (err) {
      alert('Fehler bei Ordner-Reparatur: ' + err.message);
    }
  }

  async function handleLoadSystemLogs() {
    if (!el.systemLogsBox) return;
    el.systemLogsBox.classList.remove('hidden');
    if (state.isDemoMode) {
      el.systemLogsBox.innerHTML = `<div>[${new Date().toLocaleString('de-DE')}] DEMO_MODE: System läuft fehlerfrei im lokalen Vorschaumodus.</div>`;
      return;
    }
    el.systemLogsBox.innerHTML = '<div>Lade System_Log aus Google Sheets...</div>';
    try {
      const res = await callBackendApi({ action: 'getSystemLogs' });
      const logs = res.logs || [];
      if (logs.length === 0) {
        el.systemLogsBox.innerHTML = '<div>Keine Einträge im System_Log.</div>';
        return;
      }
      el.systemLogsBox.innerHTML = logs.map(l =>
        `<div><span class="text-emerald-400">[${escapeHtml(l.timestamp)}]</span> <strong>${escapeHtml(l.type)}:</strong> ${escapeHtml(l.summary)} <span class="text-slate-400">${escapeHtml(l.details)}</span></div>`
      ).join('');
    } catch (err) {
      el.systemLogsBox.innerHTML = `<div class="text-red-400">Fehler beim Laden: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function handleToggleCustomDomain() {
    const nextState = !state.customDomainActive;
    state.customDomainActive = nextState;
    localStorage.setItem('ww_custom_domain_active', String(nextState));
    updateDomainStatusUi();

    if (!state.isDemoMode) {
      try {
        await callBackendApi({
          action: 'setCustomDomainStatus',
          customDomainActive: nextState
        });
      } catch (err) {
        console.warn('Konnte Domain-Status im Backend nicht speichern:', err);
      }
    }

    showToast(
      nextState
        ? 'Eigene Domain (info@foerderverein-weserwichtel.de) als Antwort-Adresse aktiviert!'
        : 'Vereins-Gmail (foerdervereinweserwichtel@gmail.com) als Antwort-Adresse aktiviert!',
      'success'
    );
  }

  async function handleSaveAdminPassword() {
    if (!el.newAdminPasswordInput) return;
    const newPass = el.newAdminPasswordInput.value.trim();
    if (newPass.length < 8) {
      alert('Bitte wählen Sie ein Passwort mit mindestens 8 Zeichen.');
      return;
    }

    if (state.isDemoMode) {
      el.newAdminPasswordInput.value = '';
      showToast('[Demo] Im Live-Modus wird dieses Passwort verschlüsselt in Google ScriptProperties gespeichert.', 'info');
      return;
    }

    el.saveAdminPasswordBtn.disabled = true;
    el.saveAdminPasswordBtn.textContent = 'Speichere...';
    try {
      const res = await callBackendApi({
        action: 'changeAdminPassword',
        newPassword: newPass
      });
      if (res.result === 'success') {
        el.newAdminPasswordInput.value = '';
        showToast('Neues Vorstands-Passwort sicher im Google-Backend gespeichert!', 'success');
      } else {
        alert(res.error || 'Fehler beim Speichern des Passworts.');
      }
    } catch (err) {
      alert('Fehler beim Speichern des Passworts: ' + err.message);
    } finally {
      el.saveAdminPasswordBtn.disabled = false;
      el.saveAdminPasswordBtn.textContent = '💾 Passwort speichern';
    }
  }

  /**
   * Setup DOM Event Listeners
   */
  function setupEventListeners() {
    if (el.loginForm) el.loginForm.addEventListener('submit', handleLoginSubmit);
    if (el.requestEmailPinBtn) el.requestEmailPinBtn.addEventListener('click', handleRequestEmailPin);
    if (el.enterDemoModeBtn) el.enterDemoModeBtn.addEventListener('click', enterDemoMode);
    if (el.logoutBtn) el.logoutBtn.addEventListener('click', () => handleLogout());
    if (el.refreshDataBtn) el.refreshDataBtn.addEventListener('click', fetchMembers);
    if (el.scanInboxBtn) el.scanInboxBtn.addEventListener('click', handleScanInbox);

    if (el.hiddenPdfFileInput) {
      el.hiddenPdfFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0] && state.selectedMemberForPdfUpload) {
          uploadPdfFileForMember(state.selectedMemberForPdfUpload, e.target.files[0]);
        }
      });
    }

    if (el.memberSearchInput) {
      el.memberSearchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderTable();
      });
    }

    if (el.filterButtonGroup) {
      el.filterButtonGroup.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          el.filterButtonGroup.querySelectorAll('.filter-btn').forEach(b => {
            b.className = 'filter-btn px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors';
          });
          btn.className = 'filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1B4D3E] text-white transition-colors';
          state.filter = btn.getAttribute('data-filter') || 'ALL';
          renderTable();
        });
      });
    }

    // Email Modal
    if (el.closeEmailModalBtn) el.closeEmailModalBtn.addEventListener('click', closeEmailModal);
    if (el.sendViaVereinAccountBtn) el.sendViaVereinAccountBtn.addEventListener('click', handleSendViaVereinAccount);
    if (el.openMailAppBtn) {
      el.openMailAppBtn.addEventListener('click', () => {
        const to = el.emailModalRecipient.value;
        const subject = el.emailModalSubject.value;
        const body = el.emailModalBody.value;
        window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      });
    }
    if (el.copyEmailTextBtn) {
      el.copyEmailTextBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(el.emailModalBody.value);
        showToast('E-Mail-Text kopiert!', 'success');
      });
    }

    // SEPA Modal
    if (el.openSepaModalBtn) el.openSepaModalBtn.addEventListener('click', openSepaModal);
    if (el.closeSepaModalBtn) el.closeSepaModalBtn.addEventListener('click', closeSepaModal);
    if (el.cancelSepaModalBtn) el.cancelSepaModalBtn.addEventListener('click', closeSepaModal);
    if (el.sepaCollectionYear) {
      el.sepaCollectionYear.addEventListener('change', (e) => {
        state.sepaCollectionYear = e.target.value;
        document.querySelectorAll('.kpiYearText').forEach(n => { n.textContent = state.sepaCollectionYear; });
        autoSelectEligibleMembersForYear(state.sepaCollectionYear);
        renderSepaModalList();
      });
    }
    if (el.selectAllSepaBtn) {
      el.selectAllSepaBtn.addEventListener('click', () => {
        autoSelectEligibleMembersForYear(state.sepaCollectionYear);
        renderSepaModalList();
      });
    }
    if (el.deselectAllSepaBtn) {
      el.deselectAllSepaBtn.addEventListener('click', () => {
        state.sepaSelectedIds.clear();
        renderSepaModalList();
      });
    }
    if (el.downloadSepaXmlBtn) {
      el.downloadSepaXmlBtn.addEventListener('click', handleDownloadAndArchiveSepaXml);
    }

    // Manage Member Modal
    if (el.closeManageMemberModalBtn) el.closeManageMemberModalBtn.addEventListener('click', closeManageMemberModal);
    if (el.cancelManageMemberBtn) el.cancelManageMemberBtn.addEventListener('click', closeManageMemberModal);
    if (el.manageMemberForm) el.manageMemberForm.addEventListener('submit', handleSaveManageMember);

    // Folders & Maintainer Modal
    if (el.openFoldersModalBtn) el.openFoldersModalBtn.addEventListener('click', () => el.foldersModal.classList.remove('hidden'));
    if (el.openMaintainerModalBtn) el.openMaintainerModalBtn.addEventListener('click', () => el.foldersModal.classList.remove('hidden'));
    if (el.closeFoldersModalBtn) el.closeFoldersModalBtn.addEventListener('click', () => el.foldersModal.classList.add('hidden'));
    if (el.healFoldersBtn) el.healFoldersBtn.addEventListener('click', handleHealFolders);
    if (el.loadSystemLogsBtn) el.loadSystemLogsBtn.addEventListener('click', handleLoadSystemLogs);
    if (el.toggleCustomDomainBtn) el.toggleCustomDomainBtn.addEventListener('click', handleToggleCustomDomain);
    if (el.saveAdminPasswordBtn) el.saveAdminPasswordBtn.addEventListener('click', handleSaveAdminPassword);
  }

  /**
   * PWA Service Worker & Install Handling
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('admin-sw.js').catch(() => {});
    }
  }

  function setupPwaInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (el.triggerNativeInstallBtn) el.triggerNativeInstallBtn.classList.remove('hidden');
    });

    if (el.installAppBtn) {
      el.installAppBtn.addEventListener('click', () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt = null;
        } else if (el.installModal) {
          el.installModal.classList.remove('hidden');
        }
      });
    }
    if (el.closeInstallModalBtn) el.closeInstallModalBtn.addEventListener('click', () => el.installModal.classList.add('hidden'));
    if (el.dismissInstallModalBtn) el.dismissInstallModalBtn.addEventListener('click', () => el.installModal.classList.add('hidden'));
    if (el.triggerNativeInstallBtn) {
      el.triggerNativeInstallBtn.addEventListener('click', () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt = null;
          el.installModal.classList.add('hidden');
        }
      });
    }
  }

  /**
   * ISO 13616 MOD-97-10 IBAN Validator
   */
  function isValidIbanChecksum(iban) {
    const clean = cleanIban(iban);
    if (clean.length < 15 || clean.length > 34) return false;
    if (clean.startsWith('DE') && clean.length !== 22) return false;
    const rearranged = clean.slice(4) + clean.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, ch => (ch.charCodeAt(0) - 55).toString());
    let remainder = numeric;
    while (remainder.length > 2) {
      const block = remainder.slice(0, 9);
      remainder = (parseInt(block, 10) % 97).toString() + remainder.slice(block.length);
    }
    return (parseInt(remainder, 10) % 97) === 1;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        resolve(res.indexOf(',') !== -1 ? res.split(',')[1] : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function formatCurrency(val) {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  function maskIban(iban) {
    if (!iban) return '–';
    const clean = iban.replace(/\s+/g, '');
    if (clean.length < 8) return clean;
    return `${clean.slice(0, 4)} •••• •••• •••• ${clean.slice(-4)}`;
  }

  function cleanIban(iban) {
    return (iban || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  function cleanBic(bic) {
    return (bic || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString().replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;' }[c]));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function showToast(msg, type = 'success') {
    if (!el.toastNotification) return;
    if (el.toastMessage) el.toastMessage.textContent = msg;
    if (el.toastIcon) {
      el.toastIcon.textContent = type === 'success' ? '✓' : (type === 'warning' ? '⚠️' : 'ℹ️');
      el.toastIcon.className = type === 'success' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold';
    }
    el.toastNotification.classList.remove('translate-y-20', 'opacity-0');
    el.toastNotification.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
      el.toastNotification.classList.remove('translate-y-0', 'opacity-100');
      el.toastNotification.classList.add('translate-y-20', 'opacity-0');
    }, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
