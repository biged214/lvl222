export const pageMetadata = {
  'Privacy Policy': ['/privacy', 'Learn how SC Companion and lvl222.com handle local app data, optional gameplay logs, downloads, and support requests.'],
  'Terms and Notices': ['/terms', 'Read the terms, third-party data notices, and Star Citizen trademark information for SC Companion by lvl222.'],
  'Software License': ['/license', 'SC Companion is licensed under GPL v3. Read the software license and find corresponding source code.'],
  'Support': ['/support', 'Get help with SC Companion for Windows and Linux. Contact lvl222 support for app issues or privacy questions.'],
  'SC Companion Downloads': ['/downloads', 'Download SC Companion free for Windows and Linux. Find installers, AppImage, DEB and RPM packages, release notes, and SHA-256 checksums.'],
  'Source Code': ['/source', 'Find SC Companion source archives, build instructions, GPL licensing information, and the development repository.']
};

export function seoHead(title, escape) {
  const entry = pageMetadata[title];
  if (!entry) throw new Error(`Missing SEO metadata: ${title}`);
  const [path, description] = entry;
  const url = `https://lvl222.com${path}`;
  return `<meta name="description" content="${escape(description)}"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="lvl222"><meta property="og:locale" content="en_US"><meta property="og:title" content="${escape(title)} | lvl222"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://lvl222.com/images/home.png"><meta property="og:image:width" content="1440"><meta property="og:image:height" content="1000"><meta property="og:image:alt" content="SC Companion desktop app home screen"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)} | lvl222"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="https://lvl222.com/images/home.png"><meta name="twitter:image:alt" content="SC Companion desktop app home screen">`;
}
