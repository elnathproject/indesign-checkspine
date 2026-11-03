# CheckSpine

An Adobe InDesign script that finds objects which slightly cross the spine between facing pages, or stop just short of it, before the document goes to booklet imposition.

*[Versione italiana più sotto](#italiano)*

## The problem

Images placed flush to the spine often end up one or two points off, even with snapping on: a stroke aligned to the outside, a smart guide catching the wrong edge, a frame dragged at low zoom. On screen the error is invisible. In print it is not. Once pages are imposed for saddle stitching, facing pages are no longer next to each other, so an overshoot becomes a thin line on the edge of an unrelated page, and a gap becomes a white sliver at the fold.

CheckSpine scans every spread, lists these cases in a panel and fixes the ones that can be fixed safely.

## What it checks

| Label | Meaning | Fixed automatically |
|---|---|---|
| **CROSSES SPINE** | The object overshoots the spine onto the facing page by less than the threshold | Yes: the edge is moved onto the spine |
| **SHORT OF SPINE** | The object stops before the spine by less than the threshold | Yes: the edge is extended to the spine |
| **IMAGE SHORT OF SPINE** | The frame sits on the spine, but the image inside it does not reach it | No: moving or scaling the image is a layout decision |
| **ROTATED** | A rotated or skewed object (or image) near the spine, where the bounding box does not match the real shape | No: check it manually |

Measurements use the visible bounds of each object, so strokes are included.

Objects that cross the spine on purpose, such as double-page images, extend well beyond the threshold on both sides and are ignored. The SHORT OF SPINE check skips text frames and lines, which often sit near the inner margin by design.

Master spreads are checked too. Non-printing objects, hidden objects, and objects on hidden or non-printing layers are excluded.

## Installation

1. In InDesign, open **Window › Utilities › Scripts**.
2. Right-click the **User** folder and choose **Reveal in Finder** (macOS) or **Reveal in Explorer** (Windows).
3. Copy `CheckSpine.jsx` into that folder.

The script then appears under **User** in the Scripts panel. Double-click it to run.

## Usage

The script opens a floating panel that stays open while you work on the document.

- **Click a row** to jump to that spread and select the object.
- **Fix selected** fixes the chosen rows (Cmd/Ctrl-click to select several).
- **Fix all** fixes the whole list.
- **Refresh** runs the check again, after manual changes or on another open document.

Each fix operation can be undone with a single Cmd/Ctrl+Z. Groups and locked objects are listed but must be fixed by hand, since resizing a group would scale its contents.

## Settings

Two lines at the top of the file set the thresholds, in millimetres:

```javascript
var TOL_OVER_MM = 2; // max overshoot treated as an error
var TOL_GAP_MM  = 2; // max gap treated as an error
```

Differences below 0.01 pt are treated as rounding and ignored.

## Language

The interface follows the language of InDesign: Italian if InDesign runs in Italian, English for any other language. Object types and decimal separators follow the same rule.

## Limitations

- The image check looks only at the first image in a frame. Frames holding several graphics should be checked by hand.
- Objects inside groups are not analysed individually: the group is checked as a whole.
- The script does not check outer edges against the document bleed.

## Requirements

Adobe InDesign with ExtendScript support (the standard scripting engine on macOS and Windows).

## Author

Alessandro Ciccarelli · [alessandrociccarelli.com](https://alessandrociccarelli.com)

---

<a id="italiano"></a>

# CheckSpine (italiano)

Script per Adobe InDesign che individua gli oggetti che oltrepassano di poco il dorso tra le pagine affiancate, o si fermano poco prima, prima che il documento vada all'imposizione a opuscolo.

## Il problema

Le immagini posizionate a filo dorso finiscono spesso fuori posizione di uno o due punti, anche con l'aggancio attivo. Le cause sono diverse: un tracciato allineato all'esterno, una guida smart che aggancia il bordo sbagliato, una cornice trascinata a basso ingrandimento. A schermo l'errore non si vede; in stampa sì. Nell'imposizione per la cucitura a punto metallico le pagine affiancate non sono più vicine. Lo sconfinamento diventa un filo sul bordo di una pagina estranea, e lo scarto diventa un filo bianco sulla piega.

CheckSpine esamina tutte le pagine affiancate, elenca questi casi in un pannello e corregge quelli correggibili in sicurezza.

## Cosa controlla

| Etichetta | Significato | Correzione automatica |
|---|---|---|
| **SCONFINA** | L'oggetto oltrepassa il dorso di meno della soglia e invade la pagina accanto | Sì: il bordo viene portato sul dorso |
| **NON ARRIVA** | L'oggetto si ferma prima del dorso, a meno della soglia | Sì: il bordo viene esteso fino al dorso |
| **IMMAGINE NON ARRIVA** | La cornice è sul dorso, ma l'immagine al suo interno non lo raggiunge | No: spostare o ingrandire l'immagine è una scelta d'impaginazione |
| **RUOTATO** | Oggetto (o immagine) ruotato o inclinato vicino al dorso: il rettangolo d'ingombro non coincide con la forma reale | No: va verificato a mano |

Le misure si basano sull'ingombro visibile di ogni oggetto, tracciato compreso.

Gli oggetti che attraversano il dorso di proposito, come le immagini a doppia pagina, superano ampiamente la soglia su entrambi i lati e vengono ignorati. Il controllo NON ARRIVA esclude cornici di testo e linee, che spesso stanno vicino al margine interno per scelta.

Lo script controlla anche le pagine mastro. Esclude gli oggetti non stampabili, quelli nascosti e quelli su livelli nascosti o non stampabili.

## Installazione

1. In InDesign aprite **Finestra › Utilità › Script**.
2. Fate clic destro sulla cartella **Utente** e scegliete **Mostra nel Finder** (macOS) o **Mostra in Esplora risorse** (Windows).
3. Copiate `CheckSpine.jsx` in quella cartella.

Lo script compare sotto **Utente** nel pannello Script. Fate doppio clic per eseguirlo.

## Uso

Lo script apre un pannello flottante che resta aperto mentre lavorate sul documento.

- **Clic su una riga:** InDesign va sulla pagina affiancata e seleziona l'oggetto.
- **Correggi selezionati:** corregge le righe scelte (Cmd/Ctrl + clic per sceglierne più d'una).
- **Correggi tutti:** corregge l'intero elenco.
- **Aggiorna:** ripete il controllo, dopo modifiche manuali o su un altro documento aperto.

Ogni correzione si annulla con un solo Cmd/Ctrl+Z. Gruppi e oggetti bloccati compaiono nell'elenco ma vanno corretti a mano, perché ridimensionare un gruppo ne scalerebbe il contenuto.

## Impostazioni

Due righe in cima al file stabiliscono le soglie, in millimetri:

```javascript
var TOL_OVER_MM = 2; // sconfinamento massimo considerato errore
var TOL_GAP_MM  = 2; // distanza massima dal dorso considerata errore
```

Le differenze sotto 0,01 pt sono considerate arrotondamenti e ignorate.

## Lingua

L'interfaccia segue la lingua di InDesign: italiano se InDesign è in italiano, inglese con qualsiasi altra lingua. Seguono la stessa regola i nomi dei tipi di oggetto e il separatore decimale.

## Limiti

- Il controllo dell'immagine considera solo la prima immagine della cornice. Le cornici con più elementi grafici vanno verificate a mano.
- Gli oggetti dentro i gruppi non vengono analizzati singolarmente: il gruppo è controllato nel suo insieme.
- Lo script non controlla i bordi esterni rispetto all'abbondanza del documento.

## Requisiti

Adobe InDesign con supporto ExtendScript (il motore di scripting standard su macOS e Windows).

## Autore

Alessandro Ciccarelli · [alessandrociccarelli.com](https://alessandrociccarelli.com)
