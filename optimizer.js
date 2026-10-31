// Builds and interprets the integer linear program behind the pledge optimizer.
//
//   minimize    sum_j price_j * x_j
//   subject to  sum_j qty_ij * x_j >= desired_i   for every desired piece i
//               x_j >= 0, integer                 for every allowed set j
//
// The model is written in CPLEX LP format and solved by HiGHS (https://highs.dev),
// compiled to WebAssembly by highs-js (https://github.com/lovasoa/highs-js).
// Shared by the page (see app.js) and Node (see tools/test_optimizer.js).
(function (root) {
    'use strict';

    // data:     parsed data.json
    // desired:  { pieceCode: qty }
    // options:  { omitted: Set of set codes }
    // Returns { lp, vars, missing } where vars[k] is the set behind variable xk and
    // missing lists desired pieces that no allowed set provides.
    function buildModel(data, desired, options) {
        var omitted = (options && options.omitted) || new Set();
        var sets = data.sets.filter(function (s) { return !omitted.has(s.code); });

        var rows = {}; // pieceCode -> [term, ...]
        sets.forEach(function (s, k) {
            for (var piece in s.contents) {
                if (desired[piece] > 0) {
                    (rows[piece] = rows[piece] || []).push(s.contents[piece] + ' x' + k);
                }
            }
        });

        var missing = Object.keys(desired).filter(function (p) {
            return desired[p] > 0 && !rows[p];
        });

        var objective = sets.map(function (s, k) { return s.price + ' x' + k; });
        var constraints = Object.keys(rows).map(function (piece, i) {
            return ' c' + i + ': ' + rows[piece].join(' + ') + ' >= ' + desired[piece];
        });
        var names = sets.map(function (s, k) { return 'x' + k; });

        var lp = ['Minimize', ' cost: ' + (objective.join(' + ') || '0'),
            'Subject To'].concat(constraints.length ? constraints : [' c0: 0 x0 >= 0'],
            ['General', ' ' + names.join(' '), 'End']).join('\n');

        return { lp: lp, vars: sets, missing: missing };
    }

    // Converts a HiGHS result into { status, cost, picks: [{set, qty}] }.  Variables with
    // no constraint rows may be absent from result.Columns; they are zero.
    function readSolution(model, result) {
        var picks = [];
        model.vars.forEach(function (s, k) {
            var col = result.Columns['x' + k];
            var qty = col ? Math.round(col.Primal) : 0;
            if (qty > 0) picks.push({ set: s, qty: qty });
        });
        return { status: result.Status, picks: picks, cost: result.ObjectiveValue };
    }

    // Total quantity of each piece across the chosen sets.
    function manifest(picks) {
        var counts = {};
        picks.forEach(function (p) {
            for (var piece in p.set.contents) {
                counts[piece] = (counts[piece] || 0) + p.qty * p.set.contents[piece];
            }
        });
        return counts;
    }

    var api = { buildModel: buildModel, readSolution: readSolution, manifest: manifest };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.PledgeOptimizer = api;
})(this);
