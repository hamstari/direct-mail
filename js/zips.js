/*
 * Your distribution ZIP codes. Customers can only pick from this list.
 *
 * One ZIP per line: zip, city, county, homes
 * You can paste straight from a spreadsheet (commas or tabs both work).
 * "homes" is how many homes you deliver to in that ZIP.
 *
 * SAMPLE DATA: replace every line below with your real distribution list.
 */
(function (root) {
  'use strict';

  var zips = `
zip, city, county, homes
33004, Dania Beach, Broward, 6200
33009, Hallandale Beach, Broward, 9800
33019, Hollywood, Broward, 5400
33020, Hollywood, Broward, 8700
33021, Hollywood, Broward, 10300
33023, Miramar, Broward, 11900
33024, Pembroke Pines, Broward, 13200
33026, Pembroke Pines, Broward, 9100
33401, West Palm Beach, Palm Beach, 7600
33405, West Palm Beach, Palm Beach, 6900
33406, West Palm Beach, Palm Beach, 8200
33411, Royal Palm Beach, Palm Beach, 14800
33414, Wellington, Palm Beach, 12600
33012, Hialeah, Miami-Dade, 15400
33015, Miami Gardens, Miami-Dade, 13700
33016, Hialeah Gardens, Miami-Dade, 9500
`;

  if (typeof module !== 'undefined' && module.exports) module.exports = zips;
  else root.MailZips = zips;
})(typeof window !== 'undefined' ? window : this);
