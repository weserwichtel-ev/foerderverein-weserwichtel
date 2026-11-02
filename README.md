# Förderverein der Kita Weserwichtel e.V. - Website & Mitgliedsantrag

Moderne, responsive und datenschutzkonforme statische Webanwendung für den **Förderverein der Kita Weserwichtel e.V.** in Bremen. 

Ermöglicht Eltern und Förderern das Ausfüllen des Mitgliedsantrags inklusive SEPA-Basislastschriftmandat und rechtsverbindlicher digitaler Unterschrift direkt im Webbrowser. Die PDF-Erzeugung erfolgt zu 100 % clientseitig ohne Abhängigkeit von externen Servern.

---

## 🌟 Features

- **Responsive Design**: Optimiert für Smartphones, Tablets und Desktop mit Tailwind CSS.
- **Digitale Unterschrift**: HTML5 Canvas mit Touch- und Retina-Unterstützung via `signature_pad`.
- **Client-Side PDF-Generierung**: Erzeugt ein druckfertiges DIN-A4-Dokument mit eingebetteter Unterschrift via `jsPDF`.
- **Automatische E-Mail-Vorbereitung**: Öffnet das Standard-E-Mail-Programm mit vorausgefüllter Empfängerin (`tanja.ganser@ib.de`), Betreff und Anschreiben.
- **Optionale Webhook-Anbindung**: Nicht-blockierende Übertragung an Make, Zapier, Supabase oder Google Sheets via `config.js`.
- **Rechtssicherheit (DSGVO & DDG/TMG)**: Inklusive vorausgefülltem `impressum.html` und `datenschutz.html` mit offizieller SEPA-Gläubiger-ID (`DE83ZZZ00002910027`).

---

## 📁 Projektstruktur

```
foerderverein-weserwichtel/
├── .gitignore               # Ignoriert OS-Artefakte, IDE-Einstellungen & Secrets
├── README.md                # Dokumentation & Einrichtungsanleitung
├── index.html               # Hauptseite mit Mitgliedsantrag, SEPA-Mandat & Unterschrift
├── impressum.html           # Impressum nach § 5 DDG (Amtsgericht Charlottenburg VR 42469 B)
├── datenschutz.html         # Datenschutzerklärung nach DSGVO (inkl. Google Sheets Info)
├── integrations/
│   └── google-sheets/
│       ├── Code.gs          # Serverloser Webhook für Google Apps Script
│       └── ANLEITUNG_GOOGLE_SHEETS.md # Schritt-für-Schritt Einrichtungsanleitung
└── assets/
    ├── css/
    │   └── style.css        # Styles für Signaturfeld, Animationen & Druckansicht
    ├── js/
    │   ├── config.js        # Globale Konfiguration (E-Mail, Bankdaten, Webhook-URL)
    │   ├── signature.js     # SignaturePad-Controller (Retina-Resize & Reset)
    │   ├── pdf-generator.js # DIN A4 PDF-Erstellung mit jsPDF
    │   └── app.js           # Validierung, Webhook-Fetch, PDF-Trigger & mailto
    └── img/
        ├── logo.svg         # Vektor-Vereinslogo (Wichtel & Weser-Welle)
        └── logo.png         # Fallback-Grafik / Raster-Logo
```

---

## 💻 1. Lokal im Browser testen

Da es sich um ein statisches Webprojekt handelt, benötigen Sie keine Datenbank oder Node-Build-Tools.

### Option A: Mit Python (empfohlen)
Öffnen Sie ein Terminal im Projektordner:
```bash
cd foerderverein-weserwichtel
python3 -m http.server 8000
```
Öffnen Sie anschließend im Browser: **[http://localhost:8000](http://localhost:8000)**

### Option B: Mit VS Code Live Server
1. Öffnen Sie den Ordner `foerderverein-weserwichtel` in Visual Studio Code.
2. Installieren Sie die Erweiterung **Live Server** (Ritwick Dey).
3. Klicken Sie unten rechts in der Statusleiste auf **"Go Live"** oder rechtsklicken Sie auf `index.html` → **"Open with Live Server"**.

### Option C: Mit Node / npx
```bash
npx serve foerderverein-weserwichtel
```

---

## 🚀 2. In 3 Schritten auf GitHub & GitHub Pages veröffentlichen

### Schritt 1: Git-Repository initialisieren und committen
```bash
cd foerderverein-weserwichtel
git init
git add .
git commit -m "feat: initial release foerderverein weserwichtel website"
```

### Schritt 2: GitHub Repository verknüpfen und pushen
Erstellen Sie auf [GitHub](https://github.com/new) ein neues Repository (z. B. `foerderverein-weserwichtel`) und führen Sie aus:
```bash
git branch -M main
git remote add origin https://github.com/<DEIN-NUTZERNAME>/foerderverein-weserwichtel.git
git push -u origin main
```

### Schritt 3: GitHub Pages aktivieren
1. Öffnen Sie Ihr GitHub-Repository im Browser.
2. Navigieren Sie zu **Settings** → **Pages** (im linken Seitenmenü).
3. Unter **"Build and deployment"** / **"Source"** wählen Sie:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/ (root)`
4. Klicken Sie auf **Save**.
5. Nach 1–2 Minuten ist Ihre Website weltweit live unter:
   `https://<DEIN-NUTZERNAME>.github.io/foerderverein-weserwichtel/`

---

## ⚙️ Konfiguration anpassen (`assets/js/config.js`)

In der Datei `assets/js/config.js` können alle vereinsrelevanten Parameter zentral angepasst werden:

```javascript
const APP_CONFIG = {
  // Vereinsangaben
  ASSOCIATION_NAME: "Förderverein der Kita Weserwichtel e.V.",
  CREDITOR_ID: "DE83ZZZ00002910027",
  RECIPIENT_EMAIL: "tanja.ganser@ib.de",

  // Optionaler Webhook für automatische Tabellen-/Datenbank-Synchronisation
  // Beispiel: Make / Zapier / Google Apps Script URL eintragen
  DATABASE_WEBHOOK_URL: "",

  // Mindestjahresbeitrag
  MIN_ANNUAL_FEE: 12,
  DEFAULT_ANNUAL_FEE: 24
};
```

---

## 📄 Lizenz & Rechtliches
Erstellt für den **Förderverein der Kita Weserwichtel e.V.** in Bremen.
Alle Rechte vorbehalten.
