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

## 3. Nuovo progetto: interrogazione in linguaggio naturale su dati HR (avviato il 3 settembre 2026)

### Obiettivo
App che permette di interrogare in linguaggio naturale un'estrazione HR e ottenere aggregazioni grafiche (grafici) dai risultati.

### Vincoli del progetto (confermati con l'utente)
- **Budget: zero assoluto** — nessun servizio a pagamento, nemmeno costi minimi a consumo.
- **Uso:** solo personale, occasionale (non serve gestire carichi multi-utente).
- **Hosting:** solo locale sul PC, nessun hosting cloud necessario.
- **Dati sensibili:** il file sorgente contiene PII reali di dipendenti (nomi, email, data di nascita, genere, nazionalità) di EssilorLuxottica. **È un progetto di lavoro autorizzato** (confermato dall'utente). Per questo motivo l'elaborazione LLM deve restare **100% locale** (es. Ollama) — nessun dato deve uscire dal PC verso API esterne (no Gemini/Claude/altri servizi cloud), nemmeno in forma aggregata, per evitare problemi di riservatezza/GDPR.

### Sorgente dati
- File: `C:\Users\riccardo.bondi\APP\Employee List.csv` (**~1,86 GB**, non versionato su Git — va tenuto escluso dal repository, vedi nota sotto).
- **2.004.301 righe dati**, **65 colonne**, CSV UTF-8 con terminatori CRLF, ben formato (nessuna riga con numero di campi errato).
- Copre **271.695 dipendenti unici**, uno snapshot mensile ciascuno (colonna `Year Month`, range **gennaio–settembre 2026**).
- Gruppo EssilorLuxottica a livello worldwide: ~90 paesi, centinaia di ragioni sociali/brand (Luxottica, Essilor, Oakley, Ray-Ban, GrandVision, Sunglass Hut, Vision Express, ecc.).
- Colonne principali: anagrafica (nome, email, data nascita, età, genere, nazionalità), posizione organizzativa (ruolo, manager, gerarchia, cost center, funzione/segmento), contratto (tipo, FTE, date di ingresso), formazione (ore/lezioni completate).

### Pulizia dati necessaria prima dell'import
1. Valori mancanti incoerenti: mix di `""` e la stringa letterale `"N/A"` — normalizzare entrambi a `NULL`.
2. Date in formato europeo `GG/MM/AAAA` (Birth Date, Group/Current Entry Date) — convertire in formato ISO.
3. Numeri con separatore delle migliaia (es. `"HC managed (Main pos)"` = `"200,575"`) — rimuovere la virgola prima di convertire a numero.
4. `Gender`: ~20% dei valori vuoti (404K righe), più una categoria `OTHER` (136K righe) — da capire se è un dato genuino o un artefatto dell'estrazione prima di costruire aggregazioni su questo campo.
5. Colonne di formazione (ore/lezioni F2F e digitali) spesso vuote per i profili executive — probabilmente dati non tracciati per certi livelli, non un errore.

### Architettura decisa
- **Database:** SQLite locale (file unico, zero costi, gestisce bene 2M+ righe con gli indici giusti).
- **Import:** script Node.js che legge il CSV in streaming (troppo grande per stare in memoria), applica le pulizie sopra, carica in SQLite con schema tipizzato e indici (per persona, mese, country/company, manager). **Non ancora scritto — prossimo passo.**
- **Backend:** Node.js/Express (continuità con lo stack di `Backend/`), libreria `better-sqlite3`.
- **Linguaggio naturale → query:** domanda + schema tabella inviati a un **LLM locale** (es. Ollama) che genera una query SQL di sola lettura, eseguita in modo controllato (solo `SELECT`, validata, con limiti) sul database.
- **Grafici:** risultato della query passato a una libreria di charting frontend (es. Chart.js) per l'aggregazione visiva.
- **Accesso da cellulare:** possibile mantenendo l'app locale — il telefono (sulla stessa Wi-Fi) chiama l'API Express in ascolto sull'IP locale del PC (es. `http://192.168.1.x:3000`), stesso schema usato da Expo Go per `app1`. Serve far ascoltare il server su `0.0.0.0` (non solo `localhost`) e consentire la porta nel firewall di Windows per le connessioni dalla LAN.

### Prossimo passo
Scrivere lo script Node.js di import/pulizia CSV → SQLite (non ancora avviato).

### Promemoria di sicurezza
`Employee List.csv` (e il futuro file SQLite generato da esso) **non devono mai essere committati su Git/GitHub** — contengono PII reali di dipendenti. Aggiunte a `.gitignore` di `APP`: `*.csv`, `*.db`, `*.sqlite`.
