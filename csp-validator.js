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
    const expectedHash = calculateHash(htmlContent);

    const serverContent = fs.readFileSync(serverPath, 'utf8');
    const serverMatch = serverContent.match(/script-src '\$\{_scriptHash\}'/);

    if (!serverMatch) {
      throw new Error('server.js does not use dynamic _scriptHash in CSP header');
    }

    if (isStandalone) {
      console.log('✅ CSP using dynamic hash calculation');
      console.log(`   Current index.html hash: ${expectedHash}`);
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
