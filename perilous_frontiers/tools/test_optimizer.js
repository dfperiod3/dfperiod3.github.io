// Sanity checks for optimizer.js against data.json.
//   npm install highs@1.15.3   (anywhere on NODE_PATH)
//   node tools/test_optimizer.js
'use strict';
const assert = require('assert');
const path = require('path');
const loadHighs = require('highs');
const opt = require('../optimizer.js');
const data = require('../data.json');

function solve(highs, desired, options) {
    const model = opt.buildModel(data, desired, options);
    assert.deepStrictEqual(model.missing, []);
    const t = Date.now();
    const sol = opt.readSolution(model, highs.solve(model.lp, { output_flag: false }));
    sol.seconds = (Date.now() - t) / 1000;
    assert.strictEqual(sol.status, 'Optimal');
    const counts = opt.manifest(sol.picks);
    for (const p in desired) assert.ok((counts[p] || 0) >= desired[p], `short on ${p}`);
    const cost = sol.picks.reduce((s, p) => s + p.qty * p.set.price, 0);
    assert.ok(Math.abs(cost - sol.cost) < 1e-6);
    return sol;
}

function show(label, sol) {
    console.log(`${label}: $${sol.cost} in ${sol.seconds}s`);
    sol.picks.forEach(p => console.log(`   ${p.qty} x ${p.set.name}  $${p.set.price}`));
}

(async () => {
    const highs = await loadHighs();
    const byName = n => data.sets.find(s => s.name === n);

    // Asking for exactly one set's contents should cost no more than that set.
    const banks = byName('Wasteland Banks Megapack - Desert (Painted)');
    const s1 = solve(highs, banks.contents);
    show('Banks megapack contents', s1);
    assert.ok(s1.cost <= banks.price);

    // Omitting it forces a different (no cheaper) answer.
    const s2 = solve(highs, banks.contents, { omitted: new Set([banks.code]) });
    show('...with the megapack omitted', s2);
    assert.ok(s2.cost >= s1.cost);
    assert.ok(!s2.picks.some(p => p.set.code === banks.code));

    // One of every painted piece -- the kind of problem that took hours with jsLPSolver.
    const painted = {};
    data.pieces.filter(p => p.code.endsWith('-P')).forEach(p => { painted[p.code] = 1; });
    show('One of every painted piece', solve(highs, painted));

    const unpainted = {};
    data.pieces.filter(p => p.code.endsWith('-U')).forEach(p => { unpainted[p.code] = 1; });
    show('One of every unpainted piece', solve(highs, unpainted));

    // A piece nobody sells once its only sets are omitted is reported as missing.
    const piece = Object.keys(banks.contents)[0];
    const sellers = new Set(data.sets.filter(s => s.contents[piece]).map(s => s.code));
    const m = opt.buildModel(data, { [piece]: 1 }, { omitted: sellers });
    assert.deepStrictEqual(m.missing, [piece]);

    console.log('All tests passed');
})().catch(e => { console.error(e); process.exit(1); });
