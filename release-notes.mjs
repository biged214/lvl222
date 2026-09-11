// User-facing summaries of changes in each published desktop release.
// Add the next version here as part of publishing its website downloads.
export const releaseNotes = {
  'v0.32.1': [
    'Moved Blueprints to the end of the Reference group, after Organizations.',
    'Added expandable acquisition details with mission factions, mission givers, and reputation standing requirements.',
    'Added linked prerequisite missions, CrimeStat limits where supplied, and readable mission briefings.',
    'Cached opened mission details locally and added direct links to the version-specific Wiki source.'
  ],
  'v0.32.0': [
    'Added the Blueprints database under Reference, with search by blueprint or ingredient.',
    'Added game-version, category, acquisition and Owned/Wanted filters, plus name and crafting-time sorting.',
    'Added recipe ingredients, item and SCU quantities, crafting times, quality requirements, input choices and dismantle returns.',
    'Added known unlocking missions, locally saved Owned/Wanted checklists, and offline caching for the last catalog and opened recipes.',
    'Preserved unnamed game-file entries and clearly labeled unknown acquisition sources.'
  ],
  'v0.31.2': [
    'Fixed empty News article details for modern RSI Comm-Link pages.',
    'Improved extraction of readable article content from RSI component properties, including promotional pages.'
  ]
};
