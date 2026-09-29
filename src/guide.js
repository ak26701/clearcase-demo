export const sources = {
  persona: { name: 'Persona: why an ID is rejected', url: 'https://help.withpersona.com/articles/lUSOtF3U1SAhVZ9AHIt8xF/' },
  idme: { name: 'ID.me: technical troubleshooting', url: 'https://help.id.me/hc/en-us/articles/360061360974-Troubleshoot-common-technical-issues' },
  plaid: { name: 'Plaid: camera permissions', url: 'https://support.plaid.com/hc/en-us/articles/29224978863127-Why-is-a-user-unable-to-use-their-camera-for-the-Document-or-Selfie-check-on-Identity-Verification' },
  stripe: { name: 'Stripe: photo ID upload help', url: 'https://support.stripe.com/questions/uploading-photo-of-government-issued-id-faq' }
};
export const issues = {
  photo: 'My ID photo is rejected or unreadable',
  camera: 'The camera is blocked or shows a black screen',
  selfie: 'The selfie check will not complete',
  expired: 'My ID is expired or not accepted',
  mismatch: 'My name or details do not match',
  session: 'The link expired or the page will not load',
  pending: 'I submitted everything and am waiting',
  locked: 'It says too many attempts or I am locked out',
  unknown: 'Something else / I cannot tell'
};
export const triedOptions = {
  permissions: 'Allowed camera access',
  photo: 'Retook the photo in better light',
  browser: 'Updated or changed browser',
  restart: 'Restarted from the original app',
  document: 'Checked the accepted document list',
  support: 'Already contacted support'
};
const step = (id, title, text) => ({ id, title, text });

export function createPlan(input) {
  if (!input.service?.trim()) throw new Error('Enter the app or website asking you to verify.');
  if (!issues[input.issue]) throw new Error('Choose the problem that best matches your screen.');
  const tried = new Set(input.tried || []);
  const cameraDevice = input.device === 'iphone' ? 'On your iPhone or iPad, check camera access for the browser in Settings, then check the verification site’s camera permission.' : input.device === 'android' ? 'On Android, open Settings → Apps → your browser → Permissions → Camera. Also check the verification site’s camera permission in your browser.' : 'Check camera permission for your browser in your computer’s privacy settings, then check the verification site’s camera permission in the browser.';
  const cameraStep = step('permissions', 'Check both camera permissions', `${cameraDevice} Allow access on the verification page when prompted.`);
  const photoStep = step('photo', 'Take a clear, complete photo', 'Use even light, keep every edge in frame, and hold the camera steady. Check for blur or reflections before submitting.');
  const browserStep = step('browser', 'Check the browser and connection', 'Use an up-to-date browser supported by the verification flow and a stable connection. Keep the verification tabs open while completing the steps.');
  const documentStep = step('document', 'Check what this service accepts', 'Read the document options shown in your verification flow. Accepted documents and issuing countries vary by service; a document working elsewhere does not guarantee it will work here.');
  const restartStep = step('restart', 'Return to the app where you started', `Open ${input.service.trim()} directly and use its verification entry point. If the link has expired and no new one is available, ask its support team for a new session.`);
  const routes = {
    photo: { title: 'Start with the document photo.', reason: 'A rejected image can be a capture issue. Check the error text before changing documents.', steps: [photoStep, documentStep], source: 'persona' },
    camera: { title: 'Check camera access first.', reason: 'Camera access can be blocked by the device, browser, or individual website.', steps: [cameraStep, browserStep], source: 'plaid' },
    selfie: { title: 'Check the capture setup.', reason: 'An incomplete selfie check does not tell us why verification failed. Follow the on-screen capture instructions first.', steps: [cameraStep, step('lighting', 'Follow the on-screen selfie instructions', 'Use even lighting and keep your face visible in the frame. Follow the requested movements and wait for the capture to finish.'), browserStep], source: 'stripe' },
    expired: { title: 'Check your document options.', reason: 'A clearer photo will not change the document’s validity or whether this service accepts it.', steps: [documentStep, step('alternative', 'Use an accepted current document, if available', 'If you do not have one of the listed documents, ask support whether an alternative verification route is available before retrying.')], source: 'persona' },
    mismatch: { title: 'Ask how to correct the mismatch.', reason: 'A spelling difference or name change may need the service’s account-correction process.', steps: [step('compare', 'Compare the details you entered', 'Check whether the mismatch comes from a typo, name change, or the document selected. Use the service’s correction flow if one is offered.'), step('contact', 'Ask support for its correction process', 'Explain which detail differs without including document numbers. Ask what to correct and how to provide any required evidence securely.')], source: 'persona', supportFirst: true },
    session: { title: 'Start from the original service.', reason: 'An expired link and a loading problem need different fixes. Start at the service, then check the browser if the new flow still will not load.', steps: [restartStep, browserStep], source: 'idme' },
    pending: { title: 'Check the status before resubmitting.', reason: 'Waiting for a review is different from a failed upload. This helper cannot see your account status or predict a completion time.', steps: [step('status', 'Read the status and any stated review window', 'Check the original app and messages from the service for a pending status, follow-up request, or stated timeframe.'), step('contact', 'Ask for a status update if needed', 'If the stated review window has passed or the instructions are unclear, ask support whether anything is still needed. Do not start a duplicate verification unless they ask.')], supportFirst: true },
    locked: { title: 'Pause retries and contact support.', reason: 'Follow the lockout message. There is no universal retry limit or waiting period that applies to every service.', steps: [step('lockout', 'Keep the exact lockout wording', 'Note any wait time or instructions displayed. Avoid starting new accounts or repeatedly submitting while the lockout remains.'), step('contact', 'Ask how to resume verification', 'Contact the service that requested verification and ask whether you should wait, receive a fresh link, or use a supported alternative.')], supportFirst: true },
    unknown: { title: 'Get the failure details first.', reason: 'There is not enough information to name the cause. The next useful step is to identify where the flow stopped.', steps: [step('error', 'Record the exact error and stage', 'Note whether you were uploading an ID, taking a selfie, entering details, or waiting for a result. Include the time it happened.'), step('contact', 'Ask support to check the failed session', 'Ask what caused the failure and which specific step to take next. Avoid repeating the same attempt without new information.')], supportFirst: true }
  };
  const route = routes[input.issue];
  const steps = route.steps.filter(item => !tried.has(item.id));
  const relevantProvider = { persona: ['photo', 'expired', 'mismatch'], stripe: ['photo', 'selfie', 'camera'], idme: ['camera', 'session'], plaid: ['camera'] };
  const matchedProvider = relevantProvider[input.provider]?.includes(input.issue);
  const helpSource = matchedProvider ? sources[input.provider] : route.source ? sources[route.source] : null;
  return {
    ...route,
    steps,
    supportFirst: route.supportFirst || steps.length === 0,
    helpSource,
    sourceScope: matchedProvider ? 'Official help for the provider you selected.' : 'General reference from a verification provider. Your service’s instructions take priority.',
    suggestedContact: input.provider === 'idme' ? 'Use ID.me’s official help center for ID.me verification issues. For access to another service after verification, contact that service.' : `Start with Help or Support inside ${input.service.trim()}. They can check your account and tell you what is required.`,
    message: makeMessage(input)
  };
}
export function makeMessage(input, completed = []) {
  const attempted = [...new Set([...(input.tried || []).map(id => triedOptions[id]).filter(Boolean), ...completed])];
  const deviceNames = { iphone: 'iPhone / iPad', android: 'Android', computer: 'Computer', other: 'Other / not specified' };
  const problem = issues[input.issue] || 'I cannot complete verification';
  const request = input.issue === 'pending' ? 'Could you check the status and confirm whether you need anything else from me?' : input.issue === 'locked' ? 'Could you confirm when and how I can resume, or whether you can provide a new verification session?' : input.issue === 'mismatch' ? 'Could you tell me how to correct the mismatch and securely provide any supporting information you need?' : 'Could you check why this is failing and tell me the next step? If this method is unavailable, is there an alternative verification process?';
  return `Hi ${input.service.trim()} support,\n\nI need help with identity verification. ${problem}.\n${input.error?.trim() ? `\nThe screen says: "${input.error.trim()}"\n` : ''}\nDevice: ${deviceNames[input.device] || deviceNames.other}${input.provider ? `\nVerification provider shown: ${input.provider === 'idme' ? 'ID.me' : input.provider}` : ''}\n${attempted.length ? `\nI have already tried:\n${attempted.map(text => `- ${text}`).join('\n')}\n` : ''}${input.notes?.trim() ? `\nAdditional context: ${input.notes.trim()}\n` : ''}\n${request}\n\nThanks`;
}
