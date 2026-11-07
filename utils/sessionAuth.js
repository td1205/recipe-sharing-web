const { createHash } = require('node:crypto');
const fingerprint = (passwordHash) => createHash('sha256').update(passwordHash).digest('hex');
const RESET_GRANT_TTL_MS = 5 * 60 * 1000;
module.exports = { fingerprint, RESET_GRANT_TTL_MS };
