# Anleitung: Google Sheets Mitglieder-Datenbank anbinden

Diese Anleitung beschreibt Schritt für Schritt, wie die Web-Anwendung des Fördervereins direkt und **ohne laufende Kosten** mit einer privaten Google-Tabelle zur Mitgliederverwaltung verknüpft wird.

---

## 🔒 Datenschutz & Sicherheit im Überblick

* **Keine Speicherung von Unterschriften:** Aus Gründen der DSGVO-Datensparsamkeit (Art. 5 Abs. 1 lit. c DSGVO) wird die gezeichnete Unterschrift **nicht** an Google Sheets übertragen oder in einer Cloud-Datenbank gespeichert. Die Unterschrift existiert ausschließlich auf dem vom Mitglied heruntergeladenen PDF-Dokument.
* **Nur Vereins-Zugriff:** Die Tabelle liegt im geschützten Google Drive des Vereins (`FoerdervereinKitaWeserwichtel@gmail.com`). Nur der berechtigte Vorstand hat Lese- und Schreibzugriff.
* **100 % Kostenlos & Serverlos:** Es wird kein Drittanbieter-Dienst (wie Make.com, Zapier oder Supabase) benötigt. Google Apps Script führt den Webhook direkt in der Google Cloud aus.

---

## 🛠️ Einrichtung in 5 Schritten (Dauer: ca. 3–5 Minuten)

### Schritt 1: Google Sheet erstellen
1. Melden Sie sich bei [Google Drive](https://drive.google.com/) mit dem Vereinskonto an:  
   👉 `FoerdervereinKitaWeserwichtel@gmail.com`
2. Erstellen Sie eine neue Tabelle:  
   **Neu** → **Google Tabellen** (Leere Tabelle).
3. Benennen Sie die Tabelle oben links:  
   `Mitgliederverwaltung Förderverein Weserwichtel`

> **Tipp:** Sie müssen die Spalten nicht manuell anlegen! Das Skript initialisiert die Kopfzeile automatisch beim ersten Antrag.

---

### Schritt 2: Apps Script öffnen
1. Klicken Sie im Menü der Google-Tabelle oben auf:  
   **Erweiterungen** → **Apps Script**.
2. Es öffnet sich der Skript-Editor. Löschen Sie eventuell vorhandenen Beispielcode im Fenster `Code.gs`.

---

### Schritt 3: Skriptcode einfügen & speichern
1. Öffnen Sie die Datei [`Code.gs`](./Code.gs) in diesem Ordner.
2. Kopieren Sie den gesamten Inhalt und fügen Sie ihn in den Google Apps Script Editor ein.
3. Klicken Sie auf das **Speichern-Symbol** (Diskette) oder drücken Sie `Strg + S` / `Cmd + S`.

---

### Schritt 4: Als Web-App bereitstellen
1. Klicken Sie oben rechts auf die blaue Schaltfläche **Bereitstellen** → **Neue Bereitstellung**.
2. Klicken Sie links neben „Typ auswählen“ auf das **Zahnrad-Symbol** ⚙️ und wählen Sie **Web-App**.
3. Füllen Sie die Felder wie folgt aus:
   * **Beschreibung:** `Mitglieder-Webhook v1`
   * **Ausführen als:** `Ich (FoerdervereinKitaWeserwichtel@gmail.com)` *(Sehr wichtig!)*
   * **Wer hat Zugriff:** `Jeder` (Anyone) *(Notwendig, damit das Webformular Anträge ohne Login einsenden kann)*
4. Klicken Sie auf **Bereitstellen**.
5. *Einmalige Berechtigung:* Falls Google ein Fenster „Zugriff erforderlich“ anzeigt:
   - Klicken Sie auf **Zugriff prüfen**.
   - Wählen Sie das Vereinskonto aus.
   - Falls ein Warnhinweis „Google hat diese App nicht überprüft“ erscheint: Klicken Sie unten auf **Erweitert** → **Zu Unbenanntes Projekt (unsicher) wechseln** → **Zulassen**.
6. Kopieren Sie die angezeigte **Web-App-URL**. Sie sieht ungefähr so aus:  
   `https://script.google.com/macros/s/AKfycbx.../exec`

---

### Schritt 5: URL in die Website eintragen
Öffnen Sie im Projektordner die Datei:  
[`assets/js/config.js`](../../assets/js/config.js)

Fügen Sie Ihre kopierte URL bei `DATABASE_WEBHOOK_URL` ein:

```javascript
const APP_CONFIG = {
  // ...
  DATABASE_WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbx.../exec",
  // ...
};
```

---

## 🧪 Testen

1. Öffnen Sie `index.html` im Browser.
2. Füllen Sie einen Test-Antrag aus und klicken Sie auf **„Mitgliedsantrag absenden“**.
3. Öffnen Sie Ihre Google-Tabelle:
   * Eine neue Zeile mit allen Mitglieds- und Bankdaten wird sofort in der Tabelle angezeigt!
   * Der Status steht auf: `Neu eingegangen` / `Wartet auf E-Mail`.
   * Sobald das Mitglied die erzeugte PDF per E-Mail an den Verein sendet, kann der Vorstand den Status auf `PDF erhalten & geprüft` setzen.
