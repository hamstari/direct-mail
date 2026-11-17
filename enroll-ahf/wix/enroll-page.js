/*
 * Wix page code for the enroll page (/enroll-ahf).
 * In the Wix editor: open the page, turn on Dev Mode, and paste this into
 * the page's code panel. The Embed HTML element holding the new form must
 * have the ID `enrollForm` (Properties panel). Leave the old Wix form on
 * the page but hidden, or delete it from the page: the form itself stays
 * in Wix Forms, so its submissions and automations keep working.
 */
import wixLocation from 'wix-location-frontend';
import { uploadEnrollmentFile, submitEnrollment } from 'backend/enrollment.web';

const REDIRECT_URL = 'https://www.americahomefinancial.com/sign-up';

$w.onReady(() => {
  const frame = $w('#enrollForm');

  frame.onMessage(async (event) => {
    const msg = event.data;
    if (!msg || msg.ahfEnroll !== 1) return;

    if (msg.type === 'redirect') {
      wixLocation.to(REDIRECT_URL);
      return;
    }
    if (msg.type === 'scrollTop') {
      frame.scrollTo().catch(() => {});
      return;
    }
    if (msg.type !== 'submit') return;

    const reply = (data) => frame.postMessage(Object.assign({ ahfEnroll: 1, requestId: msg.requestId }, data));
    try {
      const values = Object.assign({}, msg.submissions);
      const uploads = msg.uploads || [];
      const total = uploads.reduce((n, u) => n + u.files.length, 0);
      let done = 0;
      for (const up of uploads) {
        const files = [];
        for (const file of up.files) {
          done += 1;
          reply({ type: 'progress', label: total > 1 ? `Uploading ${done} of ${total}…` : 'Uploading…' });
          files.push(await uploadEnrollmentFile({ name: file.name, type: file.type, dataUrl: file.dataUrl, kind: up.kind }));
        }
        values[up.target] = files;
      }
      reply({ type: 'progress', label: 'Submitting…' });
      const result = await submitEnrollment({ submissions: values });
      reply({ type: 'result', ok: result.ok, error: result.error, id: result.id });
    } catch (err) {
      console.error('AHF enrollment', err);
      reply({ type: 'result', ok: false, error: String((err && err.message) || err) });
    }
  });
});
