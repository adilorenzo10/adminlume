# Adminlume

Autore: **Dilorsoft**. Plugin riutilizzabile per interfaccia amministrativa e dock frontend, già noto come Rounded Admin.

Skin amministrativa riutilizzabile per WordPress 6.5+ / PHP 8.1+. Nessuna dipendenza da WooCommerce, tema o plugin del sito. Non replica funzionalità o marchi Shopify: ne riprende la direzione visiva sobria, con sidebar scura, pannelli arrotondati e controlli compatti.

## Utilizzo

1. Copiare `adminlume` in `wp-content/plugins` e attivare `adminlume.php`.
2. Aprire **Utenti → Adminlume** (oppure **Profilo → Adminlume** per utenti senza accesso all'elenco utenti).
3. Selezionare **Abilita Adminlume per me** e salvare.

Disattivata di default per tutti. Ogni utente può impostare il proprio colore principale e raggio pannelli (8/12/16 px), senza modificare altre preferenze utente. Nessuna impostazione globale, nessuna modifica di ruoli, dati ecommerce o permessi; le voci operative del menu non vengono riorganizzate. La disattivazione del plugin ripristina immediatamente l'aspetto nativo; le preferenze personali vengono conservate per una successiva riattivazione.

**Sfondo sidebar e top bar** è un'impostazione personale del backend, separata dall'accento dei pulsanti: default `#000000`. Il colore viene validato e applicato anche a intestazione, track scrollbar e angoli dell'area contenuti. Testi, icone, ricerca e stati hover/attivi si adattano a una palette chiara/scura. Il dock frontend conserva la propria presentazione antracite semitrasparente.

## Architettura e peso

- PHP per hook, preferenze in user meta e caricamento condizionale.
- Un piccolo CSS base solo nel backend e solo per utenti che aderiscono.
- CSS WooCommerce separato, solo sulle schermate pertinenti, senza dipendenza obbligatoria.
- CSS media caricato solo quando WordPress attiva la libreria o le finestre media: filtri, anteprime, selezione e dialoghi arrotondati; su smartphone le finestre a tutto schermo restano edge-to-edge.
- Pannelli Aiuto/Impostazioni schermata, tab e paginazione native coerenti con la skin.
- Toolbar desktop a tutta larghezza e con bordi esterni squadrati, con padding interno di 10 px: il primo comando (es. Live di WooCommerce) non aderisce più al bordo. Solo comandi e menu a tendina sono rounded. Altezza nativa e toolbar mobile preservate.
- Comandi toolbar desktop alti 26 px, con 3 px di spazio sopra e sotto all'interno della barra nativa da 32 px; menu a tendina ancorati sotto la barra. Voci sidebar desktop da 32 px con spaziatura compatta; target principali mobile di almeno 44 px.
- Contenuto dei comandi toolbar centrato con flexbox: padding verticale aggiuntivo del badge Live neutralizzato, offset e float delle icone native rimossi solo sulla riga principale desktop. Etichette, shortcut e avatar condividono lo stesso centro verticale; menu a tendina e controlli mobile mantengono il layout nativo.
- Separatori nativi del menu nascosti nella skin: nessuno spazio aggiuntivo tra gruppi come Commenti/WooCommerce o Marketing/Aspetto. Ordine e permessi delle voci restano invariati.
- Controllo nativo Riduci menu riposizionato in alto a destra su desktop, con icona sidebar disegnata in CSS; comportamento, stato ARIA e preferenza WordPress preservati. Su tablet/mobile restano i controlli responsive nativi.
- Nome del sito cliccabile nell'intestazione sidebar e rimozione di logo WordPress/nome sito dalla toolbar nel backend per utenti che aderiscono. Con menu ridotto il nome è nascosto; su mobile compare nell'intestazione del menu aperto. Sul frontend nome sito e logo WordPress restano nel dock con i propri link nativi.
- Menu ridotto a 52 px su desktop, con 8 px ai lati delle icone; transizioni CSS di 180 ms sincronizzate con l'area contenuti, disabilitate con `prefers-reduced-motion`. Tablet, mobile e canvas Gutenberg mantengono il comportamento responsive nativo.
- Sidebar desktop/tablet fissa con scroll interno e scrollbar sottile nativa personalizzata. Lo scroll non si propaga alla pagina; flyout posizionati nel viewport senza spostare i link fuori dal menu WordPress. Su mobile, Gutenberg e senza JavaScript resta il comportamento nativo. La visibilità persistente della scrollbar dipende anche dalle preferenze del sistema operativo.
- Intestazione desktop separata dal contenitore scrollabile delle voci (`#ra-sidebar-navigation`), non sticky: nome sito e controllo nativo di riduzione non partecipano mai allo scroll. Lo script ricolloca i nodi originali senza clonarli e ripristina la struttura nativa passando al layout mobile.
- Un piccolo script JavaScript vanilla per lo scroll indipendente e il posizionamento dei sottomenu: nessuna libreria, font remoto, chiamata HTTP esterna, cron o tabella custom.
- Tipografia sidebar di sistema a 14 px con pesi 400/550, ritmo verticale uniforme e icone outline SVG locali per le principali voci standard (le icone di plugin sconosciuti vengono conservate).
- Sottovoci della sezione aperta senza riquadro condiviso: sfondo trasparente, rientro allineato al titolo del padre, righe individuali rounded e stato attivo discreto. Flyout del menu ridotto preservati.
- Sottovoci in colonna con gap di 1 px, identico alla distanza effettiva tra voci principali; niente margini cumulati tra una sottovoce e l'altra o alla fine del gruppo.
- Quando è selezionata una sottovoce, solo quella riga ha lo sfondo attivo: il padre diventa un'intestazione neutra. Nel menu ridotto resta evidenziata l'icona della sezione per orientarsi.
- Cerca nel menu persistente: filtra voci e nomi dei sottomenu già presenti, senza navigare o cercare nel database. `⌘K` / `Ctrl+K` porta il focus alla ricerca (anche dal menu ridotto); Escape cancella il filtro. Non è una ricerca di prodotti, ordini o contenuti. La ricerca è disponibile nel layout desktop, non nell'auto-fold tablet o nel menu mobile nativo.
- Pulsante di cancellazione con vera icona SVG locale, a 4 px dal bordo destro dell'input. Compare solo con testo inserito, non si sovrappone alla scorciatoia e mantiene il focus nel campo dopo la cancellazione. Utilizzabile con Tab/Invio; decorazione nativa del browser disabilitata per evitare doppie X.
- CSS circoscritto a `body.rounded-admin`, controlli nativi e pannelli standard; Gutenberg mantiene la propria canvas e i controlli.
- `toolbar.css` è riservato al backend. Il frontend è gestito da `src/FrontendToolbar.php` con CSS/JS autonomi in `assets/css/frontend-toolbar.css` e `assets/js/frontend-toolbar.js`, senza dipendenze o build del tema. Nessun CSS del layout admin o JavaScript sidebar sul sito; nessun asset per visitatori anonimi, utenti non aderenti o barra nascosta.
- Solo sul frontend la barra nativa diventa un dock inferiore centrato, a 20 px dal basso: fondo antracite con blur, azione Modifica accent, menu verso l'alto e azioni secondarie raggruppate su mobile. Nessuna riserva superiore; header e contenuti non vengono modificati. Il backend conserva aspetto e comportamento precedenti.
- Non forza contenuti di applicazioni React o pagine plugin completamente personalizzate.

Il contrasto nero/bianco dei pulsanti viene scelto dalla luminanza del colore personale. Focus tastiera visibile, menu nativo compresso e breakpoint WordPress preservati. In RTL si mantiene la larghezza nativa del menu. Nessun clipping dei pannelli per non tagliare menu contestuali e Select2.

## Sicurezza

Salvataggio solo via POST autenticato, capability `read`, nonce legato all'utente corrente, senza ID utente ricevuto dal client. Colore validato come esadecimale e raggio limitato a una whitelist; output escaped. Le preferenze non contengono segreti. Nessuna opzione modifica l'aspetto degli altri utenti.

## Collaudo

Il test `tests/integration.php` va eseguito esclusivamente nel WordPress Docker locale. Verifica opt-in, sanitizzazione, contrasto, scope asset e preferenze isolate. Collaudare anche dashboard, prodotti, ordini HPOS, editor classico e Gutenberg, navigazione tastiera, menu compresso, smartphone, media modal e plugin specifici prima della distribuzione su altri siti. Una skin CSS non garantisce compatibilità visiva universale con plugin di terze parti.

```bash
docker compose run --rm wpcli wp eval-file /var/www/html/wp-content/plugins/adminlume/tests/integration.php
```

Test browser mirato alla toolbar (installazione Docker locale, skin abilitata per il primo amministratore, Node e Playwright disponibili nell'ambiente di test):

```bash
node wordpress/wp-content/plugins/adminlume/tests/topbar-browser.cjs
```

`PLAYWRIGHT_MODULE` e `PLAYWRIGHT_BROWSERS_PATH` possono indicare un'installazione esterna di Playwright. Il plugin non dipende da Node/Playwright a runtime. Il test non modifica le preferenze o i contenuti e rimuove la sessione temporanea alla fine.

Nel repository autonomo, impostare `ADMINLUME_WP_ROOT` sulla directory dell'ambiente WordPress Docker che contiene il servizio `wpcli`; installarvi prima la stessa versione del plugin. Esempio: `ADMINLUME_WP_ROOT=/percorso/sito node tests/topbar-browser.cjs`. La directory del repository non deve essere incorporata in un tema o in un progetto specifico. I test sono strumenti di sviluppo: non sono necessari a runtime e non devono essere eseguiti in produzione.

### Toolbar frontend inclusa nel plugin

Il dock fa parte di Adminlume, non del tema Nerd Zone: continua a funzionare cambiando tema, senza flag di supporto o chiamate al codice del sito. Riutilizza link, ID, permessi e notifiche native. Test dedicato: `node wordpress/wp-content/plugins/adminlume/tests/frontend-toolbar-browser.cjs`. Il plugin non richiede Node a runtime e il frontend non richiede compilazione.

### Compatibilità con Rounded Admin

Il namespace PHP è `Adminlume`, il text domain è `adminlume`. Le preferenze nuove usano `adminlume_preferences`; quelle salvate in `rounded_admin_preferences` vengono lette come fallback, senza perdere le scelte degli utenti. Al successivo salvataggio si usa il nuovo metadato, senza eliminare quello precedente. CSS interni `rounded-admin`/`ra-*`, handle asset e chiavi di storage del dock restano intenzionalmente compatibili: non sono dipendenze da un tema o da Nerd Zone.
