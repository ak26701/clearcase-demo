import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, makeMessage, issues } from '../src/guide.js';
const base = { service: 'Example app', device: 'computer', provider: '', tried: [] };
test('each problem has an actionable plan and support draft', () => {
  for (const issue of Object.keys(issues)) {
    const result = createPlan({ ...base, issue });
    assert.ok(result.steps.length);
    assert.ok(result.message.includes('Example app support'));
  }
});
test('completed troubleshooting is not recommended again', () => {
  const result = createPlan({ ...base, issue: 'camera', tried: ['permissions', 'browser'] });
  assert.equal(result.steps.length, 0);
  assert.equal(result.supportFirst, true);
});
test('lockout guidance does not invent a retry count or recommend repeated submission', () => {
  const result = createPlan({ ...base, issue: 'locked' });
  assert.equal(result.supportFirst, true);
  assert.match(result.title, /Pause retries/);
  assert.match(result.reason, /no universal retry limit/);
  assert.ok(!result.steps.some(step => step.id === 'restart'));
});
test('unknown issue does not claim a diagnosis', () => {
  assert.match(createPlan({ ...base, issue: 'unknown' }).reason, /not enough information/);
});
test('camera advice changes with device', () => {
  assert.match(createPlan({ ...base, issue: 'camera', device: 'android' }).steps[0].text, /On Android/);
  assert.match(createPlan({ ...base, issue: 'camera', device: 'iphone' }).steps[0].text, /iPhone/);
});
test('support message includes only supplied attempts and error', () => {
  const message = makeMessage({ ...base, issue: 'photo', error: 'Could not read document', tried: ['photo'] });
  assert.match(message, /Could not read document/);
  assert.match(message, /Retook the photo/);
  assert.ok(!message.includes('Allowed camera'));
});
test('service and issue must be provided', () => {
  assert.throws(() => createPlan({ ...base, service: ' ', issue: 'camera' }));
  assert.throws(() => createPlan({ ...base, issue: 'invalid' }));
});
