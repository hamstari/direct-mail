/*
 * Wix backend file. In the Wix editor: Dev Mode (Velo) on > Backend > add
 * a web module named `enrollment.web.js`, and paste this file in.
 *
 * It saves each application into the existing Wix form "Enrollment (FFC)",
 * so the form's current automations (including the Smartsheet sync, emails
 * and the contact update) keep running exactly as they do today.
 */
import { Permissions, webMethod } from 'wix-web-module';
import { submissions } from 'wix-forms.v2';
import { mediaManager } from 'wix-media-backend';
import { elevate } from 'wix-auth';

const FORM_ID = '5872b652-a4ff-401f-b02b-7f4f0799fc62';
const UPLOAD_FOLDER = '/AHF Enrollment Uploads';
const MAX_BYTES = 10 * 1024 * 1024;

// Field keys of the Wix form. Anything else sent by the browser is dropped.
const ALLOWED = new Set([
  'how_did_you_hear_about_america_home_financial', 'company_name_a1d8', 'dba', 'business_structure',
  'year_business_started', 'main_company_phone_number', 'business_address', 'business_email',
  'company_website', 'number_of_locations', 'e_mail_to_receive_credit_decisions',
  'first_and_last_name', 'job_title', 'how_many_owners_are_there',
  'first_and_last_name_1', 'email_79a5_2', 'personal_phone_number_1', 'percentage_of_business_owned_1', 'date_of_birth_2', 'social_security_number', 'multi_line_address_eea5', 'signature_37ce', 'form_field_0510',
  'first_and_last_name_2', 'email_79a5_1', 'personal_phone_number', 'percentage_of_business_owned', 'date_of_birth_1', 'social_security_number_1', 'multi_line_address_6e5b', 'signature_6f86', 'form_field_511',
  'first_and_last_name_3', 'email_79a5_3', 'personal_phone_number_2', 'percentage_of_business_owned_2', 'date_of_birth_3', 'social_security_number_2', 'multi_line_address_7eb5', 'signature_a427', 'form_field_512',
  'first_and_last_name_4', 'email_79a5_4', 'personal_phone_number_3', 'percentage_of_business_owned_3', 'date_of_birth_4', 'social_security_number_3', 'home_address_4', 'signature_afdc', 'form_field_9e91',
  'what_products_or_services_do_you_sell', 'if_you_would_like_to_add_more_products_and_services_please_list',
  'list_the_manufacturer_of_these_products', 'does_your_company_install_the_products_they_sell_if_they_require',
  'do_you_subcontract', 'list_what_percentage_your_business_subcontracts',
  'contractor_license_registration_number', 'which_state_do_you_primarily_do_business_in',
  'if_you_are_licensed_to_do_business_in_more_than_one_state_please',
  'average_annual_residential_sales', 'average_sale_price', 'do_you_currently_have_any_financing_programs',
  'short_answer_d15c', 'amount_of_sales_financed_in_months',
  'which_documents_are_you_ready_to_upload', 'file_upload'
]);
const FILE_FIELDS = new Set(['file_upload', 'signature_37ce', 'signature_6f86', 'signature_a427', 'signature_afdc']);
const EXT_TYPES = {
  pdf: 'application/pdf', doc: 'application/msword', rtf: 'application/rtf', txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text'
};
const DOC_TYPES = /^(application\/(pdf|msword|rtf|vnd\.openxmlformats-officedocument\.[\w.]+|vnd\.ms-[\w.]+|vnd\.oasis\.opendocument\.[\w.]+)|text\/(plain|rtf))$/;

/** Uploads one document or signature image to Wix Media (private). */
export const uploadEnrollmentFile = webMethod(Permissions.Anyone, async ({ name, type, dataUrl, kind }) => {
  const isImage = kind === 'image';
  if (!isImage && !DOC_TYPES.test(String(type))) {
    // Some browsers leave the type blank; fall back to the file extension.
    type = EXT_TYPES[String(name || '').split('.').pop().toLowerCase()] || type;
  }
  if (isImage ? type !== 'image/png' : !DOC_TYPES.test(String(type))) {
    throw new Error('File type not allowed: ' + type);
  }
  const base64 = String(dataUrl || '').split(',')[1] || '';
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > MAX_BYTES) throw new Error('File is empty or larger than 10 MB');

  const safeName = String(name || 'file').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  const uploaded = await mediaManager.upload(UPLOAD_FOLDER, buffer, safeName, {
    mediaOptions: { mimeType: type, mediaType: isImage ? 'image' : 'document' },
    metadataOptions: { isPrivate: true, isVisitorUpload: true }
  });
  // Shape of a file value in a Wix Forms submission.
  return {
    fileId: uploaded.fileName,
    displayName: safeName,
    url: uploaded.fileUrl,
    fileType: isImage ? 'IMAGE' : 'DOCUMENT'
  };
});

/** Creates the submission in the existing Wix form. */
export const submitEnrollment = webMethod(Permissions.Anyone, async ({ submissions: values }) => {
  const clean = {};
  Object.keys(values || {}).forEach((key) => {
    if (!ALLOWED.has(key)) return;
    const v = values[key];
    if (FILE_FIELDS.has(key)) {
      if (!Array.isArray(v)) return;
      clean[key] = v.filter((f) => f && typeof f.url === 'string' && f.url.indexOf('wix:') === 0);
      return;
    }
    clean[key] = v;
  });

  try {
    // Wix checks the values against the form's own rules and required fields.
    const created = await elevate(submissions.createSubmission)({ formId: FORM_ID, submissions: clean });
    return { ok: true, id: created._id };
  } catch (err) {
    console.error('AHF enrollment submit failed', err && err.message, JSON.stringify(err && err.details || {}));
    return { ok: false, error: (err && err.message) || 'Submit failed' };
  }
});
