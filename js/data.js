/*
 * Backup copy of the price data. The page uses the CSV files in the data folder (or a Google Sheet);
 * this copy is only used if those can't be read, so the page never goes blank.
 * Each block is the same as one CSV file. Update with: npm run sync-backup
 *
 * SAMPLE DATA: only the Full Page Pop Out Insert at 10,000 homes is a real price.
 */
(function (root) {
  'use strict';

  var data = {
    // Option, Size, Paper, then one column per price break (homes per mailing) with the price per home.
    prices: `
Option,Size,Paper,2500,5000,10000,25000,50000,100000
Bookmark Pop Out Insert,3.5" x 8.5",2-sided 100# gloss cover,0.119,0.105,0.095,0.086,0.078,0.071
Full Page Pop Out Insert,8.375" x 10.875",2-sided 70# gloss,0.229,0.205,0.187,0.169,0.152,0.139
4-Page Booklet Insert,8.375" x 10.875","4 pages, folded, 70# gloss",0.349,0.315,0.289,0.262,0.238,0.219
Direct Mailers,6" x 9",2-sided 14 pt gloss cover,0.459,0.429,0.405,0.385,0.369,0.355
Direct Mailers,6" x 11",2-sided 14 pt gloss cover,0.499,0.465,0.439,0.418,0.399,0.385
Direct Mailers,8.5" x 11",2-sided 14 pt gloss cover,0.579,0.539,0.509,0.485,0.465,0.449
`,

    // ZIP, City, County, Homes delivered in that ZIP.
    zips: `
ZIP,City,County,Homes
33004,Dania Beach,Broward,6200
33009,Hallandale Beach,Broward,9800
33019,Hollywood,Broward,5400
33020,Hollywood,Broward,8700
33021,Hollywood,Broward,10300
33023,Miramar,Broward,11900
33024,Pembroke Pines,Broward,13200
33026,Pembroke Pines,Broward,9100
33401,West Palm Beach,Palm Beach,7600
33405,West Palm Beach,Palm Beach,6900
33406,West Palm Beach,Palm Beach,8200
33411,Royal Palm Beach,Palm Beach,14800
33414,Wellington,Palm Beach,12600
33012,Hialeah,Miami-Dade,15400
33015,Miami Gardens,Miami-Dade,13700
33016,Hialeah Gardens,Miami-Dade,9500
`,

    // Setting, Value. "N mailings discount %" rows set the mailing choices; add or remove rows freely.
    settings: `
Setting,Value
Setup & prepress fee,49
Sales tax %,7
Rush production %,15
Minimum homes,2500
3 mailings discount %,5
6 mailings discount %,10
12 mailings discount %,15
`,

    // Code, Discount ("10%" off the ad, or "$49" off the order), Description shown to the customer.
    promos: `
Code,Discount,Description
WELCOME10,10%,10% off your ad
SETUPFREE,$49,Free setup
`,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.MailData = data;
})(typeof window !== 'undefined' ? window : this);
