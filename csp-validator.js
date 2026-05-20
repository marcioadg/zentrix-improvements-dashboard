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
  const vercelPath = path.join(__dirname, 'vercel.json');

  try {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const expectedHash = calculateHash(htmlContent);

    const serverContent = fs.readFileSync(serverPath, 'utf8');
    const vercelContent = fs.readFileSync(vercelPath, 'utf8');

    const serverMatch = serverContent.match(/script-src '(sha256-[^']+)'/);
    const vercelMatch = vercelContent.match(/script-src '(sha256-[^']+)'/);

    const serverHash = serverMatch ? serverMatch[1] : null;
    const vercelHash = vercelMatch ? vercelMatch[1] : null;

    const errors = [];
    if (serverHash !== expectedHash) {
      errors.push(`server.js hash mismatch: ${serverHash} (expected: ${expectedHash})`);
    }
    if (vercelHash !== expectedHash) {
      errors.push(`vercel.json hash mismatch: ${vercelHash} (expected: ${expectedHash})`);
    }
    if (serverHash !== vercelHash) {
      errors.push(`Hash mismatch between server.js and vercel.json`);
    }

    if (errors.length > 0) {
      console.error('❌ CSP Hash Validation Failed:');
      errors.forEach(e => console.error('  ' + e));
      process.exit(1);
    }

    console.log('✅ CSP hashes are in sync');
    console.log(`   Hash: ${expectedHash}`);
    process.exit(0);
  } catch (e) {
    console.error('Error validating CSP hashes:', e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  validateCSPHashes();
}

module.exports = { calculateHash, validateCSPHashes };
