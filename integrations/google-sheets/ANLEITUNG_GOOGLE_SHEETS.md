# Maintainer-Handbuch (Für Gaston): Zero-Touch Vorstands-Portal & Google Backend

Dieses Handbuch beschreibt die Einrichtung und Fernwartung des gesamten Systems, sodass **Schatzmeister Thomas Land** das Portal komplett eigenständig im Browser nutzen kann und **du (Gaston) niemals an seinen Computer musst**.

---

## 🏗️ 1. Wie alles zusammenspielt (Zero-Touch Architektur)

1. **Eltern-Anmeldung (`index.html`):**
   - Eltern füllen den Antrag aus und unterschreiben digital.
   - Das im Browser erzeugte, unterschriebene PDF wird **sofort automatisch im Hintergrund** an `Code.gs` übertragen und als `JJJJ-MM-TT_Nachname_Vorname_Mitgliedsantrag.pdf` im fest verdrahteten Google-Drive-Ordner `02_MITGLIEDERVERWALTUNG/Eingegangene_Mitgliedsantraege_PDFs/` gespeichert!
   - Selbst wenn Eltern vergessen, zusätzlich auf „E-Mail senden“ zu klicken, liegt das unterschriebene SEPA-Mandat bereits fertig benannt im Google Drive.
2. **Schatzmeister-Portal (`admin.html`):**
   - Thomas öffnet den Link (`foerderverein-weserwichtel.de/admin.html` bzw. `vorstand.foerderverein-weserwichtel.de`).
   - Er meldet sich mit dem **Vorstands-Passwort** an (oder klickt auf *„6-stelligen Einmal-PIN an Vereins-E-Mail senden“*, falls er das Passwort vergessen hat).
   - Jede Zeile führt ihn durch **3 gesicherte Schritte**:
     * **Schritt 1 (Antrags-PDF im Drive):** Automatisch `🟢`, sobald der Antrag über die Website kam (oder 1-Klick Postfach-Scan / Drag-and-Drop für Papieranträge).
     * **Schritt 2 (Aufnahme & SEPA-Vorab-Mail):** Erst klickbar, wenn Schritt 1 `🟢` ist. Versendet die rechtliche SEPA-Pre-Notification über das offizielle Vereinskonto und legt automatisch einen Beleg in `Gesendete_SEPA_Vorabinformationen/` ab.
     * **Schritt 3 (GLS Bank SEPA-XML):** Erstellt die `pain.008.001.02` XML-Datei für das gewählte Beitragsjahr (z. B. `2026`), schützt automatisch vor Doppel-Einzügen, lädt die XML-Datei für den GLS-Upload herunter **und** archiviert XML + CSV-Einzugsliste automatisch in `03_FINANZEN_&_BUCHHALTUNG/<Jahr>/02_Einnahmen_und_Spenden/SEPA_Lastschriften/`.
3. **Automatische Fern-Updates bei jedem `git push`:**
   - Bei jedem `git push` auf `main` aktualisiert GitHub Actions automatisch die `version.json` mit dem neuesten Commit-Hash.
   - Sobald Thomas das Portal öffnet, erkennt sein Browser die neue Version, leert alte Caches automatisch und lädt deinen neuesten Code.

---

## 🛠️ 2. Einmaliges Update von `Code.gs` in Google Sheets (3 Minuten)

1. Melde dich bei Google Drive mit dem Vereinskonto an (`foerdervereinweserwichtel@gmail.com`).
2. Öffne die Google-Tabelle **`Mitgliederverwaltung Förderverein Weserwichtel`**.
3. Klicke oben im Menü auf **Erweiterungen** ➔ **Apps Script**.
4. Ersetze den gesamten Inhalt von `Code.gs` durch den Code aus [`Code.gs`](./Code.gs) und speichere (`Cmd + S`).
5. **WICHTIG (Damit die URL in `config.js` gleich bleibt!):**
   - Klicke oben rechts auf **Bereitstellen** ➔ **Bereitstellungen verwalten**.
   - Klicke rechts oben auf das **Stift-Symbol (✏️ Bearbeiten)**.
   - Wähle bei **Version** ➔ **„Neue Version“** aus.
   - Klicke auf **Bereitstellen** und bestätige die Berechtigungen für Google Drive & Gmail.

> **Start-Passwort für das Vorstands-Portal:**  
> Das voreingestellte Initial-Passwort in `Code.gs` lautet: `Weserwichtel2026!`  
> *(Oder jederzeit ohne Passwort über den Button „📧 6-stelligen Einmal-PIN an Vereins-E-Mail senden“ anmelden!)*

---

## 📧 3. Kostenlose E-Mail-Einrichtung bei Infomaniak (€0.00)

Da bei Infomaniak **1 kostenlose E-Mail-Adresse** in der Domain enthalten ist:
1. Lege im Infomaniak-Konto die kostenlose Adresse **`info@foerderverein-weserwichtel.de`** an.
2. Richte dort eine **automatische Weiterleitung** an **`foerdervereinweserwichtel@gmail.com`** ein.
3. Alle Mitgliedsanträge nutzen automatisch den Betreff-Präfix `[MITGLIEDSANTRAG]`, sodass der Postfach-Scanner im Portal sie sofort erkennt.

---

## 🔧 4. Fernwartung & Fehlerdiagnose (Ohne Thomas' Computer anzufassen)

Wenn Thomas eine Frage hat oder etwas geprüft werden soll:
1. Öffne `admin.html` auf **deinem eigenen Laptop** und klicke unten rechts im Footer auf **„🔧 Fernwartung & System-Log (Gaston)“**.
2. Klicke auf **„📜 System-Log laden“**: Du siehst sofort alle Aktionen und eventuelle Browser-Fehlermeldungen von Thomas' Computer (aus dem Tabellenblatt `System_Log`).
3. Klicke auf **„🛠️ Ordnerstruktur prüfen & reparieren“**, um jederzeit alle Google-Drive-Ordner automatisch zu synchronisieren.
