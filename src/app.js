import { issues, triedOptions, createPlan, makeMessage } from './guide.js';
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const storageKey = 'clearcase-personal-v1';
let input = null;
let plan = null;
let completed = new Set();
let editedMessage = '';
let resolved = false;
let dirtyDraft = false;
$('#issue').innerHTML += Object.entries(issues).map(([value, title]) => `<option value="${value}">${escape(title)}</option>`).join('');
$('#tried-options').innerHTML = Object.entries(triedOptions).map(([value, title]) => `<label class="check"><input type="checkbox" name="tried" value="${value}" />${escape(title)}</label>`).join('');
function readForm() {
  return { service: $('#service').value.trim(), issue: $('#issue').value, error: $('#error').value.trim(), device: $('#device').value, provider: $('#provider').value, notes: $('#notes').value.trim(), tried: [...document.querySelectorAll('[name="tried"]:checked')].map(el => el.value) };
}
function fillForm(value) {
  for (const key of ['service', 'issue', 'error', 'device', 'provider', 'notes']) if (typeof value[key] === 'string') $(`#${key}`).value = value[key];
  document.querySelectorAll('[name="tried"]').forEach(el => { el.checked = Array.isArray(value.tried) && value.tried.includes(el.value); });
}
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
function empty() {
  $('#result').innerHTML = `<div class="empty-result"><div class="path-mark" aria-hidden="true"><span>1</span><i></i><span>2</span><i></i><span>✓</span></div><p class="eyebrow">ONE STEP AT A TIME</p><h2>Let’s figure out what to try next.</h2><p>Start with the app and the problem you see. You will get a short checklist, relevant help links, and a support message you can edit.</p><div class="example"><strong>For example</strong><p>“My camera opens to a black screen.”</p><span>Check device and site permissions before taking another photo.</span></div><p class="small">This helper cannot access your account or approve your identity.</p></div>`;
}
function renderResult() {
  if (!plan) { empty(); return; }
  $('#result').innerHTML = `<div class="section-heading"><span class="number">02</span><h2>Your next steps</h2><span class="tag">${plan.supportFirst ? 'Support may be needed' : 'Try this first'}</span></div>
    <div class="result-intro"><p class="eyebrow">${escape(input.service)}</p><h2>${escape(plan.title)}</h2><p>${escape(plan.reason)}</p></div>
    ${resolved ? '<div class="success" role="status"><strong>You’re through.</strong><p>Glad that helped. You can start over when you need this again.</p></div>' : `<div class="checklist">${plan.steps.length ? plan.steps.map((step, index) => `<label class="step ${completed.has(step.id) ? 'done' : ''}"><input type="checkbox" data-step="${step.id}" ${completed.has(step.id) ? 'checked' : ''} /><span><span class="step-number">STEP ${index + 1}</span><strong>${escape(step.title)}</strong><span class="step-text">${escape(step.text)}</span></span></label>`).join('') : '<div class="notice">You’ve already tried the suggested checks. Use the message below to ask support for a specific next step.</div>'}</div><div class="outcome"><span>Did that help?</span><button id="worked" class="button">I got through</button><button id="still-stuck" class="text-button">Still stuck ↗</button></div>`}
    ${plan.helpSource ? `<div class="source"><span class="eyebrow">OFFICIAL REFERENCE</span><a href="${plan.helpSource.url}" target="_blank" rel="noopener noreferrer">${escape(plan.helpSource.name)} <span aria-hidden="true">↗</span></a><p>${escape(plan.sourceScope)}</p></div>` : ''}
    <section class="support" id="support"><div class="support-top"><div><p class="eyebrow">IF YOU NEED A PERSON</p><h2>A message for support.</h2></div><span class="small">Edit before sending</span></div><p>${escape(plan.suggestedContact)}</p><label for="support-message" class="sr-only">Support message</label><textarea id="support-message" rows="11" maxlength="10000">${escape(editedMessage)}</textarea><div class="support-actions"><button id="copy" class="button primary">Copy message <span aria-hidden="true">↗</span></button><button id="download" class="text-button">Download notes</button></div><p class="small">Nothing is sent automatically. Use the service’s official support channel.</p></section>`;
  document.querySelectorAll('[data-step]').forEach(el => el.onchange = () => {
    if (el.checked) completed.add(el.dataset.step); else completed.delete(el.dataset.step);
    el.closest('.step').classList.toggle('done', el.checked);
    if (!dirtyDraft) {
      editedMessage = makeMessage(input, plan.steps.filter(step => completed.has(step.id)).map(step => step.title));
      $('#support-message').value = editedMessage;
    }
    $('#save-status').textContent = 'Changes not saved';
  });
  $('#support-message').oninput = event => { editedMessage = event.target.value; dirtyDraft = true; $('#save-status').textContent = 'Changes not saved'; };
  $('#copy').onclick = async () => {
    try { await navigator.clipboard.writeText($('#support-message').value); toast('Message copied. Paste it into the service’s support form.'); }
    catch { $('#support-message').focus(); $('#support-message').select(); toast('Select and copy the highlighted message.'); }
  };
  $('#download').onclick = () => {
    const text = `Verification notes: ${input.service}\n\n${plan.title}\n\n${plan.steps.map(step => `[${completed.has(step.id) ? 'x' : ' '}] ${step.title}\n${step.text}`).join('\n\n')}\n\nSUPPORT MESSAGE\n\n${$('#support-message').value}${plan.helpSource ? `\n\nOFFICIAL REFERENCE\n${plan.helpSource.url}` : ''}`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = document.createElement('a'); link.href = url; link.download = 'verification-notes.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if ($('#worked')) $('#worked').onclick = () => { resolved = true; editedMessage = $('#support-message').value; renderResult(); $('#save-status').textContent = 'Changes not saved'; };
  if ($('#still-stuck')) $('#still-stuck').onclick = () => { $('#support').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); $('#support-message').focus({ preventScroll: true }); toast('Use this draft to ask support to check your session.'); };
}
$('#problem-form').onsubmit = event => {
  event.preventDefault();
  try {
    const nextInput = readForm(); const nextPlan = createPlan(nextInput);
    input = nextInput; plan = nextPlan; completed = new Set(); editedMessage = plan.message; dirtyDraft = false; resolved = false;
    $('#form-error').textContent = ''; $('#save-status').textContent = 'Not saved'; renderResult();
    if (innerWidth < 800) $('#result').scrollIntoView({ behavior: 'smooth' });
  } catch (error) { $('#form-error').textContent = error.message; }
};
$('#problem-form').oninput = () => {
  if (plan) { plan = null; input = null; completed = new Set(); editedMessage = ''; dirtyDraft = false; resolved = false; empty(); }
  $('#save-status').textContent = 'Changes not saved';
};
$('#save').onclick = () => {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ form: readForm(), completed: [...completed], editedMessage, dirtyDraft, resolved, hasPlan: !!plan }));
    $('#save-status').textContent = 'Saved on this device'; toast('Saved in this browser. Start over deletes the saved copy.');
  } catch { toast('Saving is unavailable in this browser. You can download your notes instead.'); }
};
$('#start-over').onclick = () => {
  $('#dialog-body').innerHTML = '<h2>Start over?</h2><p>This clears your current problem and deletes the saved copy from this browser.</p><div class="dialog-actions"><button id="confirm-reset" class="button primary">Clear and start over</button><button id="cancel-reset" class="button">Keep working</button></div>';
  $('#dialog').showModal(); $('#cancel-reset').onclick = () => $('#dialog').close();
  $('#confirm-reset').onclick = () => {
    try { localStorage.removeItem(storageKey); } catch { toast('Browser storage is unavailable.'); }
    $('#problem-form').reset(); input = null; plan = null; completed = new Set(); editedMessage = ''; resolved = false; dirtyDraft = false; empty(); $('#save-status').textContent = ''; $('#form-error').textContent = ''; $('#dialog').close(); $('#service').focus();
  };
};
$('#about').onclick = () => {
  $('#dialog-body').innerHTML = '<p class="eyebrow">ABOUT CLEARCASE</p><h2>A practical troubleshooting guide.</h2><p>Choose the problem you see to get a checklist and a support-message draft. The guide uses a fixed set of troubleshooting paths. Error text is included in your draft, but is not automatically diagnosed by an AI model.</p><p>Official help links are provided where relevant. Your service’s own instructions take priority. This helper cannot see your account, submit documents, remove a lockout, or approve verification.</p><p>Your form entries are not sent to a server. Saving is optional and uses this browser’s storage. Start over removes that saved copy. Opening an external help link takes you to that provider’s website.</p>';
  $('#dialog').showModal();
};
$('#close-dialog').onclick = () => $('#dialog').close();
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved?.form && typeof saved.form === 'object') {
    fillForm(saved.form);
    if (saved.hasPlan) {
      input = readForm(); plan = createPlan(input);
      completed = new Set(Array.isArray(saved.completed) ? saved.completed.filter(id => plan.steps.some(step => step.id === id)) : []);
      editedMessage = typeof saved.editedMessage === 'string' ? saved.editedMessage : plan.message;
      dirtyDraft = saved.dirtyDraft === true; resolved = saved.resolved === true;
    }
    $('#save-status').textContent = 'Restored from this device';
  }
} catch { /* Invalid or unavailable storage starts with a fresh form. */ }
renderResult();
