/*
 * AHF enrollment: settings. Edit these, then run `npm run build:enroll`.
 *
 * mode:
 *   'wix'     The form sits in a Wix "Embed HTML" element on the enroll page.
 *             Page code (wix/enroll-page.js) saves each application into the
 *             existing Wix form "Enrollment (FFC)", so the Smartsheet sync
 *             that already runs off that form keeps working. (Recommended.)
 *   'webhook' POST each application to a Zapier/Make webhook that adds a
 *             Smartsheet row. Use if the form is hosted outside Wix.
 *   'demo'    Nothing is sent. The answers are logged to the browser console.
 */
window.AHF_CONFIG = {
  mode: 'wix',
  webhookUrl: '',
  // Where to send people after they submit (the live form opens this page).
  redirectUrl: 'https://www.americahomefinancial.com/sign-up',
  logoUrl: 'https://static.wixstatic.com/media/a3154c_1914ee4a6e24400eaf0b0eae9865c432~mv2.png/v1/fill/w_340,h_146,al_c,q_85/AmericaFinancial-Logo.png',
  supportPhone: '888.502.8303',
  supportEmail: 'info@americahomefinancial.com'
};
