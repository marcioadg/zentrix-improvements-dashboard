#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function calculateHash(content) {
  return 'sha256-' + crypto.createHash('sha256').update(content).digest('base64');
}

function syncCSPHash() {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const vercelPath = path.join(__dirname, '..', 'vercel.json');

  try {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const scriptMatches = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
    if (scriptMatches.length === 0) {
      throw new Error('No inline scripts found in index.html');
    }
    const expectedHashes = scriptMatches.map(script => {
      const scriptContent = script.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
      return calculateHash(scriptContent);
    }).join("' '");

    const vercelContent = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    const cspHeader = vercelContent.headers?.[0]?.headers?.find(h => h.key === 'Content-Security-Policy');
    const currentHashes = cspHeader?.value?.match(/script-src '([^']*)'/)?.[1];

    if (currentHashes === expectedHashes) {
      console.log('✅ vercel.json CSP hashes are in sync');
      return 0;
    }

    console.warn(`⚠️  CSP hash mismatch detected`);
    console.warn(`   Current: ${currentHashes}`);
    console.warn(`   Expected: ${expectedHashes}`);

    // Update vercel.json with new hashes
    vercelContent.headers[0].headers = vercelContent.headers[0].headers.map(h => {
      if (h.key === 'Content-Security-Policy') {
        return {
          ...h,
          value: h.value.replace(/script-src '[^;]*;/, `script-src '${expectedHashes}';`)
        };
      }
      return h;
    });

    fs.writeFileSync(vercelPath, JSON.stringify(vercelContent, null, 2) + '\n');
    console.log(`✅ vercel.json updated with ${scriptMatches.length} script hashes`);
    return 0;
  } catch (e) {
    console.error('Error syncing CSP hash:', e.message);
    return 1;
  }
}

process.exit(syncCSPHash());
