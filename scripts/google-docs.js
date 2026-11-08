#!/usr/bin/env node
// Standalone report tool: never imports the application, database or .env.
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { parseArgs } = require('node:util');
const model = require('./lib/googleDocsModel');
const ROOT = path.resolve(__dirname, '..');
const LOCAL = path.join(ROOT, '.local/google-docs');
const DOCUMENT = '1CqtYPpgz4YRuLC_JLZubXDEpGNOPLVLcEWQUqxxSMHw';
const SCOPE = 'https://www.googleapis.com/auth/documents';

async function savePrivate(file, value, exclusive = false) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: exclusive ? 'wx' : 'w' });
}
async function load(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
function privatePath(name) {
  const result = path.resolve(LOCAL, name);
  if (!result.startsWith(LOCAL + path.sep)) throw new Error('Plan/output phải nằm trong .local/google-docs.');
  return result;
}
async function client() {
  const localClient = path.join(LOCAL, 'credentials.json');
  const userClient = path.join(require('node:os').homedir(), '.config/recipe-docs/credentials.json');
  const file = process.env.GOOGLE_DOCS_CREDENTIALS || await fs.access(localClient).then(() => localClient, () => userClient);
  let json;
  try { json = await load(file); } catch { throw new Error('Thiếu/sai OAuth Desktop JSON. Đặt tại .local/google-docs/credentials.json hoặc GOOGLE_DOCS_CREDENTIALS.'); }
  if (!json.installed?.client_id || !json.installed?.client_secret) throw new Error('Cần OAuth client loại Desktop app (khóa installed), không dùng service account/web client.');
  const { google } = require('googleapis');
  return new google.auth.OAuth2({clientId:json.installed.client_id,clientSecret:json.installed.client_secret,transporterOptions:{timeout:30000,retry:false}});
}
async function authorize() {
  const auth = await client();
  const state = crypto.randomBytes(32).toString('hex');
  const { codeVerifier, codeChallenge } = await auth.generateCodeVerifierAsync();
  let resolveCode, rejectCode;
  const codePromise = new Promise((resolve,reject) => { resolveCode=resolve;rejectCode=reject; });
  const server = http.createServer((req,res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/oauth2callback') { res.writeHead(404).end();return; }
    if (url.searchParams.get('state') !== state) { res.writeHead(400).end('Invalid OAuth state');return; }
    if (url.searchParams.get('error')) { res.writeHead(400).end('Authorization denied');rejectCode(new Error('Google OAuth bị từ chối.'));return; }
    const code = url.searchParams.get('code');
    if (!code) { res.writeHead(400).end('Missing authorization code');return; }
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}).end('Đã nhận mã OAuth. CLI đang đổi mã lấy token; kiểm tra thông báo thành công trong terminal. Bạn có thể đóng trang này.');
    resolveCode(code);
  });
  await new Promise((resolve,reject) => { server.once('error',reject);server.listen(0,'127.0.0.1',resolve); });
  const redirect = `http://127.0.0.1:${server.address().port}/oauth2callback`;
  const timer = setTimeout(() => rejectCode(new Error('OAuth hết thời gian chờ (5 phút). Chạy lại lệnh auth.')),300000);
  try {
    console.log('Mở URL sau trong trình duyệt hệ thống và tự cấp quyền OAuth (không gửi code/token vào chat):');
    console.log(auth.generateAuthUrl({ scope:[SCOPE], access_type:'offline', prompt:'consent', state, redirect_uri:redirect, code_challenge:codeChallenge, code_challenge_method:'S256', include_granted_scopes:false }));
    const code = await codePromise;
    const { tokens } = await auth.getToken({code,codeVerifier,redirect_uri:redirect});
    if (!tokens.refresh_token) throw new Error('Không nhận được refresh token; thu hồi quyền app cũ và cấp lại.');
    await savePrivate(path.join(LOCAL,'token.json'),tokens);
    console.log('OAuth thành công; token chỉ lưu cục bộ trong thư mục đã gitignore.');
  } finally { clearTimeout(timer);server.close();server.closeAllConnections(); }
}
async function api() {
  const auth = await client();
  let token;
  try { token=await load(path.join(LOCAL,'token.json')); } catch { throw new Error('Chưa có token OAuth. Chạy: npm run docs -- auth'); }
  auth.setCredentials(token);
  auth.on('tokens', fresh => { token={...token,...fresh};savePrivate(path.join(LOCAL,'token.json'),token).catch(() => console.error('Không lưu được token mới; không in token.')); });
  const { google } = require('googleapis');
  return google.docs({version:'v1',auth,timeout:30000});
}
async function getDocument(docs, id) {
  return (await docs.documents.get({documentId:id,includeTabsContent:true,suggestionsViewMode:'SUGGESTIONS_INLINE'})).data;
}
function usage() {
  console.log(`Google Docs CLI — dry-run mặc định, không tự ghi.
  npm run docs -- auth
  npm run docs -- read --section "CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI"
  npm run docs -- search --section "3.2.1. Yêu cầu nghiệp vụ" --find "cụm từ"
  npm run docs -- replace --section "3.2.1. Yêu cầu nghiệp vụ" --find "cũ" --with "mới" --expect 1 --plan plans/change.json
  npm run docs -- apply --plan plans/change.json
  Tùy chọn: --document ID, --tab TAB_ID, --out reads/chapter1.json, --dry-run
  Apply chỉ dùng plan đã xem trước, revision phải còn nguyên. Không có lệnh sửa toàn tài liệu.`);
}
async function main() {
  const {positionals,values:args}=parseArgs({allowPositionals:true,options:{section:{type:'string'},tab:{type:'string'},document:{type:'string',default:DOCUMENT},find:{type:'string'},with:{type:'string'},expect:{type:'string'},changes:{type:'string'},backup:{type:'string'},plan:{type:'string'},out:{type:'string'},'dry-run':{type:'boolean'},help:{type:'boolean'}}});
  const command=positionals[0];
  if (args.help || !command) return usage();
  if (positionals.length!==1 || !['auth','read','search','replace','repair-boundaries','apply'].includes(command)) throw new Error('Lệnh không hợp lệ; xem --help.');
  if (command==='auth') return authorize();
  const docs=await api();
  if (command==='apply') {
    if (!args.plan) throw new Error('Cần --plan đã tạo ở chế độ dry-run.');
    const plan=await load(privatePath(args.plan));
    if (plan.documentId!==args.document) throw new Error('Document ID trong plan khác --document.');
    const doc=await getDocument(docs,plan.documentId);
    if(plan.version===3){
      const regenerated=model.makeBoundaryRepairPlan(doc,await load(privatePath(plan.backupPath)),plan.backupPath);
      if(JSON.stringify(regenerated)!==JSON.stringify(plan))throw new Error('Revision/source/repair plan đã thay đổi.');
    } else model.validatePlan(doc,plan);
    if (args['dry-run']) { console.log(JSON.stringify({dryRun:true,plan},null,2));return; }
    const expected=plan.version===3?plan.expectedHash:model.fingerprint(doc,plan.edits,plan.tabId);
    const backup=privatePath(`backups/${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID()}.json`);
    await savePrivate(backup,{documentId:plan.documentId,revisionId:doc.revisionId,createdAt:new Date().toISOString(),document:doc,plan},true);
    // Read back local backup before any write. Native image bytes are NOT in this JSON.
    if (model.hash((await load(backup)).document)!==model.hash(doc)) throw new Error('Sao lưu không khớp; dừng ghi.');
    await docs.documents.batchUpdate({documentId:plan.documentId,requestBody:{writeControl:{requiredRevisionId:plan.revisionId},requests:model.requestsFor(plan)}},{retry:false});
    const after=await getDocument(docs,plan.documentId);
    const verified=model.fingerprint(after)===expected;
    await savePrivate(backup.replace(/\.json$/,'.verification.json'),{documentId:plan.documentId,beforeRevision:doc.revisionId,afterRevision:after.revisionId,verified,checkedAt:new Date().toISOString()});
    if (!verified) throw new Error('Đã gửi batchUpdate nhưng hậu kiểm KHÔNG KHỚP. Không retry/rollback tự động; kiểm tra backup và tài liệu.');
    console.log(JSON.stringify({applied:(plan.edits||plan.styleEdits).length,verified:true,revisionId:after.revisionId,backup},null,2));
    return;
  }
  const doc=await getDocument(docs,args.document);
  if(command==='repair-boundaries'){
    if(!args.backup||!args.plan)throw new Error('Cần --backup và --plan cho phục hồi định dạng xuống dòng.');
    const plan=model.makeBoundaryRepairPlan(doc,await load(privatePath(args.backup)),args.backup);
    await savePrivate(privatePath(args.plan),plan,true);
    console.log(JSON.stringify({dryRun:true,plan},null,2));return;
  }
  if (command==='read' || command==='search') {
    const selected=model.readSection(doc,args);
    if (command==='search') {
      if (!args.find) throw new Error('Cần --find.');
      const matches=[];let offset=0;
      while ((offset=selected.text.indexOf(args.find,offset))>=0) { matches.push({offset,context:selected.text.slice(Math.max(0,offset-80),offset+args.find.length+80)});offset+=args.find.length; }
      delete selected.text;selected.matches=matches;
    }
    if (args.out) { await savePrivate(privatePath(args.out),selected);console.log(JSON.stringify({saved:privatePath(args.out),heading:selected.heading,revisionId:selected.revisionId})); }
    else console.log(JSON.stringify(selected,null,2));
    return;
  }
  const plan=args.changes ? model.makeBatchPlan(doc,args,await load(privatePath(args.changes))) : model.makePlan(doc,{...args,expect:Number(args.expect)},args.find,args.with);
  if (args.plan) await savePrivate(privatePath(args.plan),plan,true);
  console.log(JSON.stringify({dryRun:true,plan},null,2));
}
if (require.main===module) main().catch(error => {
  // Never dump Google request/config/response objects: they can contain OAuth tokens.
  if (error.response) console.error(`Google API HTTP ${error.response.status}; kiểm tra quyền, API enablement hoặc revision. Không tự thử ghi lại.`);
  else console.error(error.message);
  process.exitCode=1;
});
module.exports={savePrivate,privatePath,api,getDocument};
