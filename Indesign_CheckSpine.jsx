// CheckSpine.jsx
//
// IT  Pannello non modale che controlla il dorso tra le pagine affiancate:
//     SCONFINA             l'oggetto oltrepassa il dorso di poco e invade la pagina accanto
//     NON ARRIVA           l'oggetto si ferma poco prima del dorso e lascia un filo bianco
//     IMMAGINE NON ARRIVA  la cornice è sul dorso, ma l'immagine al suo interno no
//     RUOTATO              oggetto ruotato o inclinato vicino al dorso: il controllo
//                          automatico non è affidabile, va verificato a mano
//     Sono esclusi gli oggetti non stampabili, nascosti o su livelli nascosti
//     o non stampabili. Clic su una riga: va alla pagina e seleziona l'oggetto.
//     Le correzioni portano il bordo sul dorso e si annullano con un solo Cmd/Ctrl+Z.
//     L'interfaccia è in italiano se InDesign è in italiano, altrimenti in inglese.
//
// EN  Non-modal panel that checks the spine between facing pages:
//     CROSSES SPINE        the object slightly overshoots the spine onto the facing page
//     SHORT OF SPINE       the object stops just before the spine, leaving a white sliver
//     IMAGE SHORT          the frame sits on the spine, but the image inside does not
//     ROTATED              rotated or skewed object near the spine: the automatic
//                          check is unreliable, verify it manually
//     Non-printing and hidden objects, and objects on hidden or non-printing
//     layers, are ignored. Click a row to go to the page and select the object.
//     Fixes move the edge onto the spine and can be undone with a single Cmd/Ctrl+Z.
//     The interface is in Italian if InDesign runs in Italian, English otherwise.

#targetengine "checkSpine"
#target indesign

var TOL_OVER_MM = 2; // sconfinamento oltre il dorso considerato errore / max overshoot treated as error
var TOL_GAP_MM  = 2; // distanza dal dorso considerata errore / max gap treated as error

(function () {
    // ---- lingua dell'interfaccia ----
    var IT = false;
    try { IT = (app.locale == Locale.ITALIAN_LOCALE); } catch (e) {}

    var T = IT ? {
        title:   "CheckSpine (sconfina < %1 mm, non arriva < %2 mm)",
        pages:   "Pagine",
        over:    "SCONFINA di %1 mm",
        gap:     "NON ARRIVA, manca %1 mm",
        content: "IMMAGINE NON ARRIVA, manca %1 mm",
        rot:     "RUOTATO, da verificare a mano",
        locked:  "(bloccato)",
        refresh: "Aggiorna",
        fixSel:  "Correggi selezionati",
        fixAll:  "Correggi tutti",
        toCheck: "Da controllare: ",
        none:    "Nessun problema sul dorso",
        fixed:   "Corretti: ",
        manual:  ", a mano: ",
        adjust:  ", immagine da adattare: ",
        undo:    "Correzione bordi sul dorso",
        types: { Rectangle: "Rettangolo", Polygon: "Poligono", Oval: "Ellisse",
                 Group: "Gruppo", TextFrame: "Cornice di testo", GraphicLine: "Linea" }
    } : {
        title:   "CheckSpine (crosses < %1 mm, short < %2 mm)",
        pages:   "Pages",
        over:    "CROSSES SPINE by %1 mm",
        gap:     "SHORT OF SPINE by %1 mm",
        content: "IMAGE SHORT OF SPINE by %1 mm",
        rot:     "ROTATED, check manually",
        locked:  "(locked)",
        refresh: "Refresh",
        fixSel:  "Fix selected",
        fixAll:  "Fix all",
        toCheck: "To check: ",
        none:    "No spine issues",
        fixed:   "Fixed: ",
        manual:  ", fix manually: ",
        adjust:  ", adjust image: ",
        undo:    "Fix edges at spine",
        types: { Rectangle: "Rectangle", Polygon: "Polygon", Oval: "Ellipse",
                 Group: "Group", TextFrame: "Text frame", GraphicLine: "Line" }
    };

    function typeName(it) {
        var n = it.constructor.name;
        return T.types[n] || n;
    }

    function fmt(n) { // separatore decimale coerente con la lingua
        var s = n.toFixed(2);
        return IT ? s.replace(".", ",") : s;
    }

    // ---- controllo ----
    var found = [];
    var MM  = 0.352778; // millimetri per punto
    var EPS = 0.01;     // punti: differenze più piccole sono arrotondamenti

    function withSpreadPoints(doc, fn) {
        var vp = doc.viewPreferences;
        var o = vp.rulerOrigin, h = vp.horizontalMeasurementUnits, v = vp.verticalMeasurementUnits;
        try {
            vp.rulerOrigin = RulerOrigin.SPREAD_ORIGIN;
            vp.horizontalMeasurementUnits = MeasurementUnits.POINTS;
            vp.verticalMeasurementUnits = MeasurementUnits.POINTS;
            return fn();
        } finally {
            vp.rulerOrigin = o;
            vp.horizontalMeasurementUnits = h;
            vp.verticalMeasurementUnits = v;
        }
    }

    // Esclude ciò che non finisce in stampa
    function printable(it) {
        try { if (it.nonprinting) return false; } catch (e) {}
        try { if (!it.visible) return false; } catch (e) {}
        try {
            var ly = it.itemLayer;
            if (!ly.visible || !ly.printable) return false;
        } catch (e) {}
        return true;
    }

    // Rotazione o inclinazione diversa da un multiplo di 90°, sulla cornice
    // o sull'immagine: il rettangolo d'ingombro non coincide con la forma reale
    function offAxis(angle) {
        return Math.abs(angle - 90 * Math.round(angle / 90)) > 0.01;
    }
    function skewed(it) {
        try {
            if (offAxis(it.absoluteRotationAngle) || Math.abs(it.absoluteShearAngle) > 0.01) return true;
            if (it.allGraphics.length) {
                var g = it.allGraphics[0];
                if (offAxis(g.absoluteRotationAngle) || Math.abs(g.absoluteShearAngle) > 0.01) return true;
            }
        } catch (e) {}
        return false;
    }

    // Quanto manca all'immagine per arrivare al dorso (-1 se arriva o non c'è immagine)
    function contentShort(it, edge, x) {
        try {
            if (!it.allGraphics.length) return -1;
            var g = it.allGraphics[0].geometricBounds; // ingombro intero dell'immagine
            var d = (edge === 3) ? x - g[3] : g[1] - x;
            return (d > EPS) ? d : -1;
        } catch (e) { return -1; }
    }

    function gapCandidate(it) {
        var n = it.constructor.name;
        return n !== "TextFrame" && n !== "GraphicLine";
    }

    // edge: indice dei bounds da portare sul dorso (1 = bordo sinistro, 3 = destro)
    function rec(doc, sp, it, x, edge, kind, name, dist) {
        var label = T[kind].replace("%1", fmt(dist * MM));
        return { doc: doc, spread: sp, it: it, x: x, edge: edge, kind: kind,
                 txt: T.pages + " " + name + "  ·  " + label + "  ·  " +
                      typeName(it) + (it.locked ? "  " + T.locked : "") };
    }

    function scan() {
        found = [];
        if (!app.documents.length) return;
        var doc = app.activeDocument;
        var TO = TOL_OVER_MM / MM, TG = TOL_GAP_MM / MM;
        withSpreadPoints(doc, function () {
            var spreads = doc.spreads.everyItem().getElements()
                          .concat(doc.masterSpreads.everyItem().getElements());
            for (var s = 0; s < spreads.length; s++) {
                var sp = spreads[s];
                if (sp.pages.length < 2) continue;
                var cuts = [];
                for (var p = 0; p < sp.pages.length - 1; p++) {
                    cuts.push({ x: sp.pages[p].bounds[3],
                                name: sp.pages[p].name + " | " + sp.pages[p + 1].name });
                }
                var items = sp.pageItems.everyItem().getElements();
                for (var i = 0; i < items.length; i++) {
                    var it = items[i];
                    if (!printable(it)) continue;
                    var b = it.visibleBounds; // [y1, x1, y2, x2], tracciato incluso
                    for (var c = 0; c < cuts.length; c++) {
                        var x = cuts[c].x, nm = cuts[c].name;
                        var l = x - b[1]; // estensione a sinistra del dorso
                        var r = b[3] - x; // estensione a destra del dorso
                        var hit = null;   // [edge, kind, distanza]

                        if (l > EPS && r > EPS) {
                            if (Math.min(l, r) < TO) hit = [(l < r) ? 1 : 3, "over", Math.min(l, r)];
                        } else if (gapCandidate(it)) {
                            if (r < -EPS && -r < TG)        hit = [3, "gap", -r];  // pagina sinistra
                            else if (l < -EPS && -l < TG)   hit = [1, "gap", -l];  // pagina destra
                            else if (Math.abs(r) <= EPS) {                          // a filo, pagina sinistra
                                var d3 = contentShort(it, 3, x);
                                if (d3 > 0) hit = [3, "content", d3];
                            } else if (Math.abs(l) <= EPS) {                        // a filo, pagina destra
                                var d1 = contentShort(it, 1, x);
                                if (d1 > 0) hit = [1, "content", d1];
                            }
                        }

                        if (hit) {
                            if (skewed(it)) hit[1] = "rot";
                            found.push(rec(doc, sp, it, x, hit[0], hit[1], nm, hit[2]));
                        }
                    }
                }
            }
        });
    }

    function show(r) {
        if (!r || !r.it.isValid) return;
        try {
            app.activeWindow.activeSpread = r.spread;
            app.select(r.it);
        } catch (e) {}
    }

    // Esito: "ok", "skip" (da correggere a mano), "content" (cornice corretta
    // ma l'immagine al suo interno non arriva al dorso)
    function fixOne(r) {
        var o = r.it;
        if (r.kind === "rot") return "skip";
        if (r.kind === "content") return "content"; // la cornice è già giusta: va adattata l'immagine
        if (!o.isValid || o.locked || o.constructor.name === "Group") return "skip";
        return withSpreadPoints(r.doc, function () {
            var vb = o.visibleBounds, gb = o.geometricBounds;
            gb[r.edge] += (r.x - vb[r.edge]);
            o.geometricBounds = gb; // ridimensiona la cornice, non scala l'immagine
            return (contentShort(o, r.edge, r.x) > 0) ? "content" : "ok";
        });
    }

    function fixMany(recs) {
        var res = { ok: 0, skip: 0, content: 0 };
        app.doScript(function () {
            for (var i = 0; i < recs.length; i++) res[fixOne(recs[i])]++;
        }, ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, T.undo);
        return res;
    }

    // ---- pannello ----
    if ($.global.__checkSpineWin) {
        try { $.global.__checkSpineWin.close(); } catch (e) {}
    }
    var title = T.title.replace("%1", TOL_OVER_MM).replace("%2", TOL_GAP_MM);
    var win = new Window("palette", title, undefined, { resizeable: true });
    $.global.__checkSpineWin = win;
    win.alignChildren = "fill";

    var info = win.add("statictext", undefined, "", { truncate: "end" });
    info.characters = 60;
    var list = win.add("listbox", undefined, [], { multiselect: true });
    list.preferredSize = [580, 280];

    var g = win.add("group");
    g.alignment = "right";
    var bScan = g.add("button", undefined, T.refresh);
    var bFix  = g.add("button", undefined, T.fixSel);
    var bAll  = g.add("button", undefined, T.fixAll);

    function refresh(msg) {
        scan();
        list.removeAll();
        for (var i = 0; i < found.length; i++) list.add("item", found[i].txt);
        info.text = (msg ? msg + "   ·   " : "") +
            (found.length ? T.toCheck + found.length : T.none);
    }

    function resultMsg(r) {
        var s = T.fixed + r.ok;
        if (r.skip) s += T.manual + r.skip;
        if (r.content) s += T.adjust + r.content;
        return s;
    }

    list.onChange = function () {
        if (list.selection && list.selection.length === 1) show(found[list.selection[0].index]);
    };
    list.onDoubleClick = list.onChange;

    bScan.onClick = function () { refresh(); };

    bFix.onClick = function () {
        if (!list.selection) return;
        var recs = [];
        for (var i = 0; i < list.selection.length; i++) recs.push(found[list.selection[i].index]);
        refresh(resultMsg(fixMany(recs)));
    };

    bAll.onClick = function () {
        if (!found.length) return;
        refresh(resultMsg(fixMany(found.slice(0))));
    };

    win.onResizing = win.onResize = function () { this.layout.resize(); };

    refresh();
    win.show();
})();
