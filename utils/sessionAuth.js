const { createHash } = require('node:crypto');
const fingerprint = (passwordHash) => createHash('sha256').update(passwordHash).digest('hex');
const RESET_GRANT_TTL_MS = 5 * 60 * 1000;
function normaliseRemember(value) {
  if(value===undefined)return false;
  if(![true,false,'true','false','on'].includes(value))throw Object.assign(new Error('remember không hợp lệ'),{status:400});
  return value===true || value==='true' || value==='on';
}
module.exports = { fingerprint, RESET_GRANT_TTL_MS, normaliseRemember };
