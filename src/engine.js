import { policies, labels } from './data.js';

export function analyze(input) {
  if (!Number.isInteger(input.attempts) || input.attempts < 1 || input.attempts > 20) throw new Error('Failed attempts must be a whole number from 1 to 20.');
  const matched = policies.find(policy => policy.signals.includes(input.signal));
  const uncertain = !matched || input.conflicting === true;
  const retryLimit = input.attempts >= 3;
  const primary = policies.find(p => p.id === (uncertain ? 'POL-07' : retryLimit ? 'POL-08' : matched.id));
  const citations = [primary, ...(matched && matched.id !== primary.id ? [matched] : [])];
  const specialist = uncertain || retryLimit || input.signal === 'NAME_MISMATCH';
  return {
    category: uncertain ? 'Cause needs investigation' : labels[input.signal],
    evidence: uncertain ? 'The available signal is missing, unknown, or marked as conflicting. A reliable cause cannot be assigned.' : `The session returned ${input.signal}. ${input.attempts} failed ${input.attempts === 1 ? 'attempt is' : 'attempts are'} recorded.`,
    basis: uncertain ? 'Insufficient evidence' : 'Matched session signal',
    action: primary.action,
    reply: primary.reply,
    route: specialist ? 'Specialist review' : 'Support follow-up',
    specialist,
    citations,
    policyVersion: 'Demo policy v1.0',
    reason: uncertain ? 'A specialist needs to investigate before a next step can be determined.' : retryLimit ? 'The retry limit takes precedence over routine retry instructions.' : input.signal === 'NAME_MISMATCH' ? 'Identity discrepancies cannot be resolved by a support override.' : 'The mock policy permits this support action after human review.'
  };
}

export function reviewCase({ analysis, decision, reviewer, reply, note = '' }) {
  if (!analysis) throw new Error('Analyze the case before reviewing it.');
  if (!['approved', 'escalated', 'rejected'].includes(decision)) throw new Error('Choose a valid review decision.');
  if (!reviewer?.trim()) throw new Error('Enter your name to record the review.');
  if (decision === 'approved' && analysis.specialist) throw new Error('This case requires specialist review.');
  if (decision === 'approved' && !reply?.trim()) throw new Error('The proposed response cannot be empty.');
  if (decision === 'rejected' && !note.trim()) throw new Error('Add a reason for rejecting the recommendation.');
  return { decision, reviewer: reviewer.trim(), reply: reply?.trim() ?? '', note: note.trim(), at: new Date().toISOString(), action: decision === 'escalated' ? 'Route to specialist review' : decision === 'rejected' ? 'Reject recommendation' : analysis.action, policyIds: analysis.citations.map(p => p.id), policyVersion: analysis.policyVersion };
}
