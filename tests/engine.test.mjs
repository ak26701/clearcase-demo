import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, reviewCase } from '../src/engine.js';
import { cases } from '../src/data.js';

test('all ten sample cases retrieve a policy and proposed response', () => {
  for (const input of cases) {
    const result = analyze(input);
    assert.ok(result.citations.length > 0);
    assert.ok(result.action);
    assert.ok(result.reply);
  }
});
test('retry limit overrides routine capture guidance', () => {
  const result = analyze({ signal: 'IMAGE_GLARE', attempts: 3 });
  assert.equal(result.specialist, true);
  assert.equal(result.citations[0].id, 'POL-08');
  assert.equal(result.citations[1].id, 'POL-01');
  assert.ok(!result.reply.includes('new photo'));
});
test('unknown and conflicting signals route to diagnosis', () => {
  for (const signal of ['UNKNOWN_ERROR', 'NOT_A_CODE', undefined]) {
    assert.equal(analyze({ signal, attempts: 1 }).citations[0].id, 'POL-07');
  }
  assert.equal(analyze({ signal: 'IMAGE_GLARE', attempts: 1, conflicting: true }).citations[0].id, 'POL-07');
});
test('name mismatch requires specialist review', () => {
  assert.equal(analyze({ signal: 'NAME_MISMATCH', attempts: 1 }).specialist, true);
});
test('invalid attempt counts fail explicitly', () => {
  for (const attempts of [0, -1, 1.5, NaN, '1', 21]) assert.throws(() => analyze({ signal: 'IMAGE_GLARE', attempts }));
});
test('approval requires analysis, a reviewer, and a response', () => {
  const analysis = analyze(cases[0]);
  assert.throws(() => reviewCase({ decision: 'approved', reviewer: 'Reviewer', reply: 'Reply' }));
  assert.throws(() => reviewCase({ analysis, decision: 'approved', reviewer: ' ', reply: 'Reply' }));
  assert.throws(() => reviewCase({ analysis, decision: 'approved', reviewer: 'Reviewer', reply: ' ' }));
  const record = reviewCase({ analysis, decision: 'approved', reviewer: ' Reviewer ', reply: 'Edited reply' });
  assert.equal(record.reviewer, 'Reviewer');
  assert.equal(record.reply, 'Edited reply');
  assert.deepEqual(record.policyIds, ['POL-01']);
});
test('specialist cases cannot be approved by support', () => {
  const analysis = analyze(cases[2]);
  assert.throws(() => reviewCase({ analysis, decision: 'approved', reviewer: 'Reviewer', reply: 'Reply' }), /specialist/);
  assert.equal(reviewCase({ analysis, decision: 'escalated', reviewer: 'Reviewer' }).decision, 'escalated');
});
test('rejection requires a reason and records rejection as the action', () => {
  const analysis = analyze(cases[0]);
  assert.throws(() => reviewCase({ analysis, decision: 'rejected', reviewer: 'Reviewer' }), /reason/);
  assert.equal(reviewCase({ analysis, decision: 'rejected', reviewer: 'Reviewer', note: 'Evidence needs further review' }).action, 'Reject recommendation');
});
