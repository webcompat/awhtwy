/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function objectSum(counters) {
  return Object.values(counters).reduce((a, b) => {
    for (let key in b) {
      if (b.hasOwnProperty(key)) a[key] = (a[key] || 0) + b[key];
    }
    return a;
  }, {});
}

module.exports = (row, type) => {
  if (type == "all") {
    row.counters = objectSum(row.counters);
  } else {
    row.counters = row.counters[type];
  }

  return row;
};
