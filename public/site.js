const screens = {
  'trade-routes': ['SC Companion trade route planner with ship selection and ranked routes', 'Compare cargo capacity, route estimates, and projected profit.'],
  blueprints: ['SC Companion blueprint recipe with materials and acquisition details', 'Browse crafting recipes, quality requirements, and known acquisition sources.'],
  market: ['SC Companion commodity market with prices and trading locations', 'Compare commodity buy and sell prices, supply, demand, and locations.'],
  home: ['SC Companion home page with grouped categories', 'A home for updates, reference data, trading tools, and live sessions.'],
  ships: ['SC Companion ship database', 'Browse ships and vehicles, compare specifications, and check availability.'],
  news: ['SC Companion news feed', 'Keep up with official RSI news without losing your place.']
};
const tabs = [...document.querySelectorAll('[data-screen]')];
function select(tab) {
  tabs.forEach(t => { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
  const key = tab.dataset.screen;
  document.querySelector('#screenshot').src = `/images/${key}.png`;
  document.querySelector('#screenshot').alt = screens[key][0];
  document.querySelector('#screenshot-caption').textContent = screens[key][1];
  document.querySelector('#screenshot-link').href = `/images/${key}.png`;
  document.querySelector('#screenshot-link').ariaLabel = `Open full-size ${key} screenshot`;
  document.querySelector('#screen-panel').setAttribute('aria-labelledby', tab.id);
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => select(tab));
  tab.addEventListener('keydown', e => {
    let next;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { e.preventDefault(); select(tabs[next]); tabs[next].focus(); }
  });
});
document.querySelector('#year').textContent = new Date().getFullYear();
fetch('/api/release').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
  if (data.version) document.querySelector('#release-version').textContent = `Latest release: ${data.version}`;
  document.querySelectorAll('[data-download]').forEach(link => {
    const url = data.downloads?.[link.dataset.download];
    if (typeof url === 'string' && url.startsWith('https://lvl222.com/downloads/sc-companion/')) {
      link.href = url;
      if (link.dataset.download === 'windows') link.textContent = 'Download for Windows ↓';
    }
  });
}).catch(() => {});
