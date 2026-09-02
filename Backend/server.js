// server.js
// Backend minimo: legge un file Excel e lo espone come API REST.
// Ogni riga del file diventa una voce JSON che l'app potrà leggere.

const express = require("express");
const cors = require("cors");
const xlsx = require("xlsx");
const path = require("path");

const app = express();

// Render assegna automaticamente una porta tramite una variabile d'ambiente
// (process.env.PORT). In locale sul tuo PC, quella variabile non esiste,
// quindi si usa comunque 3000 come prima.
const PORT = process.env.PORT || 3000;

// Percorso RELATIVO: il file personale.xlsx deve stare nella stessa cartella
// di server.js. Così funziona sia sul tuo PC che su qualsiasi server esterno,
// perché non dipende più dal nome utente o dal disco C: di Windows.
const PERCORSO_EXCEL = path.join(__dirname, "personale.xlsx");

app.use(cors()); // permette all'app mobile di chiamare questa API da un altro "indirizzo"

// Funzione che legge il file Excel e lo trasforma in un array di oggetti JSON
function leggiDatiPersonale() {
  const workbook = xlsx.readFile(PERCORSO_EXCEL);
  const nomeFoglio = workbook.SheetNames[0]; // prende il primo foglio ("Personale")
  const foglio = workbook.Sheets[nomeFoglio];
  const dati = xlsx.utils.sheet_to_json(foglio); // converte le righe in oggetti JSON
  return dati;
}

// Endpoint di test: verifica che il server sia acceso
app.get("/", (req, res) => {
  res.send("Backend attivo! Prova /personale per vedere i dati.");
});

// Endpoint principale: restituisce tutti i dipendenti in formato JSON
app.get("/personale", (req, res) => {
  try {
    const dati = leggiDatiPersonale();
    res.json(dati);
  } catch (errore) {
    console.error("Errore nella lettura del file Excel:", errore.message);
    res.status(500).json({ errore: "Impossibile leggere il file Excel" });
  }
});

// Endpoint per un singolo dipendente, cercato per ID
app.get("/personale/:id", (req, res) => {
  const dati = leggiDatiPersonale();
  const dipendente = dati.find((d) => d.ID === Number(req.params.id));
  if (!dipendente) {
    return res.status(404).json({ errore: "Dipendente non trovato" });
  }
  res.json(dipendente);
});

app.listen(PORT, () => {
  console.log(`Server avviato: http://localhost:${PORT}`);
});
