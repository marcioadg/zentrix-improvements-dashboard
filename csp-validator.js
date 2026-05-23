#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function calculateHash(content) {
  return 'sha256-' + crypto.createHash('sha256').update(content).digest('base64');
}

function validateCSPHashes() {
  const htmlPath = path.join(__dirname, 'index.html');
  const serverPath = path.join(__dirname, 'server.js');
  const isStandalone = require.main === module;

  try {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Validate all script hashes (multiple inline scripts supported)
    const scriptMatches = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
    if (scriptMatches.length === 0) {
      throw new Error('No inline scripts found in index.html');
    }
    const scriptHashes = scriptMatches.map(s => {
      const content = s.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
      return calculateHash(content);
    });

    // Validate CSS hash
    const styleMatch = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    if (!styleMatch || !styleMatch[1]) {
      throw new Error('No inline style found in index.html');
    }
    const cssHash = calculateHash(styleMatch[1]);

    const serverContent = fs.readFileSync(serverPath, 'utf8');
    const scriptHashMatch = serverContent.match(/script-src '\$\{_scriptHashes\}'/);
    const cssHashMatch = serverContent.match(/style-src '\$\{_styleHash\}'/);

    if (!scriptHashMatch) {
      throw new Error('server.js does not use dynamic _scriptHashes in CSP header');
    }
    if (!cssHashMatch) {
      throw new Error('server.js does not use dynamic _styleHash in CSP header');
    }

    if (isStandalone) {
      console.log('✅ CSP using dynamic hash calculation');
      scriptHashes.forEach((h, i) => console.log(`   Script ${i + 1} hash: ${h}`));
      console.log(`   CSS hash: ${cssHash}`);
      process.exit(0);
    }
  } catch (e) {
    const msg = 'CSP validation error: ' + e.message;
    if (isStandalone) console.error('Error validating CSP setup:', e.message);
    else console.error(msg);
    process.exit(1);
  }
}

if (require.main === module) {
  validateCSPHashes();
}

module.exports = { calculateHash, validateCSPHashes };
