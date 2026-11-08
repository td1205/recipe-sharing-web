// Pure document operations. All positions are Google Docs UTF-16 indexes.
const crypto = require('node:crypto');
const clone = value => JSON.parse(JSON.stringify(value));
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const STYLE_KEYS = ['backgroundColor', 'baselineOffset', 'bold', 'fontSize', 'foregroundColor', 'italic', 'link', 'smallCaps', 'strikethrough', 'underline', 'weightedFontFamily'];

function tabsOf(doc) {
  const result = [];
  function visit(tabs) {
    for (const tab of tabs || []) {
      if (tab.documentTab) result.push({ id: tab.tabProperties.tabId, title: tab.tabProperties.title, data: tab.documentTab });
      visit(tab.childTabs);
    }
  }
  visit(doc.tabs);
  if (!result.length && doc.body) result.push({ id: undefined, title: 'Main', data: doc });
  return result;
}

function paragraphs(content, result = [], inTable = false) {
  for (const element of content || []) {
    if (element.paragraph) result.push({ ...element, inTable });
    for (const row of element.table?.tableRows || []) for (const cell of row.tableCells || []) paragraphs(cell.content, result, true);
    // Table-of-contents entries must never be mistaken for real chapter headings.
  }
  return result;
}
const paragraphText = p => (p.paragraph.elements || []).map(e => e.textRun?.content || '').join('');

function sectionOf(doc, heading, tabId) {
  if (!heading || !heading.trim()) throw new Error('Cần --section với toàn bộ tiêu đề chính xác.');
  const matches = [];
  for (const tab of tabsOf(doc)) {
    if (tabId && tab.id !== tabId) continue;
    const list = paragraphs(tab.data.body?.content);
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const level = /^HEADING_([1-6])$/.exec(item.paragraph.paragraphStyle?.namedStyleType || '');
      if (item.inTable || !level || paragraphText(item).trim() !== heading.trim()) continue;
      let end = tab.data.body.content.at(-1).endIndex;
      for (let j = i + 1; j < list.length; j++) {
        const nextLevel = /^HEADING_([1-6])$/.exec(list[j].paragraph.paragraphStyle?.namedStyleType || '');
        if (!list[j].inTable && nextLevel && Number(nextLevel[1]) <= Number(level[1])) { end = list[j].startIndex; break; }
      }
      matches.push({ tab, start: item.startIndex, end, heading, paragraphs: list.filter(p => p.startIndex >= item.startIndex && p.startIndex < end) });
    }
  }
  if (matches.length !== 1) throw new Error(`Tiêu đề phải khớp duy nhất một heading thật; tìm thấy ${matches.length}. Dùng --tab nếu cần.`);
  return matches[0];
}

function effectiveStyle(doc, p, e) {
  const named = doc.namedStyles?.styles || [];
  const normal = named.find(s => s.namedStyleType === 'NORMAL_TEXT')?.textStyle || {};
  const heading = named.find(s => s.namedStyleType === p.paragraph.paragraphStyle?.namedStyleType)?.textStyle || {};
  return Object.fromEntries(Object.entries({ ...normal, ...heading, ...e.textRun.textStyle }).filter(([key]) => STYLE_KEYS.includes(key)));
}

function protectedColor(style) {
  const color = style.foregroundColor?.color;
  if (!color) return false;
  if (!color.rgbColor) return true; // Unknown color representation: fail closed.
  const { red = 0, green = 0, blue = 0 } = color.rgbColor;
  return red > green && red > blue; // Includes dark red, pink and red-orange.
}

function readSection(doc, args) {
  const s = sectionOf(doc, args.section, args.tab);
  return { documentId: doc.documentId, revisionId: doc.revisionId, tabId: s.tab.id, heading: s.heading, startIndex: s.start, endIndex: s.end,
    text: s.paragraphs.map(paragraphText).join('') };
}

function makePlan(doc, args, find, replacement, sourceFingerprint) {
  if (!doc.revisionId) throw new Error('Không có revisionId; cần quyền chỉnh sửa để lập kế hoạch an toàn.');
  if (!find || typeof replacement !== 'string' || /[\r\n\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(find + replacement)) throw new Error('Chỉ thay văn bản trong một đoạn, không thêm/xóa xuống dòng hoặc ký tự điều khiển.');
  const s = sectionOf(doc, args.section, args.tab);
  const edits = [];
  for (const p of s.paragraphs) {
    const text = paragraphText(p);
    let offset = 0;
    while ((offset = text.indexOf(find, offset)) >= 0) {
      // Resolve against actual text-run indexes; do not flatten images/structural gaps.
      let cursor = 0, owner;
      for (const e of p.paragraph.elements || []) {
        const t = e.textRun?.content || '';
        if (offset >= cursor && offset + find.length <= cursor + t.length) owner = { e, start: e.startIndex + offset - cursor };
        cursor += t.length;
      }
      if (!owner) throw new Error('Khớp đi qua nhiều text run hoặc phần tử phi văn bản; cần chia thành thay thế nhỏ hơn.');
      const style = effectiveStyle(s.tab.data.namedStyles ? s.tab.data : doc, p, owner.e);
      if (protectedColor(style)) throw new Error('Từ chối thay thế chữ đỏ hoặc màu không xác định.');
      if (JSON.stringify(p).includes('suggested')) throw new Error('Đoạn có suggested edits; cần giải quyết đề xuất trước khi sửa.');
      const edit={ start: owner.start, end: owner.start + find.length, before: find, after: replacement, style };
      const tail=p.paragraph.elements.at(-1);
      if(tail?.textRun?.content.endsWith('\n') && edit.end===tail.endIndex-1){
        const endStyle=effectiveStyle(s.tab.data.namedStyles?s.tab.data:doc,p,tail);
        if(JSON.stringify(endStyle)!==JSON.stringify(style)){
          if(protectedColor(endStyle))throw new Error('Thay thế có thể ảnh hưởng ký tự xuống dòng màu đỏ; dừng ghi.');
          edit.endStyle=endStyle;
        }
      }
      edits.push(edit);
      offset += find.length;
    }
  }
  if (!edits.length) throw new Error('Không tìm thấy nội dung trong mục đã chọn.');
  if (!Number.isSafeInteger(args.expect) || args.expect < 1 || edits.length !== args.expect) throw new Error(`Tìm thấy ${edits.length} kết quả; cần --expect ${edits.length} sau khi kiểm tra.`);
  return { version: 1, documentId: doc.documentId, revisionId: doc.revisionId, tabId: s.tab.id, section: args.section,
    sourceHash: sourceFingerprint || fingerprint(doc), edits: edits.sort((a, b) => b.start - a.start) };
}

function requestsFor(plan) {
  if (plan.version===3) return plan.styleEdits.map(e=>({updateTextStyle:{range:{startIndex:e.start,endIndex:e.end,...(plan.tabId?{tabId:plan.tabId}:{})},textStyle:e.style,fields:STYLE_KEYS.join(',')}}));
  return plan.edits.flatMap(e => {
    const location = index => ({ index, ...(plan.tabId ? { tabId: plan.tabId } : {}) });
    const range = (startIndex, endIndex) => ({ startIndex, endIndex, ...(plan.tabId ? { tabId: plan.tabId } : {}) });
    // Insert first so paragraph boundaries, table cells and anchored objects survive.
    const requests = [];
    if (e.after.length) requests.push({ insertText: { location: location(e.start), text: e.after } });
    requests.push({ deleteContentRange: { range: range(e.start + e.after.length, e.end + e.after.length) } });
    if (e.after.length) requests.push({ updateTextStyle: { range: range(e.start, e.start + e.after.length), textStyle: e.style, fields: STYLE_KEYS.join(',') } });
    if(e.endStyle)requests.push({updateTextStyle:{range:range(e.start+e.after.length,e.start+e.after.length+1),textStyle:e.endStyle,fields:STYLE_KEYS.join(',')}});
    return requests;
  });
}

// Repair only paragraph terminator styles changed by Google Docs run coalescing.
// Simulate the repair first; it must recreate the complete expected fingerprint.
function makeBoundaryRepairPlan(doc,backup,backupPath) {
  if(doc.documentId!==backup.documentId || !doc.revisionId) throw new Error('Backup/document không khớp.');
  const plan=backup.plan,oldTab=tabsOf(backup.document).find(t=>t.id===plan.tabId),newTab=tabsOf(doc).find(t=>t.id===plan.tabId);
  const before=paragraphs(oldTab.data.body.content),after=paragraphs(newTab.data.body.content);
  if(before.length!==after.length) throw new Error('Số đoạn đã thay đổi; không sửa định dạng tự động.');
  const simulated=clone(doc),simTab=tabsOf(simulated).find(t=>t.id===plan.tabId),simParas=paragraphs(simTab.data.body.content),styleEdits=[];
  for(let i=0;i<before.length;i++){
    const p=before[i],q=after[i];
    const touched=plan.edits.some(e=>e.start>=p.startIndex&&e.end<p.endIndex);
    if(!touched)continue;
    const oldEnd=p.paragraph.elements.at(-1),newEnd=q.paragraph.elements.at(-1);
    if(!oldEnd?.textRun?.content.endsWith('\n') || !newEnd?.textRun?.content.endsWith('\n'))throw new Error('Không xác định được ký tự kết thúc đoạn.');
    const style=effectiveStyle(oldTab.data,p,oldEnd),current=effectiveStyle(newTab.data,q,newEnd);
    if(JSON.stringify(style)===JSON.stringify(current))continue;
    if(protectedColor(style)||protectedColor(current))throw new Error('Không được sửa ký tự xuống dòng màu đỏ.');
    const end=newEnd.endIndex,start=end-1;
    styleEdits.push({start,end,style});
    const elements=simParas[i].paragraph.elements,tail=elements.pop();
    if(tail.textRun.content.length>1)elements.push({...tail,endIndex:start,textRun:{...tail.textRun,content:tail.textRun.content.slice(0,-1)}});
    elements.push({startIndex:start,endIndex:end,textRun:{content:'\n',textStyle:style}});
  }
  const expectedHash=fingerprint(backup.document,plan.edits,plan.tabId);
  if(fingerprint(simulated)!==expectedHash)throw new Error('Có sai lệch ngoài định dạng xuống dòng; không tự sửa.');
  if(!styleEdits.length)throw new Error('Không có định dạng xuống dòng cần phục hồi.');
  return {version:3,documentId:doc.documentId,revisionId:doc.revisionId,tabId:plan.tabId,section:plan.section,backupPath,sourceHash:fingerprint(doc),expectedHash,styleEdits};
}

function makeBatchPlan(doc,args,replacements) {
  if (!Array.isArray(replacements) || !replacements.length || replacements.length>100) throw new Error('Cần 1–100 thay thế độc lập.');
  const sourceFingerprint=fingerprint(doc);
  const plans=replacements.map(r=>makePlan(doc,{...args,expect:r.expect},r.find,r.with,sourceFingerprint));
  const edits=plans.flatMap(p=>p.edits).sort((a,b)=>b.start-a.start);
  for(let i=1;i<edits.length;i++) if(edits[i].end>edits[i-1].start) throw new Error('Các thay thế chồng lấn; chia thành batch khác.');
  return {...plans[0],version:2,replacements,edits};
}

function validatePlan(doc, plan) {
  if (doc.documentId !== plan.documentId || doc.revisionId !== plan.revisionId) throw new Error('Revision/document đã thay đổi. Đọc lại và tạo dry-run mới; không tự merge/retry.');
  if (!Array.isArray(plan.edits) || !plan.edits.length) throw new Error('Plan không có thay thế hợp lệ.');
  const args={section:plan.section,tab:plan.tabId,expect:plan.edits.length};
  const regenerated = plan.version===2 ? makeBatchPlan(doc,args,plan.replacements) : makePlan(doc,args,plan.edits[0].before,plan.edits[0].after);
  if (JSON.stringify(regenerated) !== JSON.stringify(plan)) throw new Error('Plan hoặc source khác bản xem trước. Tạo dry-run mới.');
}

// Compare all text and formatting in every tab/body/table/header/footer/footnote,
// plus all non-text structure. Ignore only shifting indexes and revision metadata.
function fingerprint(doc, edits = [], targetTab) {
  function clean(value) {
    if (Array.isArray(value)) return value.map(clean);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).filter(([k]) => !['startIndex', 'endIndex', 'contentUri', 'thumbnailUri', 'revisionId'].includes(k)).map(([k,v]) => [k,clean(v)]));
  }
  function content(elements, tabId, body = false) {
    return (elements || []).map(el => {
      if (el.paragraph) {
        const chars = [];
        for (const e of el.paragraph.elements || []) {
          if (!e.textRun) { chars.push({ object: clean(e) }); continue; }
          const tabData = tabsOf(doc).find(t => t.id === tabId)?.data;
          const style = effectiveStyle(tabData?.namedStyles ? tabData : doc, el, e);
          let text = e.textRun.content;
          if (body && tabId === targetTab) for (const edit of edits) {
            if (edit.start >= e.startIndex && edit.end <= e.endIndex) text = text.slice(0, edit.start - e.startIndex) + edit.after + text.slice(edit.end - e.startIndex);
          }
          // UTF-16 units preserve Google Docs indexing, including surrogate pairs.
          for (let i=0;i<text.length;i++) chars.push([text.charCodeAt(i),style]);
        }
        const p = clean(el.paragraph); delete p.elements;
        return { paragraph: p, chars };
      }
      if (el.table) {
        const t = clean(el.table);
        t.tableRows = el.table.tableRows.map(row => ({...clean(row), tableCells: row.tableCells.map(cell => ({...clean(cell),content:content(cell.content,tabId,body)}))}));
        return { table:t };
      }
      return clean(el);
    });
  }
  return hash(tabsOf(doc).map(tab => {
    const data = clean(tab.data);
    data.body = { ...clean(tab.data.body), content: content(tab.data.body?.content,tab.id,true) };
    for (const group of ['headers','footers','footnotes']) if (tab.data[group]) data[group] = Object.fromEntries(Object.entries(tab.data[group]).map(([id,v]) => [id,{...clean(v),content:content(v.content,tab.id)}]));
    return { id:tab.id, data };
  }));
}

module.exports = { tabsOf, sectionOf, readSection, makePlan, makeBatchPlan, makeBoundaryRepairPlan, requestsFor, validatePlan, fingerprint, hash, clone };
