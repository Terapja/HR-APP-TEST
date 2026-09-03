# Prima App — Note di sviluppo

Raccolta di contesto utile per riprendere lo sviluppo del progetto (Backend + app1) in futuro.

## 1. Setup build APK con EAS per `app1`

### Problema: test con Expo Go fuori dalla rete Wi-Fi di casa
Errore riscontrato scansionando il QR code di Expo Go da fuori casa (Wi-Fi spento / dati mobili).

**Causa:** non è un problema di Render o del backend, è il funzionamento normale di Expo Go. In modalità anteprima, il telefono deve scaricare il codice in tempo reale dal PC via rete locale, quindi telefono e PC devono stare sulla stessa Wi-Fi.

**Due modi per testare "funziona ovunque":**
- **Modo rapido** — usare Expo Go sulla stessa Wi-Fi di casa: il "trasporto" dell'anteprima resta locale, ma l'app chiama comunque `hr-app-test.onrender.com` per i dati, quindi è comunque un test valido del backend online.
- **Modo definitivo** — generare un APK e installarlo sul telefono: una volta installato, l'app è autonoma, non serve più il PC, funziona da qualunque rete chiamando direttamente Render.

**Strategia consigliata:** prima un giro veloce con Expo Go su Wi-Fi di casa per controllare che non ci siano errori nel codice, poi build APK per il test definitivo fuori rete.

### Errore nella build EAS: `eas build` senza Git
Usando `eas build` in modalità "scorciatoia" senza Git (`EAS_NO_VCS=1`), lo strumento a volte non riesce a capire i confini del progetto e tenta di includere troppo (fino all'intera cartella utente).

**Soluzione — inizializzare Git dentro `app1`:**
```
cd C:\Users\riccardo.bondi\APP\app1
echo node_modules/> .gitignore
git init
git add .
git commit -m "Primo salvataggio app"
eas build -p android --profile preview
```
Con Git presente, non serve più `EAS_NO_VCS=1`.

### Stato della build
Dopo il fix, il progetto viene compresso e caricato correttamente. La build entra in coda sul piano gratuito EAS (tempi di attesa condivisi tra tutti gli utenti, es. ~47 minuti).

- La build resta in coda ed esegue sui server Expo: si può spegnere il PC o chiudere il terminale, non serve tenerlo acceso.
- **Controllo stato:**
  - via browser: [expo.dev](https://expo.dev) → login → progetto `app1` → sezione "Builds"
  - via terminale: `eas build:list` nella cartella del progetto
- A build completata ("Finished") è disponibile il link per scaricare l'APK con l'indirizzo di Render integrato, funzionante da qualunque rete.

## 2. Pulizia del repository Git (sessione del 3 settembre 2026)

Riorganizzazione strutturale del repository `HR-APP-TEST` (cartella `APP`), completata e pushata su GitHub.

- **Problema critico risolto:** il repo Git era radicato per errore nell'intera cartella utente (`C:\Users\riccardo.bondi`) invece che in `APP`, con rischio di commit accidentali di file personali. Risolto estraendo la storia di `APP/` (`git subtree split`) e ricreando il repo correttamente dentro `APP`; rimosso `.git` dalla home.
- **`node_modules` di `Backend/`** era stato committato per errore (871 file): rimosso dal tracking, aggiunto `.gitignore` (`node_modules/`, `*.log`, `.env`, `app1/`).
- **`DATI/personale.xlsx`** era un duplicato byte-identico e inutilizzato (il server legge sempre `Backend/personale.xlsx`): eliminato insieme alla cartella `DATI`.
- **`app1/`** ha un proprio repository Git indipendente (vedi sezione 1): lasciato intatto e ignorato dal repo principale.
- Storia pulita pushata con `git push --force origin main`.
- Verificato con un clone pulito da GitHub: solo `Backend/` + `.gitignore`, nessuna `node_modules`, `npm install` reinstalla correttamente le 79 dipendenze dal `package-lock.json`.

Nota a parte, non ancora affrontata: `npm audit` sul `Backend` segnala 4 vulnerabilità nelle dipendenze (3 moderate, 1 alta).
