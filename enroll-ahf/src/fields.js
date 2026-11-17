/*
 * AHF contractor enrollment: form definition.
 *
 * Every `t` (target) below is the field key of the live Wix form
 * "Enrollment (FFC)" (form id 5872b652-a4ff-401f-b02b-7f4f0799fc62).
 * Submissions are written into that same Wix form, so whatever already
 * copies Wix submissions into Smartsheet keeps working unchanged.
 * Do not rename a target unless you rename it in Wix too.
 */
(function (root) {
  'use strict';

  var STATES = [
    ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
    ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'],
    ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'],
    ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
    ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
    ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
    ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
    ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
    ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
    ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'],
    ['WY', 'Wyoming']
  ];
  // The Wix "license state" dropdown only accepts the 50 states (no DC).
  var LICENSE_STATES = STATES.filter(function (s) { return s[0] !== 'DC'; }).map(function (s) { return s[1]; });

  var PRODUCTS = [
    'Addition', 'Aluminum Pool Enclosures', 'Awnings / Patio Cover', 'Basement', 'Bathroom Remodeling',
    'Boat Docks & Piers', 'Brick & Stone Work', 'Cabinets & Refacing', 'Carpet & Flooring',
    'Chimney / Chimney Liner', 'Concrete & Paving', 'Custom Closets', 'Deck', 'Drain Line Repair / Replacement',
    'Drywall', 'Electrical Work', 'Exterior', 'Fencing', 'Foundation / Seawall Repair', 'Garage Doors',
    'Garage Floor Epoxy', 'Gas Work', 'Gazebo', 'Generator', 'Gutters / Gutter Protection', 'HVAC System',
    'Home Theater (Indoor)', 'Hurricane Protection', 'Insulation', 'Kitchen Remodeling',
    "Lanai's and Screen Enclosures", 'Landscaping', 'Lighting - Indoor', 'Painting', 'Pools', 'Windows & Doors',
    "I don't see my industry listed"
  ];

  var DOCUMENTS = [
    'Business Liability Insurance/Bonding (required for home improvement contractors)',
    'Business License/Registration (required depending on state)',
    "Contractor's/Installer's License (required depending on state)",
    'Voided Business Check (required)'
  ];

  var TEXT = {
    ssn: 'Missing, invalid or frozen SSNs delay processing. The SSN is used for verification and compliance and for a soft inquiry on the owner’s credit report, which does not affect their credit score.',
    licensing: 'Documentation of business licenses/registrations, contractor’s licenses or professional registrations is required for ALL STATES you intend to do financed business in. Some states require businesses that offer financing to be registered with them; proof of this registration is required before the first approved loan is funded.',
    authorize: 'By checking this box, I agree that for the purpose of establishing and maintaining a relationship with America Home Financial, the AHF Finance Program and its affiliate lenders, I hereby authorize America Home Financial, the AHF Finance Program, and its affiliate lenders to make all investigations deemed necessary, including but not limited to obtaining credit reports of any owner or principal of the dealer and obtaining other relevant information from or through third-party sources.',
    consent: 'By submitting an application, you expressly consent and agree to receive communications (including but not limited to prerecorded or artificial voice message calls, text messages, and calls made by an automatic telephone dialing system) from America Home Financial, the AHF Finance Program, its lending network affiliates and any party acting on its behalf, regarding of any partially or fully completed application that you submit or attempt to submit to America Home Financial, the AHF Finance Program, its lending network affiliates, any account that you establish with America Home Financial, the AHF Finance Program, its lending network affiliates, and any proposed or completed transaction associated with your account, at any telephone number that you provide to the America Home Financial or that America Home Financial, its lending network affiliates can reasonably associate with you, now and in the future, including cellular telephone numbers. America Home Financial, its lending network affiliates may also communicate to you via e-mail, fax, U.S. mail, or any other method allowed by law that does not require your consent, understands and agrees that America Home Financial, the AHF Finance Program, its lending network affiliates may monitor, record and retain any communications between Contractor and America Home Financial, the AHF Finance Program, its lending network affiliates (and their respective representatives) for quality assurance and other permitted business purposes.'
  };

  /*
   * Owner field keys in the Wix form. They are not numbered consistently
   * (Owner 1's email is email_79a5_2, Owner 2's is email_79a5_1, ...),
   * so they are listed explicitly per owner, exactly as Wix labels them.
   */
  var OWNERS = [
    { name: 'first_and_last_name_1', email: 'email_79a5_2', phone: 'personal_phone_number_1', pct: 'percentage_of_business_owned_1', dob: 'date_of_birth_2', ssn: 'social_security_number',   address: 'multi_line_address_eea5', signature: 'signature_37ce', agree: 'form_field_0510' },
    { name: 'first_and_last_name_2', email: 'email_79a5_1', phone: 'personal_phone_number',   pct: 'percentage_of_business_owned',   dob: 'date_of_birth_1', ssn: 'social_security_number_1', address: 'multi_line_address_6e5b', signature: 'signature_6f86', agree: 'form_field_511' },
    { name: 'first_and_last_name_3', email: 'email_79a5_3', phone: 'personal_phone_number_2', pct: 'percentage_of_business_owned_2', dob: 'date_of_birth_3', ssn: 'social_security_number_2', address: 'multi_line_address_7eb5', signature: 'signature_a427', agree: 'form_field_512' },
    { name: 'first_and_last_name_4', email: 'email_79a5_4', phone: 'personal_phone_number_3', pct: 'percentage_of_business_owned_3', dob: 'date_of_birth_4', ssn: 'social_security_number_3', address: 'home_address_4',          signature: 'signature_afdc', agree: 'form_field_9e91' }
  ];

  function ownerCount(v) { return parseInt(v.how_many_owners_are_there, 10) || 0; }
  function ownerShown(i) { return function (v) { return ownerCount(v) > i; }; }

  function ownerFields(i) {
    var o = OWNERS[i], n = i + 1, show = ownerShown(i);
    return {
      title: 'Owner ' + n, owner: i, showIf: show,
      fields: [
        { t: o.name, label: 'First and last name', type: 'text', req: true, width: 'half', autocomplete: 'off' },
        { t: o.pct, label: 'Percentage of business owned', type: 'percent', req: true, width: 'half' },
        { t: o.email, label: 'Email', type: 'email', req: true, width: 'half' },
        { t: o.phone, label: 'Mobile phone', type: 'tel', req: true, width: 'half' },
        { t: o.dob, label: 'Date of birth', type: 'dob', req: true, width: 'half', help: 'Owners must be 18 or older.' },
        { t: o.ssn, label: 'Social Security number', type: 'ssn', req: true, width: 'half', help: TEXT.ssn },
        { t: o.address, label: 'Home address', type: 'address', req: true, full: true }
      ].map(function (f) { f.showIf = show; f.ownerLabel = 'Owner ' + n + ': ' + f.label; return f; })
    };
  }

  var STEPS = [
    {
      id: 'business', title: 'Business', heading: 'Tell us about your business',
      intro: 'Takes about 10 minutes. Have your contractor license number and owner details handy.',
      sections: [{
        fields: [
          { t: 'company_name_a1d8', label: 'Company name', type: 'text', req: true, autocomplete: 'organization' },
          { t: 'dba', label: 'DBA (doing business as)', type: 'text', help: 'Only if it differs from your company name.' },
          { t: 'business_structure', label: 'Business structure', type: 'select', req: true, width: 'half',
            opts: ['Corporation', 'Limited Liability Corporation', 'Partnership', 'Sole Proprietorship'] },
          { t: 'year_business_started', label: 'Year business started', type: 'year', req: true, width: 'quarter' },
          { t: 'number_of_locations', label: 'Locations', type: 'int', req: true, width: 'quarter', min: 1 },
          { t: 'business_address', label: 'Business address', type: 'address', req: true, full: true },
          { t: 'main_company_phone_number', label: 'Main company phone', type: 'tel', req: true, width: 'half', autocomplete: 'tel' },
          { t: 'company_website', label: 'Company website', type: 'url', req: true, width: 'half', placeholder: 'www.example.com' },
          { t: 'business_email', label: 'Business email', type: 'email', req: true, width: 'half', autocomplete: 'email' },
          { t: 'e_mail_to_receive_credit_decisions', label: 'Email for credit decisions', type: 'email', req: true, width: 'half',
            help: 'Where we send approvals and declines for your customers.' },
          { t: 'how_did_you_hear_about_america_home_financial', label: 'How did you hear about us?', type: 'select',
            opts: ['Internet', 'Email notification', 'Paper notification', 'Salesperson', 'AHF Call Center', 'Referral', 'Best Deals Book'] }
        ]
      }]
    },
    {
      id: 'people', title: 'Contact & owners', heading: 'Who should we talk to?',
      sections: [
        {
          title: 'Primary contact',
          fields: [
            { t: 'first_and_last_name', label: 'First and last name', type: 'text', width: 'half', placeholder: 'John Smith', autocomplete: 'name' },
            { t: 'job_title', label: 'Job title', type: 'text', req: true, width: 'half', autocomplete: 'organization-title' }
          ]
        },
        {
          title: 'Owners',
          note: 'List everyone with an ownership stake, up to 4. If there are more than 4 owners, we collect the rest during review.',
          fields: [
            { t: 'how_many_owners_are_there', label: 'How many owners are there?', type: 'segment', req: true, opts: ['1', '2', '3', '4'] }
          ]
        },
        ownerFields(0), ownerFields(1), ownerFields(2), ownerFields(3)
      ]
    },
    {
      id: 'products', title: 'Products & license', heading: 'What you sell and where you’re licensed',
      sections: [
        {
          title: 'Products & services',
          fields: [
            { t: 'what_products_or_services_do_you_sell', label: 'Main product or service', type: 'select', req: true, opts: PRODUCTS },
            { t: 'if_you_would_like_to_add_more_products_and_services_please_list', label: 'Other products or services', type: 'textarea',
              help: 'List anything else you sell, or your industry if it isn’t in the list.' },
            { t: 'list_the_manufacturer_of_these_products', label: 'Manufacturers of these products', type: 'textarea', req: true },
            { t: 'does_your_company_install_the_products_they_sell_if_they_require', label: 'Do you install the products you sell (when installation is needed)?',
              type: 'segment', req: true, opts: ['Yes', 'No'] },
            { t: 'do_you_subcontract', label: 'Does your business subcontract?', type: 'segment', req: true, opts: ['Yes', 'No'] },
            { t: 'list_what_percentage_your_business_subcontracts', label: 'What percentage do you subcontract?', type: 'select', req: true, width: 'half',
              opts: ['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'],
              showIf: function (v) { return v.do_you_subcontract === 'Yes'; } }
          ]
        },
        {
          title: 'Licensing',
          note: TEXT.licensing,
          fields: [
            { t: 'contractor_license_registration_number', label: 'Contractor license / registration number', type: 'text', req: true, width: 'half' },
            { t: 'which_state_do_you_primarily_do_business_in', label: 'State this license is for', type: 'select', req: true, width: 'half', opts: LICENSE_STATES },
            { t: 'if_you_are_licensed_to_do_business_in_more_than_one_state_please', label: 'Licensed in other states?', type: 'textarea',
              help: 'List each state and its license number, e.g. “GA – RBCO001234”.' }
          ]
        }
      ]
    },
    {
      id: 'financing', title: 'Sales & documents', heading: 'Sales volume and documents',
      sections: [
        {
          title: 'Sales & financing',
          note: 'For our records only. This does not affect approval.',
          fields: [
            { t: 'average_annual_residential_sales', label: 'Sales per month', type: 'int', req: true, width: 'half', min: 0, help: 'Total number of sales.' },
            { t: 'average_sale_price', label: 'Average sale price', type: 'money', req: true, width: 'half' },
            { t: 'do_you_currently_have_any_financing_programs', label: 'Do you offer financing today?', type: 'segment', opts: ['Yes', 'No'] },
            { t: 'short_answer_d15c', label: 'Current financing programs', type: 'text', req: true,
              showIf: function (v) { return v.do_you_currently_have_any_financing_programs === 'Yes'; } },
            { t: 'amount_of_sales_financed_in_months', label: 'Sales financed per month', type: 'int', req: true, width: 'half', min: 0,
              showIf: function (v) { return v.do_you_currently_have_any_financing_programs === 'Yes' || !!String(v.short_answer_d15c || '').trim(); } }
          ]
        },
        {
          title: 'Documents',
          note: 'You can upload now or send them later. A voided business check is required before approval.',
          fields: [
            { t: 'which_documents_are_you_ready_to_upload', label: 'Which documents are you ready to upload?', type: 'checks', opts: DOCUMENTS },
            { t: 'file_upload', label: 'Upload documents', type: 'file', req: true, max: 5,
              accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf,.odt,.ppt,.pptx',
              help: 'PDF or Office documents, up to 5 files, 10 MB each.',
              showIf: function (v) { return Array.isArray(v.which_documents_are_you_ready_to_upload) && v.which_documents_are_you_ready_to_upload.length > 0; } }
          ]
        }
      ]
    },
    {
      id: 'review', title: 'Review & sign', heading: 'Review and sign',
      intro: 'Check your answers, then each owner signs below.',
      review: true,
      sections: [0, 1, 2, 3].map(function (i) {
        var o = OWNERS[i], show = ownerShown(i);
        return {
          title: 'Owner ' + (i + 1) + ' signature', owner: i, signer: true, showIf: show,
          fields: [
            { t: o.agree, label: TEXT.authorize, type: 'agree', req: true, showIf: show, ownerLabel: 'Owner ' + (i + 1) + ': I agree' },
            { t: o.signature, label: 'Signature', type: 'signature', req: true, showIf: show, ownerLabel: 'Owner ' + (i + 1) + ' Signature' }
          ]
        };
      })
    }
  ];

  var AHF_FORM = {
    formId: '5872b652-a4ff-401f-b02b-7f4f0799fc62',
    states: STATES,
    owners: OWNERS,
    steps: STEPS,
    text: TEXT
  };

  /** Every field, flattened, with its step index. */
  AHF_FORM.allFields = function () {
    var out = [];
    STEPS.forEach(function (step, si) {
      step.sections.forEach(function (sec) {
        sec.fields.forEach(function (f) { out.push(Object.assign({ step: si, section: sec }, f)); });
      });
    });
    return out;
  };

  /** A field is shown when its own rule and its section's rule both pass. */
  AHF_FORM.isShown = function (f, values) {
    if (f.section && f.section.showIf && !f.section.showIf(values)) return false;
    return !f.showIf || !!f.showIf(values);
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AHF_FORM;
  else root.AHF_FORM = AHF_FORM;
})(this);
