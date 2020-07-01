/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

module.exports = {
  VALID_DATE: /[0-9]{4}-[0-9]{2}-[0-9]{2}/,

  parseDateString: function (dateStr, asEndOfDay = false) {
    if (dateStr.match(this.VALID_DATE)) {
      try {
        let [year, month, day] = dateStr.split("-");
        if (asEndOfDay) {
          return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        } else {
          return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        }
      } catch (error) {
        console.error("Failed to parse date: ", error);
        return false;
      }
    }

    return false;
  },
};
