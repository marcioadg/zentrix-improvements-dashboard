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
    const scriptMatch = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!scriptMatch || !scriptMatch[1]) {
      throw new Error('No inline script found in index.html');
    }
    const expectedHash = calculateHash(scriptMatch[1]);

    const vercelContent = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    const currentHash = vercelContent.headers?.[0]?.headers?.find(h => h.key === 'Content-Security-Policy')?.value?.match(/script-src '(sha256-[^']+)'/)?.[1];

    if (currentHash === expectedHash) {
      console.log('✅ vercel.json CSP hash is in sync');
      return 0;
    }

    console.warn(`⚠️  CSP hash mismatch detected`);
    console.warn(`   Current: ${currentHash}`);
    console.warn(`   Expected: ${expectedHash}`);

    // Update vercel.json with new hash
    vercelContent.headers[0].headers = vercelContent.headers[0].headers.map(h => {
      if (h.key === 'Content-Security-Policy') {
        return {
          ...h,
          value: h.value.replace(/script-src '[^']*'/, `script-src '${expectedHash}'`)
        };
      }
      return h;
    });

    fs.writeFileSync(vercelPath, JSON.stringify(vercelContent, null, 2) + '\n');
    console.log(`✅ vercel.json updated with new hash: ${expectedHash}`);
    return 0;
  } catch (e) {
    console.error('Error syncing CSP hash:', e.message);
    return 1;
  }
}

process.exit(syncCSPHash());
