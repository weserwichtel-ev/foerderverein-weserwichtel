# 🌐 Domain-Bereitschaft & 3-Minuten-Aktivierung (`foerderverein-weserwichtel.de`)

**Stand:** Vorbereitet für den sofortigen Einsatz **ohne** gekaufte Domain – und in 3 Minuten umschaltbar, sobald `foerderverein-weserwichtel.de` registriert ist.

---

## 🟢 1. Wie das System HEUTE (ohne gekaufte Domain) arbeitet

Solange `foerderverein-weserwichtel.de` noch nicht gekauft ist, läuft alles **100 % funktionsfähig und ohne Kosten** über die bestehende Infrastruktur:

- **Öffentliches Antragsformular:** `https://weserwichtel-ev.github.io/foerderverein-weserwichtel/`
- **Vorstands- & Schatzmeister-App (PWA):** `https://weserwichtel-ev.github.io/foerderverein-weserwichtel/admin.html`
- **Aktive E-Mail-Adresse überall (Website, PDF, Impressum, Datenschutz, SEPA-Vorab-Mail):**
  `foerdervereinweserwichtel@gmail.com`
  *(Dadurch geht heute keine einzige E-Mail an eine noch nicht existierende Domain verloren!)*
- **Warum heißt die Datei `CNAME.domain-vorlage` statt `CNAME`?**
  Würde heute schon eine aktive `CNAME`-Datei im GitHub-Repository liegen, würde GitHub Pages alle Besucher sofort auf `foerderverein-weserwichtel.de` umleiten (was vor dem Domain-Kauf zu einem Browser-Fehler führen würde).

---

## 🚀 2. Sobald die Domain `foerderverein-weserwichtel.de` gekauft ist (3 Schritte in 3 Minuten)

### Schritt A: Die 1 kostenlose E-Mail-Adresse bei Infomaniak einrichten (0,00 €)
1. Im Infomaniak-Kundencenter die **1 enthaltene Gratis-E-Mail-Adresse** anlegen:
   `info@foerderverein-weserwichtel.de`
2. Unter **Weiterleitung (Redirection)** eintragen:
   ➔ `foerdervereinweserwichtel@gmail.com`
   *(Alle Anträge und Eltern-Antworten landen damit automatisch im Vereins-Gmail, das vom Schatzmeister-Portal gescannt wird).*

### Schritt B: DNS-Einträge bei Infomaniak auf GitHub Pages zeigen lassen
In der DNS-Zone von `foerderverein-weserwichtel.de` folgende Einträge hinterlegen:

| Typ | Host / Name | Ziel / Wert |
| :--- | :--- | :--- |
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |
| `CNAME` | `www` | `weserwichtel-ev.github.io` |

### Schritt C: 1-Zeilen-Schalter umlegen (Automatische Umstellung überall)
1. Datei `CNAME.domain-vorlage` umbenennen in **`CNAME`**.
2. In [`assets/js/config.js`](assets/js/config.js) den Schalter von `false` auf `true` setzen:
   ```javascript
   const CUSTOM_DOMAIN_ACTIVE = true;
   ```
   *(Hinweis: Sobald die Seite über `foerderverein-weserwichtel.de` aufgerufen wird, erkennt `config.js` die Domain sogar vollautomatisch!)*
3. Optional im **Vorstands-Portal (`admin.html`)** unten rechts auf **„🔧 Fernwartung & System-Log (Gaston)“** klicken und auf **„Auf `info@foerderverein-weserwichtel.de` umschalten“** klicken – damit setzt auch das Google-Script-Backend sofort `Reply-To: info@foerderverein-weserwichtel.de`.
4. In GitHub unter **Settings ➔ Pages** das Häkchen bei **„Enforce HTTPS“** setzen. Fertig!
