// Downloads the campaign's Gamefound product list (names, pictures, product links, prices)
// as gamefound_products.json, which tools/build_data.py merges into data.json.
//
// How to use:
//   1. Open https://gamefound.com/en/projects/dwarven-forge/perilous-frontiers/rewards
//   2. Open the browser's developer console (F12, or Ctrl+Shift+J / Cmd+Option+J)
//   3. Paste this whole file and press Enter. A file download starts.
//   4. Move gamefound_products.json into tools/ and rerun tools/build_data.py.
//
// Rerun when products change on Gamefound (e.g. stretch goals are revealed).
(async () => {
    const PROJECT_ID = 8512;

    async function get(name) {
        const url = `/api/projectContents/${name}?projectID=${PROJECT_ID}`;
        let r = await fetch(url, { credentials: 'include' });
        if (!r.ok) r = await fetch(url, { method: 'POST', credentials: 'include' });
        if (!r.ok) throw new Error(`${name} failed: ${r.status}`);
        return (await r.json()).data;
    }

    const rewards = await get('getRewards');
    const addons = await get('getAddons');
    const cards = rewards.rewards.concat(...addons.addonCategories.map(c => c.cardModels));

    const products = new Map();
    cards.forEach(c => {
        if (!products.has(c.productID)) {
            products.set(c.productID, {
                name: c.name.trim(),
                productID: c.productID,
                price: c.effectivePrice,
                image: c.imageUrl,
                url: 'https://gamefound.com' + c.url,
            });
        }
    });

    const json = JSON.stringify([...products.values()], null, 1) + '\n';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    link.download = 'gamefound_products.json';
    link.click();
    console.log(`Downloaded ${products.size} products as gamefound_products.json`);
})().catch(e => console.error(e));
