import { cases as seedCases, policies, labels } from './data.js';
import { analyze, reviewCase } from './engine.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const storageKey = 'clearcase-demo-v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { /* Start fresh when storage is unavailable or invalid. */ }
let cases = [...seedCases, ...(Array.isArray(saved.customCases) ? saved.customCases.filter(c => c && typeof c.id === 'string' && c.id.startsWith('CUSTOM-') && Number.isInteger(c.attempts) && c.attempts >= 1 && c.attempts <= 20) : [])];
let reviews = Array.isArray(saved.reviews) ? saved.reviews.filter(r => r && cases.some(c => c.id === r.caseId) && ['approved', 'escalated', 'rejected'].includes(r.decision)) : [];
let selected = cases[0].id;
let view = 'queue';
let search = '';
let filter = 'all';
const analyses = new Map();
const drafts = new Map();
let reviewer = typeof saved.reviewer === 'string' ? saved.reviewer : '';

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({ customCases: cases.filter(c => c.id.startsWith('CUSTOM-')), reviews, reviewer })); }
  catch { toast('Browser storage is unavailable. Export reviews before closing this tab.'); }
}
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 4500); }
function currentReview(id) { return reviews.findLast(r => r.caseId === id); }
function status(id) { return currentReview(id)?.decision ?? 'pending'; }
function statusLabel(id) { return ({ pending: 'Needs review', approved: 'Approved', escalated: 'Escalated', rejected: 'Rejected' })[status(id)]; }
function heading(kicker, title, subtitle, actions = '') { return `<div class="page-heading"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${actions}</div>`; }
function render() {
  document.querySelectorAll('[data-view]').forEach(button => { button.classList.toggle('active', button.dataset.view === view); button.setAttribute('aria-current', button.dataset.view === view ? 'page' : 'false'); });
  $('#queue-count').textContent = cases.filter(c => status(c.id) === 'pending').length;
  $('#review-count').textContent = reviews.length;
  if (view === 'queue') renderQueue();
  if (view === 'policies') renderPolicies();
  if (view === 'activity') renderActivity();
}

function renderQueue() {
  $('#content').innerHTML = heading('VERIFICATION SUPPORT', 'Resolve verification support cases.', 'Understand the blocker. Check the policy. Review the response.', '<button id="new-case" class="button dark"><span aria-hidden="true">+</span> Add synthetic case</button>') + `
    <div class="summary-strip"><div><span class="summary-number">${cases.filter(c => status(c.id) === 'pending').length.toString().padStart(2, '0')}</span><span>Awaiting review</span></div><div><span class="summary-number">${cases.filter(c => status(c.id) === 'escalated').length.toString().padStart(2, '0')}</span><span>Escalations recorded</span></div><div><span class="summary-number">${cases.filter(c => status(c.id) === 'approved').length.toString().padStart(2, '0')}</span><span>Responses approved</span></div><p>Sample cases.<br>Real review workflow.</p></div>
    <div class="workspace"><section class="queue-panel" aria-label="Case queue"><div class="panel-title"><h2>Case queue</h2><span class="small-label">${cases.length} CASES</span></div><div class="queue-tools"><label class="search-box"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Search name, case, or signal" aria-label="Search cases" value="${escape(search)}" /></label><div class="filter-row" role="group" aria-label="Filter cases">${[['all', 'All cases'], ['pending', 'Needs review'], ['done', 'Reviewed']].map(([key, text]) => `<button data-filter="${key}" class="filter ${filter === key ? 'selected' : ''}" aria-pressed="${filter === key}">${text}</button>`).join('')}</div></div><div id="case-list"></div></section><section id="case-detail" aria-label="Selected case"></section></div>`;
  renderList(); renderDetail();
  $('#new-case').onclick = openNewCase;
  $('#search').oninput = event => { search = event.target.value; renderList(); };
  document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => { filter = button.dataset.filter; renderQueue(); });
}
function renderList() {
  const visible = cases.filter(c => `${c.name} ${c.id} ${c.signal}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === 'pending' ? status(c.id) === 'pending' : status(c.id) !== 'pending')));
  $('#case-list').innerHTML = visible.length ? visible.map(c => `<button class="case-row ${c.id === selected ? 'selected' : ''}" data-case="${escape(c.id)}" aria-pressed="${c.id === selected}"><div class="case-row-top"><span class="case-id">${escape(c.id)}</span><span class="age">${escape(c.age)}</span></div><div class="case-name">${escape(c.name)}<span aria-hidden="true">↗</span></div><p>${escape(labels[c.signal] || 'Unknown failure')}</p><div class="case-row-bottom"><span class="status ${status(c.id)}"><span class="dot"></span>${statusLabel(c.id)}</span><span>${c.attempts} ${c.attempts === 1 ? 'attempt' : 'attempts'}</span></div></button>`).join('') : '<div class="empty"><h3>No matching cases</h3><p>Try a different search or filter.</p></div>';
  document.querySelectorAll('[data-case]').forEach(button => button.onclick = () => { selected = button.dataset.case; renderList(); renderDetail(); });
}
function renderDetail() {
  const c = cases.find(c => c.id === selected);
  const result = analyses.get(c.id);
  const review = currentReview(c.id);
  const draft = drafts.get(c.id) || {};
  $('#case-detail').innerHTML = `<div class="detail-header"><div class="person-avatar">${escape(c.initials)}</div><div><div class="detail-id">${escape(c.id)} <span>/</span> Synthetic case</div><h2>${escape(c.name)}</h2></div><span class="status ${status(c.id)}"><span class="dot"></span>${statusLabel(c.id)}</span></div>
    <div class="case-facts"><div><span>Document</span><strong>${escape(c.document)}</strong></div><div><span>Issuing country</span><strong>${escape(c.country)}</strong></div><div><span>Failed attempts</span><strong>${c.attempts} <span class="muted">/ 3 before review</span></strong></div></div>
    <div class="customer-message"><span class="small-label">CUSTOMER MESSAGE</span><p>“${escape(c.message)}”</p></div>
    <details class="session-details"><summary>Session evidence <code>${escape(c.signal)}</code></summary><p>${escape(c.note)}</p>${c.conflicting ? '<p class="warning-text">Evidence marked as conflicting.</p>' : ''}<p class="muted">Fictional provider signals. No document images or personal data are processed.</p></details>
    ${result ? analysisHTML(c, result, review, draft) : review ? recordedHTML(review) : `<div class="analysis-start"><div class="scan-icon" aria-hidden="true">⌘</div><h3>Find the right next step</h3><p>Match the session evidence to a mock policy and prepare a response for your review.</p><button id="analyze" class="button green">Analyze case <span aria-hidden="true">↗</span></button><span class="method-note">Rule-based analysis · No API key required</span></div>`}`;
  if ($('#analyze')) $('#analyze').onclick = () => { analyses.set(c.id, analyze(c)); renderDetail(); toast('Analysis ready. Review the policy and proposed response.'); };
  document.querySelectorAll('[data-policy]').forEach(button => button.onclick = () => openPolicy(button.dataset.policy));
  if ($('#review-form')) {
    $('#review-form').oninput = () => { drafts.set(c.id, { reply: $('#reply').value, note: $('#review-note').value }); reviewer = $('#reviewer').value; };
    $('#review-form').onsubmit = event => {
      event.preventDefault();
      try {
        if (currentReview(c.id)) throw new Error('This case has already been reviewed.');
        const record = reviewCase({ analysis: result, decision: event.submitter?.value, reviewer: $('#reviewer').value, reply: $('#reply').value, note: $('#review-note').value });
        reviews.push({ ...record, caseId: c.id, caseName: c.name, category: result.category });
        reviewer = record.reviewer; persist(); render(); toast('Review recorded locally. No message was sent.');
      } catch (error) { $('#review-error').textContent = error.message; }
    };
  }
}
function analysisHTML(c, result, review, draft) {
  return `<div class="analysis"><div class="analysis-title"><h3><span class="spark" aria-hidden="true">✳</span> Copilot assessment</h3><span class="small-label">RULE-BASED</span></div><div class="diagnosis"><div class="diagnosis-top"><span class="small-label">01 / LIKELY BLOCKER</span><span class="evidence-tag ${result.specialist ? 'amber' : ''}">${escape(result.basis)}</span></div><h3>${escape(result.category)}</h3><p>${escape(result.evidence)}</p></div><div class="policy-match"><span class="small-label">02 / POLICY MATCH</span>${result.citations.map(p => `<button class="policy-link" data-policy="${p.id}"><span class="policy-code">${p.id}</span><span>${escape(p.title)}<small>Section ${p.section} · Demo policy v1.0</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div><div class="next-step"><span class="small-label">03 / RECOMMENDED NEXT STEP</span><h3>${escape(result.action)}</h3><p>${escape(result.reason)}</p><span class="route">Route: ${escape(result.route)}</span></div>
    ${review ? recordedHTML(review) : `<form id="review-form" class="review-form"><div class="review-heading"><h3>Human review required</h3><span class="gate-icon" aria-hidden="true">◇</span></div><p>Review and edit the draft before recording a decision.</p><label for="reply">Proposed customer response</label><textarea id="reply" maxlength="3000" rows="4">${escape(draft.reply ?? result.reply)}</textarea><div class="review-fields"><div><label for="reviewer">Reviewer name <span aria-hidden="true">*</span></label><input id="reviewer" maxlength="80" autocomplete="name" placeholder="Your name" value="${escape(reviewer)}" required /></div><div><label for="review-note">Review note</label><input id="review-note" maxlength="1000" placeholder="Required if rejecting" value="${escape(draft.note ?? '')}" /></div></div><p id="review-error" class="form-error" role="alert"></p><div class="decision-actions"><button class="button green" type="submit" value="${result.specialist ? 'escalated' : 'approved'}">${result.specialist ? 'Confirm escalation' : 'Approve response'} <span aria-hidden="true">↗</span></button>${!result.specialist ? '<button class="button" type="submit" value="escalated">Escalate</button>' : ''}<button class="text-button reject" type="submit" value="rejected">Reject</button></div><p class="method-note">Records a demo decision only. No response is sent and no identity is approved.</p></form>`}</div>`;
}
function recordedHTML(review) {
  return `<div class="recorded"><span class="small-label">REVIEW RECORDED</span><h3>${({ approved: 'Response approved', escalated: 'Routed to specialist', rejected: 'Recommendation rejected' })[review.decision]}</h3><p>${escape(review.reviewer)} · ${escape(new Date(review.at).toLocaleString())}</p><p><strong>Action:</strong> ${escape(review.action)}</p>${review.reply ? `<details><summary>Reviewed response</summary><p>${escape(review.reply)}</p></details>` : ''}${review.note ? `<p><strong>Note:</strong> ${escape(review.note)}</p>` : ''}<p class="method-note">Saved in this browser. No customer message was sent.</p></div>`;
}
function renderPolicies() {
  $('#content').innerHTML = heading('REFERENCE LIBRARY', 'Policy, close at hand.', 'Eight fictional policies that power the demo. Every recommendation points back here.') + '<div class="notice">Mock policy v1.0 · For demonstration only. These are not any company’s verification requirements.</div><div class="policy-grid">' + policies.map(p => `<article class="policy-card"><div class="policy-card-top"><span class="policy-code">${p.id}</span><span class="small-label">SECTION ${p.section}</span></div><h2>${escape(p.title)}</h2><p>${escape(p.text)}</p><div class="policy-action"><span class="small-label">DEFAULT ACTION</span><strong>${escape(p.action)}</strong></div></article>`).join('') + '</div>';
}
function renderActivity() {
  $('#content').innerHTML = heading('HUMAN DECISIONS', 'A record of every review.', 'Decisions are stored in this browser. Export them to keep a copy.', '<button id="export-page" class="button">Export JSON <span aria-hidden="true">↗</span></button>') + (reviews.length ? `<div class="activity-list">${[...reviews].reverse().map(r => `<article class="activity-card"><div class="activity-top"><span class="case-id">${escape(r.caseId)}</span><span class="status ${r.decision}">${escape(r.decision)}</span></div><h2>${escape(r.caseName)}</h2>${recordedHTML(r)}<div class="activity-policies">Policy references: ${r.policyIds.map(escape).join(', ')} · ${escape(r.policyVersion)}</div></article>`).join('')}</div>` : '<div class="empty large"><span class="empty-symbol" aria-hidden="true">◷</span><h2>Your decisions start here.</h2><p>Analyze a case and record a review to see its history.</p><button id="back-queue" class="button green">Open case queue</button></div>');
  $('#export-page').onclick = exportReviews;
  if ($('#back-queue')) $('#back-queue').onclick = () => { view = 'queue'; render(); };
}
function modal(html) {
  $('#dialog-content').innerHTML = `<button class="dialog-close text-button" aria-label="Close dialog">×</button>${html}`;
  $('.dialog-close').onclick = () => $('#dialog').close();
  $('#dialog').showModal();
}
function openPolicy(id) {
  const p = policies.find(p => p.id === id);
  modal(`<p class="eyebrow">${p.id} / SECTION ${p.section}</p><h2>${escape(p.title)}</h2><p class="dialog-policy">${escape(p.text)}</p><div class="notice">Mock policy v1.0. Fictional guidance for this demo.</div>`);
}
function openNewCase() {
  modal(`<p class="eyebrow">CASE BUILDER</p><h2>Try another scenario.</h2><p class="subtitle">Use fictional information only. Choose a signal and see how the recommendation changes.</p><form id="new-case-form"><label for="new-name">Fictional customer name</label><input id="new-name" value="Morgan Example" maxlength="80" required /><label for="new-signal">Session signal</label><select id="new-signal">${Object.entries(labels).map(([key, value]) => `<option value="${key}">${value} (${key})</option>`).join('')}</select><label for="new-attempts">Failed attempts</label><input id="new-attempts" type="number" min="1" max="20" value="1" required /><label for="new-message">Synthetic customer message</label><textarea id="new-message" rows="3" maxlength="1500" required>I’m stuck on verification. What should I do next?</textarea><label class="checkbox-label"><input id="new-conflict" type="checkbox" /> Evidence conflicts with the session signal</label><p id="new-error" class="form-error" role="alert"></p><button class="button green" type="submit">Create case <span aria-hidden="true">↗</span></button></form>`);
  $('#new-case-form').onsubmit = event => {
    event.preventDefault();
    const name = $('#new-name').value.trim(); const message = $('#new-message').value.trim();
    if (!name || !message) { $('#new-error').textContent = 'Enter a name and customer message.'; return; }
    const newCase = { id: `CUSTOM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, name, initials: name.split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase(), signal: $('#new-signal').value, attempts: Number($('#new-attempts').value), message, document: 'Demo document', country: 'Not specified', note: 'Manually configured synthetic session signal.', conflicting: $('#new-conflict').checked, age: 'Just added', priority: 'Normal' };
    try { analyze(newCase); } catch (error) { $('#new-error').textContent = error.message; return; }
    cases.unshift(newCase); selected = newCase.id; filter = 'all'; search = ''; persist(); $('#dialog').close(); view = 'queue'; render(); toast('Synthetic case added.');
  };
}
function exportReviews() {
  const blob = new Blob([JSON.stringify({ application: 'Clearcase', synthetic: true, exportedAt: new Date().toISOString(), policyVersion: 'Demo policy v1.0', reviews }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'clearcase-reviews.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast(`Exported ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}.`);
}
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => { view = button.dataset.view; render(); });
$('#export').onclick = exportReviews;
$('#about').onclick = () => modal('<p class="eyebrow">ABOUT CLEARCASE</p><h2>From failed check to reviewed next step.</h2><ol class="about-list"><li>Choose one of ten synthetic cases or create your own.</li><li>Analyze the session signal using an explicit rule set.</li><li>Read the cited mock policy and edit the proposed response.</li><li>Record your approval, rejection, or escalation.</li></ol><p>This is a working workflow prototype. Classification uses deterministic rules, not an AI model. Customer messages are context for the human reviewer; they are not automatically interpreted. No real identity verification or fraud detection happens.</p><p>Reviews stay in local browser storage. There is no shared backend, authentication, or customer messaging integration. The review gate demonstrates the interaction, not production access control.</p>');
$('#dialog').addEventListener('click', event => { if (event.target === $('#dialog')) { const box = $('#dialog').getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) $('#dialog').close(); } });
render();
