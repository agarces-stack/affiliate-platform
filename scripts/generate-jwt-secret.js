#!/usr/bin/env node
const crypto = require('crypto');
const secret = crypto.randomBytes(64).toString('hex');
console.log('Generated JWT Secret (copy to config/.env):');
console.log('');
console.log(`JWT_SECRET=${secret}`);
console.log('');
console.log('Length:', secret.length, 'characters');
