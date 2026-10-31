// UI for the Perilous Frontiers pledge optimizer.  Model building lives in optimizer.js.
'use strict';

var HIGHS_URL = 'https://cdn.jsdelivr.net/npm/highs@1.15.3/build/';
var STORAGE_KEY = 'pf-optimizer-v1';
var THEME_KEY = 'pf-optimizer-theme';

var data;                 // data.json
var pieceByCode = {};
var setByCode = {};
var desired = {};         // pieceCode -> qty
var omitted = new Set();  // set codes excluded from optimization
var qtyInputs = {};       // pieceCode -> <input>
var highs;                // HiGHS solver instance
var solution;             // last readSolution() result
var activeTab = 'summary';
var lastTab = 'summary';  // tab to return to from a set's contents
var onlyExtras = false;

var $ = function (id) { return document.getElementById(id); };

function money(n) {
    return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function el(tag, attrs, children) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
        if (k === 'text') e.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
        else e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
}

function groupBy(list, key) {
    var groups = new Map();
    list.forEach(function (x) {
        var k = x[key] || 'Other';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(x);
    });
    return groups;
}

// ---- persistence -------------------------------------------------------------------

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            desired: desired, omitted: Array.from(omitted)
        }));
    } catch (e) { /* storage unavailable; nothing to do */ }
}

function restore() {
    try {
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved) return;
        for (var code in saved.desired) if (pieceByCode[code]) desired[code] = saved.desired[code];
        (saved.omitted || []).forEach(function (c) { if (setByCode[c]) omitted.add(c); });
    } catch (e) { /* ignore corrupt or unavailable storage */ }
}

// ---- desired pieces pane -----------------------------------------------------------

function setDesired(code, qty) {
    qty = Math.max(0, Math.floor(qty) || 0);
    if (qty) desired[code] = qty; else delete desired[code];
    var input = qtyInputs[code];
    if (input) {
        input.value = qty;
        input.classList.toggle('nonzero', qty > 0);
    }
}

function desiredChanged() {
    var codes = Object.keys(desired);
    var total = codes.reduce(function (s, c) { return s + desired[c]; }, 0);
    $('desired-count').textContent = codes.length ? '(' + codes.length + ' kinds, ' + total + ' pieces)' : '';
    if ($('only-desired').checked) filterPieces();
    if (activeTab === 'desired') renderResults();
    persist();
}

function renderPieces() {
    var container = $('pieces');
    container.innerHTML = '';
    groupBy(data.pieces, 'group').forEach(function (pieces, group) {
        var tbody = el('tbody');
        pieces.forEach(function (p) {
            var input = el('input', { type: 'number', min: 0, class: 'qty', value: desired[p.code] || 0 });
            input.classList.toggle('nonzero', !!desired[p.code]);
            input.addEventListener('change', function () {
                setDesired(p.code, parseInt(input.value, 10));
                desiredChanged();
            });
            qtyInputs[p.code] = input;
            var row = el('tr', {}, [
                el('td', {}, [input]),
                el('td', { text: p.name }),
                el('td', { class: 'code', text: p.code })
            ]);
            row.dataset.search = (p.name + ' ' + p.code).toLowerCase();
            row.dataset.code = p.code;
            tbody.appendChild(row);
        });
        container.appendChild(el('details', { open: '' }, [
            el('summary', { text: group + ' (' + pieces.length + ')' }),
            el('table', {}, [tbody])
        ]));
    });
}

function filterPieces() {
    var q = $('piece-filter').value.trim().toLowerCase();
    var only = $('only-desired').checked;
    document.querySelectorAll('#pieces tr').forEach(function (row) {
        var show = row.dataset.search.indexOf(q) >= 0 && (!only || desired[row.dataset.code] > 0);
        row.hidden = !show;
    });
}

function oneOfEach(suffix) {
    data.pieces.forEach(function (p) {
        if (p.code.slice(-2) === suffix) setDesired(p.code, Math.max(desired[p.code] || 0, 1));
    });
    desiredChanged();
}

function clearDesired() {
    Object.keys(desired).forEach(function (c) { setDesired(c, 0); });
    desiredChanged();
}

function saveDesired() {
    var lines = ['code,qty,name'];
    Object.keys(desired).forEach(function (code) {
        lines.push(code + ',' + desired[code] + ',"' + pieceByCode[code].name.replace(/"/g, '""') + '"');
    });
    var blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
    var link = el('a', { href: URL.createObjectURL(blob), download: 'perilous-frontiers-pledge.csv' });
    link.click();
    URL.revokeObjectURL(link.href);
}

function loadDesired(file) {
    file.text().then(function (text) {
        clearDesired();
        var unknown = [];
        text.split(/\r?\n/).slice(1).forEach(function (line) {
            var m = line.match(/^([^,]+),(\d+)/);
            if (!m) return;
            if (pieceByCode[m[1]]) setDesired(m[1], parseInt(m[2], 10));
            else unknown.push(m[1]);
        });
        desiredChanged();
        if (unknown.length) alert('Ignored pieces no longer in the data: ' + unknown.join(', '));
    });
}

// ---- sets pane ---------------------------------------------------------------------

function addSet(set, sign) {
    var max = document.querySelector('input[name=mode]:checked').value === 'max';
    if (sign < 0 && max) {
        alert("Sets can't be subtracted in Max mode.");
        return;
    }
    for (var code in set.contents) {
        var have = desired[code] || 0;
        var qty = set.contents[code];
        setDesired(code, sign < 0 ? have - qty : max ? Math.max(have, qty) : have + qty);
    }
    desiredChanged();
}

function pieceCount(set) {
    var n = 0;
    for (var c in set.contents) n += set.contents[c];
    return n;
}

function renderSets() {
    var container = $('sets');
    container.innerHTML = '';
    groupBy(data.sets, 'category').forEach(function (sets, category) {
        var tbody = el('tbody');
        sets.forEach(function (s) {
            var omit = el('input', { type: 'checkbox', title: 'Never pick this set when optimizing' });
            omit.checked = omitted.has(s.code);
            var row = el('tr', {}, [
                el('td', { class: 'actions' }, [
                    el('button', { text: 'Add', title: 'Add contents to desired pieces', onclick: function () { addSet(s, 1); } }),
                    el('button', { text: 'Sub', title: 'Subtract contents from desired pieces', onclick: function () { addSet(s, -1); } }),
                    el('label', { title: 'Never pick this set when optimizing' }, [omit, document.createTextNode(' Omit')])
                ]),
                el('td', {}, [
                    el('a', { href: '#', text: s.name, title: 'Show contents', onclick: function (e) { e.preventDefault(); showSetContents(s); } }),
                    s.stretchGoal ? el('span', { class: 'tag', text: 'SG' }) : null
                ]),
                el('td', { class: 'num', text: pieceCount(s) + ' pcs' }),
                el('td', { class: 'num', text: money(s.price) })
            ]);
            omit.addEventListener('change', function () {
                if (omit.checked) omitted.add(s.code); else omitted.delete(s.code);
                row.classList.toggle('omitted', omit.checked);
                persist();
            });
            row.classList.toggle('omitted', omit.checked);
            row.dataset.search = (s.name + ' ' + s.code).toLowerCase();
            row.dataset.code = s.code;
            tbody.appendChild(row);
        });
        container.appendChild(el('details', { open: '' }, [
            el('summary', { text: category + ' (' + sets.length + ')' }),
            el('table', {}, [tbody])
        ]));
    });
}

function filterSets() {
    var q = $('set-filter').value.trim().toLowerCase();
    document.querySelectorAll('#sets tr').forEach(function (row) {
        row.hidden = row.dataset.search.indexOf(q) < 0;
    });
}

function clearOmits() {
    omitted.clear();
    document.querySelectorAll('#sets tr').forEach(function (row) {
        row.classList.remove('omitted');
        row.querySelector('input[type=checkbox]').checked = false;
    });
    persist();
}

// ---- optimization ------------------------------------------------------------------

function setStatus(text, cls) {
    var s = $('status');
    s.textContent = text;
    s.className = cls || '';
}

function loadSolver() {
    Module({ locateFile: function (file) { return HIGHS_URL + file; } }).then(function (h) {
        highs = h;
        $('optimize').disabled = false;
        $('optimize').textContent = 'Optimize';
    }, function (err) {
        setStatus('Could not load the solver: ' + err, 'error');
    });
}

function optimize() {
    if (!Object.keys(desired).length) {
        setStatus('Enter some desired pieces first.', 'error');
        return;
    }
    var tolerance = parseFloat($('tolerance').value) || 0;
    var timeLimit = parseFloat($('time-limit').value) || 60;
    var model = PledgeOptimizer.buildModel(data, desired, { omitted: omitted });
    if (model.missing.length) {
        setStatus('No allowed set contains: ' + model.missing.map(function (c) { return pieceByCode[c].name; }).join(', '), 'error');
        return;
    }

    $('optimize').disabled = true;
    setStatus('Optimizing…');
    // Let the browser paint the status before the (synchronous) solve starts.
    setTimeout(function () {
        var started = Date.now();
        var result;
        try {
            result = highs.solve(model.lp, {
                output_flag: false,
                time_limit: timeLimit,
                mip_rel_gap: tolerance / 100
            });
        } catch (err) {
            setStatus('Solver error: ' + err.message, 'error');
            loadSolver(); // a failed solve can leave the WASM instance unusable
            return;
        }
        $('optimize').disabled = false;
        var seconds = ((Date.now() - started) / 1000).toFixed(2);
        var sol = PledgeOptimizer.readSolution(model, result);
        sol.desired = Object.assign({}, desired);

        if (sol.status === 'Optimal') {
            setStatus('Optimal pledge found in ' + seconds + 's.', 'ok');
        } else if (sol.picks.length && covers(sol)) {
            setStatus(sol.status + ' after ' + seconds + 's: showing the best pledge found, which may not be optimal.', 'error');
        } else {
            setStatus('No pledge found (' + sol.status + ').', 'error');
            return;
        }
        solution = sol;
        showTab('summary');
    }, 20);
}

function covers(sol) {
    var counts = PledgeOptimizer.manifest(sol.picks);
    return Object.keys(sol.desired).every(function (c) { return (counts[c] || 0) >= sol.desired[c]; });
}

// ---- results pane ------------------------------------------------------------------

function showTab(tab) {
    // Leaving a set's contents via a tab: drop its history entry so Back doesn't reopen it.
    if (history.state && history.state.set) history.replaceState(null, '');
    activeTab = lastTab = tab;
    document.querySelectorAll('#tabs button').forEach(function (b) {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    renderResults();
}

function renderResults() {
    var out = $('results');
    out.innerHTML = '';
    if (activeTab === 'desired') return renderDesiredList(out);
    if (!solution) {
        out.appendChild(el('p', { class: 'meta', text: 'Click Optimize to see the cheapest pledge here.' }));
        return;
    }
    out.appendChild(el('div', { class: 'total', text: 'Total: ' + money(solution.cost) }));
    if (activeTab === 'summary') renderSummary(out); else renderManifest(out);
}

function headRow(cols) {
    return el('thead', {}, [el('tr', {}, cols.map(function (c) {
        return el('th', { text: c[0], class: c[1] || '' });
    }))]);
}

function renderSummary(out) {
    var counts = PledgeOptimizer.manifest(solution.picks);
    var tbody = el('tbody');
    solution.picks.forEach(function (p) {
        // Which desired pieces would we fall short on with one fewer of this set?
        var lost = [];
        for (var code in p.set.contents) {
            var short = (solution.desired[code] || 0) - (counts[code] - p.set.contents[code]);
            if (short > 0) lost.push(short + ' × ' + pieceByCode[code].name);
        }
        var price = p.set.price;
        tbody.appendChild(el('tr', {}, [
            el('td', {}, [el('a', { href: '#', text: p.set.name, onclick: function (e) { e.preventDefault(); showSetContents(p.set); } })]),
            el('td', { class: 'num', text: p.qty }),
            el('td', { class: 'num', text: money(price) }),
            el('td', { class: 'num', text: money(price * p.qty) }),
            el('td', { class: 'lost', text: lost.join(', ') || 'nothing (all spare)' })
        ]));
    });
    out.appendChild(el('table', {}, [
        headRow([['Set'], ['Qty', 'num'], ['Each', 'num'], ['Cost', 'num'], ['Desired pieces lost with one fewer']]),
        tbody
    ]));
}

function renderManifest(out) {
    var counts = PledgeOptimizer.manifest(solution.picks);
    out.appendChild(el('label', {}, [
        el('input', { type: 'checkbox', onchange: function (e) { onlyExtras = e.target.checked; renderResults(); } }),
        document.createTextNode(' Only show extras (pieces beyond what you asked for)')
    ]));
    out.lastChild.firstChild.checked = onlyExtras;
    var tbody = el('tbody');
    data.pieces.forEach(function (p) {
        var have = counts[p.code] || 0;
        var want = solution.desired[p.code] || 0;
        if (!have || (onlyExtras && have <= want)) return;
        tbody.appendChild(el('tr', {}, [
            el('td', { text: p.name }),
            el('td', { class: 'code', text: p.code }),
            el('td', { class: 'num', text: have }),
            el('td', { class: 'num', text: want }),
            el('td', { class: 'num', text: have - want || '' })
        ]));
    });
    out.appendChild(el('table', {}, [
        headRow([['Piece'], ['Code'], ['In pledge', 'num'], ['Desired', 'num'], ['Extra', 'num']]),
        tbody
    ]));
}

function renderDesiredList(out) {
    var tbody = el('tbody');
    data.pieces.forEach(function (p) {
        if (desired[p.code]) {
            tbody.appendChild(el('tr', {}, [
                el('td', { text: p.name }),
                el('td', { class: 'code', text: p.code }),
                el('td', { class: 'num', text: desired[p.code] })
            ]));
        }
    });
    if (!tbody.children.length) {
        out.appendChild(el('p', { class: 'meta', text: 'No desired pieces yet.' }));
        return;
    }
    out.appendChild(el('table', {}, [headRow([['Piece'], ['Code'], ['Qty', 'num']]), tbody]));
}

// Shows a set's contents in the results pane.  Each view gets a browser history entry so the
// browser's Back button returns to the previous view instead of leaving the page.
function showSetContents(set, fromHistory) {
    if (!fromHistory) history.pushState({ set: set.code }, '');
    activeTab = 'contents';
    document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.remove('active'); });
    var out = $('results');
    out.innerHTML = '';
    var tabNames = { summary: 'pledge summary', manifest: 'item manifest', desired: 'desired list' };
    out.appendChild(el('button', { class: 'back', text: '← Back to ' + tabNames[lastTab], onclick: function () { history.back(); } }));
    out.appendChild(el('div', { class: 'total', text: set.name + ' — ' + set.code }));
    if (set.sets) {
        out.appendChild(el('p', { text: 'Bundle of: ' + Object.keys(set.sets).map(function (c) {
            return set.sets[c] + ' × ' + (setByCode[c] ? setByCode[c].name : c);
        }).join(', ') }));
    }
    var tbody = el('tbody');
    data.pieces.forEach(function (p) {
        if (set.contents[p.code]) {
            tbody.appendChild(el('tr', {}, [
                el('td', { text: p.name }),
                el('td', { class: 'code', text: p.code }),
                el('td', { class: 'num', text: set.contents[p.code] })
            ]));
        }
    });
    out.appendChild(el('table', {}, [headRow([['Piece'], ['Code'], ['Qty', 'num']]), tbody]));
}

// ---- startup -----------------------------------------------------------------------

function init(json) {
    data = json;
    data.pieces.forEach(function (p) { pieceByCode[p.code] = p; });
    data.sets.forEach(function (s) { setByCode[s.code] = s; });
    $('source').href = data.source;
    $('generated').textContent = data.generated;

    restore();
    renderPieces();
    renderSets();
    desiredChanged();
    renderResults();

    $('piece-filter').addEventListener('input', filterPieces);
    $('only-desired').addEventListener('change', filterPieces);
    $('set-filter').addEventListener('input', filterSets);
    $('one-painted').addEventListener('click', function () { oneOfEach('-P'); });
    $('one-unpainted').addEventListener('click', function () { oneOfEach('-U'); });
    $('clear').addEventListener('click', clearDesired);
    $('clear-omit').addEventListener('click', clearOmits);
    $('save').addEventListener('click', saveDesired);
    $('load').addEventListener('change', function (e) {
        if (e.target.files[0]) loadDesired(e.target.files[0]);
        e.target.value = '';
    });
    $('theme').value = document.documentElement.dataset.theme || 'desert';
    $('theme').addEventListener('change', function () {
        document.documentElement.dataset.theme = this.value;
        try { localStorage.setItem(THEME_KEY, this.value); } catch (e) { /* not remembered */ }
    });
    document.querySelectorAll('#tabs button').forEach(function (b) {
        b.addEventListener('click', function () { showTab(b.dataset.tab); });
    });
    $('optimize').addEventListener('click', optimize);
    window.addEventListener('popstate', function (e) {
        var set = e.state && e.state.set && setByCode[e.state.set];
        if (set) showSetContents(set, true); else showTab(lastTab);
    });
    if (history.state && history.state.set) history.replaceState(null, ''); // stale entry from a reload
}

loadSolver();
fetch('data.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); })
    .then(init)
    .catch(function (err) {
        setStatus('Could not load data.json (' + err.message + '). If you opened this file directly, ' +
            'serve the folder instead, e.g. "python3 -m http.server".', 'error');
    });
