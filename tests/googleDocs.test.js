const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../scripts/lib/googleDocsModel');

function paragraph(start, text, heading = 'NORMAL_TEXT', style = {}) {
  return { startIndex:start,endIndex:start+text.length,paragraph:{paragraphStyle:{namedStyleType:heading},elements:[{startIndex:start,endIndex:start+text.length,textRun:{content:text,textStyle:style}}]} };
}
function fixture() {
  return {documentId:'fixture-not-a-real-document',revisionId:'revision-fixture',tabs:[{tabProperties:{tabId:'t.0',title:'Test'},documentTab:{body:{content:[
    paragraph(1,'CHƯƠNG 1. TEST\n','HEADING_1'),
    paragraph(16,'Alpha Alpha 😀\n'),
    paragraph(31,'1.1. Detail\n','HEADING_2'),
    paragraph(43,'Protected red\n','NORMAL_TEXT',{foregroundColor:{color:{rgbColor:{red:0.8}}}}),
    {startIndex:57,endIndex:80,table:{rows:1,columns:1,tableRows:[{tableCells:[{content:[paragraph(60,'Cell\n')]}]}]}},
    paragraph(80,'CHƯƠNG 2. TEST\n','HEADING_1'),
    paragraph(95,'Outside\n'),
  ]},inlineObjects:{image1:{inlineObjectProperties:{embeddedObject:{imageProperties:{contentUri:'temporary-image-url',sourceUri:'original-image'}}}}}}}]};
}
test('reads exact heading subtree including tables, stops at peer heading, avoids TOC', () => {
  const d=fixture();d.tabs[0].documentTab.body.content.unshift({tableOfContents:{content:[paragraph(0,'CHƯƠNG 1. TEST\n','HEADING_1')]}});
  const s=m.readSection(d,{section:'CHƯƠNG 1. TEST'});
  assert.match(s.text,/Cell/);assert.doesNotMatch(s.text,/Outside|CHƯƠNG 2/);
  assert.throws(() => m.readSection(d,{section:'not found'}),/duy nhất/);
});
test('subsection ends before next chapter; ambiguous headings require tab', () => {
  const d=fixture();assert.equal(m.sectionOf(d,'1.1. Detail').end,80);
  d.tabs.push({...m.clone(d.tabs[0]),tabProperties:{tabId:'t.1'}});
  assert.throws(() => m.sectionOf(d,'CHƯƠNG 1. TEST'),/duy nhất/);
  assert.equal(m.sectionOf(d,'CHƯƠNG 1. TEST','t.0').tab.id,'t.0');
});
test('requires reviewed match count and orders UTF-16 edits descending', () => {
  const d=fixture();const a={section:'CHƯƠNG 1. TEST',expect:2};
  assert.throws(() => m.makePlan(d,{...a,expect:1},'Alpha','Beta'),/--expect 2/);
  const p=m.makePlan(d,a,'Alpha','Beta');assert.deepEqual(p.edits.map(e=>e.start),[22,16]);
  const requests=m.requestsFor(p);assert.equal(requests[0].insertText.location.tabId,'t.0');
  assert.equal(requests[0].insertText.location.index,22);
  assert.equal(requests[1].deleteContentRange.range.startIndex,26);
  assert.equal(requests[2].updateTextStyle.range.endIndex,26);
  assert.equal(m.makePlan(d,{...a,expect:1},'😀','X').edits[0].end-m.makePlan(d,{...a,expect:1},'😀','X').edits[0].start,2);
});
test('rejects red text (including inherited), multi-run edits, newline edits, suggestions', () => {
  const d=fixture();const a={section:'CHƯƠNG 1. TEST',expect:1};
  assert.throws(() => m.makePlan(d,a,'Protected','Changed'),/chữ đỏ/);
  assert.throws(() => m.makePlan(d,a,'Alpha\n','Changed'),/xuống dòng/);
  const p=d.tabs[0].documentTab.body.content[1];
  p.paragraph.elements=[{startIndex:16,endIndex:18,textRun:{content:'Al'}},{startIndex:18,endIndex:22,textRun:{content:'pha\n'}}];
  assert.throws(() => m.makePlan(d,a,'Alpha','Changed'),/nhiều text run/);
  p.paragraph.elements=[{startIndex:16,endIndex:22,textRun:{content:'Alpha\n',textStyle:{}}}];
  d.namedStyles={styles:[{namedStyleType:'NORMAL_TEXT',textStyle:{foregroundColor:{color:{rgbColor:{red:1,green:0.1,blue:0.1}}}}}]};
  assert.throws(() => m.makePlan(d,a,'Alpha','Changed'),/chữ đỏ/);
  d.tabs[0].documentTab.namedStyles=d.namedStyles;delete d.namedStyles;
  assert.throws(() => m.makePlan(d,a,'Alpha','Changed'),/chữ đỏ/);
  delete d.tabs[0].documentTab.namedStyles;p.paragraph.suggestedParagraphStyleChanges={example:{}};
  assert.throws(() => m.makePlan(d,a,'Alpha','Changed'),/suggested/);
});
test('fingerprint verifies expected replacements and detects altered text/styles/images/table structure', () => {
  const d=fixture();const p=m.makePlan(d,{section:'CHƯƠNG 1. TEST',expect:2},'Alpha','Beta');
  const expected=m.fingerprint(d,p.edits,p.tabId);const after=m.clone(d);
  after.tabs[0].documentTab.body.content[1].paragraph.elements[0].textRun.content='Beta Beta 😀\n';
  assert.equal(m.fingerprint(after),expected);
  after.tabs[0].documentTab.inlineObjects.image1.inlineObjectProperties.embeddedObject.imageProperties.contentUri='new-ephemeral-url';
  assert.equal(m.fingerprint(after),expected);
  const changed=m.clone(after);changed.tabs[0].documentTab.body.content.at(-1).paragraph.elements[0].textRun.content='Changed outside\n';assert.notEqual(m.fingerprint(changed),expected);
  after.tabs[0].documentTab.body.content[3].paragraph.elements[0].textRun.textStyle.bold=true;assert.notEqual(m.fingerprint(after),expected);
});
test('table-cell replacement stays in its text run and deletion has no zero-length style request', () => {
  const p=m.makePlan(fixture(),{section:'CHƯƠNG 1. TEST',expect:1},'Cell','');
  assert.equal(p.edits[0].start,60);assert.equal(m.requestsFor(p).length,1);
});
test('pre-write gate rejects stale revisions, tampered indexes and source drift', () => {
  const d=fixture();const p=m.makePlan(d,{section:'CHƯƠNG 1. TEST',expect:1},'Cell','New cell');
  assert.doesNotThrow(() => m.validatePlan(d,p));
  const stale=m.clone(d);stale.revisionId='another-revision';assert.throws(() => m.validatePlan(stale,p),/Revision/);
  const tampered=m.clone(p);tampered.edits[0].start=1;assert.throws(() => m.validatePlan(d,tampered),/khác bản xem trước/);
  const drift=m.clone(d);drift.tabs[0].documentTab.body.content.at(-1).paragraph.elements[0].textRun.content='Altered outside section\n';
  assert.throws(() => m.validatePlan(drift,p),/khác bản xem trước/);
});
test('batch replacements keep different text/style edits scoped and reject overlap or protected text', () => {
  const d=fixture();const args={section:'CHƯƠNG 1. TEST'};
  const list=[{find:'Alpha',with:'Beta',expect:2},{find:'Cell',with:'New cell',expect:1}];
  const p=m.makeBatchPlan(d,args,list);assert.equal(p.edits.length,3);assert.doesNotThrow(()=>m.validatePlan(d,p));
  const copy=m.clone(p);copy.edits[0].after='Tampered';assert.throws(()=>m.validatePlan(d,copy),/khác bản xem trước/);
  assert.throws(()=>m.makeBatchPlan(d,args,[...list,{find:'Cell',with:'Again',expect:1}]),/chồng lấn/);
  assert.throws(()=>m.makeBatchPlan(d,args,[...list,{find:'Protected',with:'Bad',expect:1}]),/chữ đỏ/);
  const after=m.clone(d);after.tabs[0].documentTab.body.content[1].paragraph.elements[0].textRun.content='Beta Beta 😀\n';
  after.tabs[0].documentTab.body.content[4].table.tableRows[0].tableCells[0].content[0].paragraph.elements[0].textRun.content='New cell\n';
  assert.equal(m.fingerprint(d,p.edits,p.tabId),m.fingerprint(after));
});
test('preserves paragraph terminator style and narrowly repairs known run coalescing', () => {
  const d=fixture(),tab=d.tabs[0].documentTab,p=tab.body.content[1];
  tab.namedStyles={styles:[{namedStyleType:'NORMAL_TEXT',textStyle:{fontSize:{magnitude:12,unit:'PT'},weightedFontFamily:{fontFamily:'Aptos',weight:400}}}]};
  p.paragraph.elements=[{startIndex:16,endIndex:30,textRun:{content:'Alpha Alpha 😀',textStyle:{weightedFontFamily:{fontFamily:'Times New Roman',weight:400}}}},{startIndex:30,endIndex:31,textRun:{content:'\n',textStyle:{}}}];
  const plan=m.makePlan(d,{section:'CHƯƠNG 1. TEST',expect:1},'😀','X');
  assert.equal(plan.edits[0].endStyle.weightedFontFamily.fontFamily,'Aptos');
  assert.equal(m.requestsFor(plan).at(-1).updateTextStyle.range.endIndex-m.requestsFor(plan).at(-1).updateTextStyle.range.startIndex,1);
  const after=m.clone(d),e=after.tabs[0].documentTab.body.content[1].paragraph.elements;
  e[0].textRun.content='Alpha Alpha X';e[0].endIndex=29;e[1].startIndex=29;e[1].endIndex=30;e[1].textRun.textStyle=e[0].textRun.textStyle;
  const backup={documentId:d.documentId,document:d,plan};
  const repair=m.makeBoundaryRepairPlan(after,backup,'backups/fixture.json');assert.equal(repair.styleEdits.length,1);
  assert.equal(repair.styleEdits[0].style.weightedFontFamily.fontFamily,'Aptos');
  after.tabs[0].documentTab.body.content.at(-1).paragraph.elements[0].textRun.content='Outside changed\n';
  assert.throws(()=>m.makeBoundaryRepairPlan(after,backup,'backups/fixture.json'),/ngoài định dạng/);
});
