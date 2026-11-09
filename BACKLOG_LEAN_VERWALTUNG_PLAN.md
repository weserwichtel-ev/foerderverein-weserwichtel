# Master-Backlog & Architektur: Zero-Touch Vereinsverwaltung (Weserwichtel e.V.)

> **Status:** ✅ Vollständig implementiert (v2.0.0)  
> **Betriebsmodell:** 1 Schatzmeister (Thomas Land) arbeitet im Browser · 1 Maintainer (Gaston) wartet 100% remote über GitHub & `System_Log` (kein Eingriff am Computer des Schatzmeisters nötig!).  
> **Fokus:** 100% Menschliche Kontrolle · Idiotensichere 3-Schritt-Leitplanken · Feste Google-Drive-Ordnerstruktur (automatisch erzwungen) · 4-Säulen-Sicherheit · €0.00 laufende Kosten.

---

## 🚀 Die 5 „Zero-Touch“-Optimierungen (Warum dieses System noch einfacher & wartungsfrei ist)

1. **Sofortige Auto-Ablage des unterschriebenen PDFs schon beim Eltern-Absenden (`index.html` ➔ Google Drive):**
   - Sobald Eltern auf `index.html` digital unterschreiben und absenden, überträgt der Write-Only-Webhook nicht nur die Textdaten, sondern auch das erzeugte PDF (`pdfBase64`) direkt an `Code.gs`.
   - `Code.gs` benennt die Datei automatisch als `JJJJ-MM-TT_Nachname_Vorname_Mitgliedsantrag.pdf` und legt sie sofort in `02_MITGLIEDERVERWALTUNG/Eingegangene_Mitgliedsantraege_PDFs/` ab!
   - **Vorteil für den Schatzmeister:** Selbst wenn Eltern vergessen, zusätzlich die E-Mail abzusenden, ist **Schritt 1 (`🟢 1. PDF im Drive`) in 99 % der Fälle bereits erledigt**, wenn Thomas das Portal öffnet!
   - **Mandatsreferenz-Synchronisation:** Die auf dem Eltern-PDF aufgedruckte `Mandatsreferenz` (`WW-2026-XXXX`) wird exakt in Spalte S der Google-Tabelle gespeichert und im SEPA-XML verwendet.
2. **Kein Cache-Problem bei Bugfixes (Network-First PWA + GitHub Commit-Stamping):**
   - Die GitHub Action (`.github/workflows/deploy.yml`) schreibt bei jedem `git push` automatisch den aktuellen Commit-Hash in `version.json`.
   - Sobald Thomas das Portal öffnet oder den Tab fokussiert, prüft `admin.js` die `version.json`, leert bei einem Update automatisch den lokalen Cache und lädt deine neueste Version. Du musst ihm nie sagen: *„Leere mal deinen Browser-Cache“*.
3. **Passwort-Selbsthilfe per 6-stelligem E-Mail-PIN:**
   - Falls Thomas sein Vorstands-Passwort vergisst, klickt er im Login-Screen einfach auf **„📧 6-stelligen Einmal-PIN an Vereins-E-Mail senden“**. Er holt sich den Code selbst aus dem Vereins-Gmail und meldet sich an – ohne dich anrufen zu müssen.
4. **Automatische IBAN-Prüfsummen-Kontrolle (ISO 13616 MOD-97):**
   - Vor jedem SEPA-XML-Lauf und bei jeder Kontodaten-Änderung prüft `admin.js` mathematisch die IBAN-Prüfsumme (MOD-97). Tippfehler werden sofort erkannt, bevor die Deutsche Skatbank eine Datei ablehnt.
5. **Remote-Diagnose & Fehler-Telemetrie (`System_Log`):**
   - Sollte auf Thomas' Computer jemals ein Fehler auftreten, sendet sein Browser die Fehlermeldung automatisch an `Code.gs` in das Tabellenblatt `System_Log`.
   - Du kannst von deinem eigenen Laptop aus in `admin.html` unten auf **„🔧 Fernwartung & System-Log (Gaston)“** klicken, das Log einsehen und den Fix per `git push` ausrollen.

---

## 📁 Fest verdrahtete Ordner- & Dateinamen-Automatik im Google Drive

| Dokumententyp | Automatischer Zielordner im Google Drive | Erzwungenes Dateinamen-Format |
| :--- | :--- | :--- |
| **Unterschriebener Antrag (PDF)** | `02_MITGLIEDERVERWALTUNG/Eingegangene_Mitgliedsantraege_PDFs/` | `JJJJ-MM-TT_Nachname_Vorname_Mitgliedsantrag.pdf` |
| **SEPA-Vorabinformation (Beleg)** | `02_MITGLIEDERVERWALTUNG/Gesendete_SEPA_Vorabinformationen/` | `JJJJ-MM-TT_Nachname_Vorname_PreNotification_WW-JJJJ-XXXX.txt` |
| **Kündigung / Änderung** | `02_MITGLIEDERVERWALTUNG/Kuendigungen_und_Aenderungen/` | `JJJJ-MM-TT_Nachname_Vorname_Kuendigung.pdf` |
| **Skatbank SEPA-XML Sammellastschrift** | `03_FINANZEN_&_BUCHHALTUNG/<JJJJ>/02_Einnahmen_und_Spenden/SEPA_Lastschriften/` | `JJJJ-MM-TT_SEPA_Lastschrift_Skatbank_<Anzahl>Mitglieder_<Summe>EUR.xml` |
| **SEPA-Einzugs-Protokoll (CSV)** | `03_FINANZEN_&_BUCHHALTUNG/<JJJJ>/02_Einnahmen_und_Spenden/SEPA_Lastschriften/` | `JJJJ-MM-TT_Einzugsliste_<Anzahl>Mitglieder_<Summe>EUR.csv` |

---

## ✅ Implementierungs-Status (Alle Epics umgesetzt)

### Epic 1: Sicherheit, Login-Gate & GitHub Auto-Deploy
- [x] **Task 1.1:** Login-Screen mit Vorstands-Passwort + 1-Klick 6-stelliger E-Mail-PIN-Selbsthilfe in [`admin.html`](file:///Volumes/Macbook%20Pro_Work/01_PROJECTS/WESERWICHTEL%20e.V/foerderverein-weserwichtel/admin.html) (kein verwirrender Demo-Modus beim Start; öffentlicher Footer-Link aus [`index.html`](file:///Volumes/Macbook%20Pro_Work/01_PROJECTS/WESERWICHTEL%20e.V/foerderverein-weserwichtel/index.html) entfernt).
- [x] **Task 1.2:** Server-Side Auth (`ScriptProperties`), Sitzungs-Token (30 Tage) & 5-Versuche Brute-Force-Sperre (`CacheService`) in [`Code.gs`](file:///Volumes/Macbook%20Pro_Work/01_PROJECTS/WESERWICHTEL%20e.V/foerderverein-weserwichtel/integrations/google-sheets/Code.gs).
- [x] **Task 1.3:** GitHub Pages CI/CD Workflow (`.github/workflows/deploy.yml`) mit automatischem `version.json` Commit-Stamping + Network-First [`admin-sw.js`](file:///Volumes/Macbook%20Pro_Work/01_PROJECTS/WESERWICHTEL%20e.V/foerderverein-weserwichtel/admin-sw.js).

### Epic 2: Selbstheilende Google Drive Ordnerstruktur & 0-Klick PDF-Ablage
- [x] **Task 2.1:** Auto-Healing Folder Manager (`ensureVereinFolderStructure`) in `Code.gs` + Direktlinks-Modal in `admin.html`.
- [x] **Task 2.2:** Automatische PDF-Direktablage beim Absenden auf `index.html` (`app.js` ➔ `Code.gs`) + 1-Klick Postfach-Scanner (`📥 E-Mail-Postfach nach PDFs scannen`) + Drag-and-Drop PDF-Upload pro Zeile.

### Epic 3: Idiotensichere 3-Schritt-Leitplanken & Zentraler E-Mail-Versand
- [x] **Task 3.1:** Visuelle 3-Schritt-Leitplanke (`1. PDF im Drive` ➔ `2. Vorab-Mail` ➔ `3. SEPA-Einzug`) in `admin.html` & `admin.js`.
- [x] **Task 3.2:** Kontrollierter Versand über das offizielle Vereinskonto (`Reply-To: info@foerderverein-weserwichtel.de`) + automatische Beleg-Archivierung in `Gesendete_SEPA_Vorabinformationen/`.

### Epic 4: Doppel-Einzugs-Schutz & Duales SEPA-XML Archiv (`pain.008.001.08`)
- [x] **Task 4.1:** Spalte `Eingezogene Beitragsjahre` + automatische Abwahl bereits eingezogener Mitglieder im SEPA-Modal + MOD-97 IBAN-Prüfsummen-Kontrolle.
- [x] **Task 4.2:** Gleichzeitiger lokaler XML-Download für Deutsche Skatbank Online-Banking + automatische Google-Drive-Archivierung (XML + CSV-Einzugsliste) in `03_FINANZEN_&_BUCHHALTUNG/<Jahr>/02_Einnahmen_und_Spenden/SEPA_Lastschriften/`.

### Epic 5: Geführter Dialog für Kündigungen (Einschulung), Bankwechsel & Fernwartung
- [x] **Task 5.1:** „Mitglied bearbeiten / Kündigung“-Modal inkl. automatischer Ablage des Kündigungs-PDFs in `Kuendigungen_und_Aenderungen/` und sofortiger SEPA-Sperre.
- [x] **Task 5.2:** Remote-Diagnose (`System_Log`) für Gaston zur 100% kontaktlosen Fernwartung.
- [x] **Task 5.3:** Rechtssichere & geführte Kündigungsbestätigung per E-Mail („✉️ Bestätigung jetzt senden“) inkl. automatischer Drive-Beleg-Archivierung in `Kuendigungen_und_Aenderungen/`, BCC an Vereins-Postfach (`foerdervereinweserwichtel@gmail.com`) und Behebung der Dropdown-Listenvalidierung in Spalte Q (`Geprüft & Archiviert`).

### Epic 6: Handschriftliche Papieranträge, Druckvorlage & Sicherer Drive-Scanner
- [x] **Task 6.1:** Offizielle DIN-A4 Druckvorlage für handschriftliche Mitgliedsanträge (`PDFGenerator.generateBlankPrintablePDF` & [`mitgliedsantrag-druckvorlage.html`](file:///Volumes/Macbook%20Pro_Work/01_PROJECTS/WESERWICHTEL%20e.V/foerderverein-weserwichtel/mitgliedsantrag-druckvorlage.html)) mit 22-Kästchen IBAN-Gitter, Kita-Gruppen-Auswahl, SEPA-Mandat, DSGVO-Einwilligung und Online-Direktlink. Direkt druckbar aus `admin.html` per 1-Klick („🖨️ Vorlage drucken“).
- [x] **Task 6.2:** Manuelle Papierantrag-Erfassung & Beleg-Archivierung (`#paperScanModal` in `admin.html` & `admin.js`) mit PDF/Scan/Foto-Upload, Live-Beleg-Vorschau (Drehen & Zoomen), händischer Dateneingabe und strikter ISO 7064 MOD-97 IBAN-Prüfsummen-Validierung (vollständig ohne fehleranfälliges OCR).
- [x] **Task 6.3:** 100% automatische Google Drive Archivierung alter & neuer Papieranträge (`createPaperMember` in `Code.gs`) in `02_MITGLIEDERVERWALTUNG/Eingegangene_Mitgliedsantraege_PDFs/` als `JJJJ-MM-TT_Nachname_Vorname_Mitgliedsantrag.pdf` + Doppel-Einzugs-Schutz für historische Jahre (`paidYears`).
