/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

class InterventionCounter {
  constructor(interventionsConfig, data) {
    this._config = interventionsConfig;
    this._data = data;
  }

  run() {
    for (let distribution in this._data) {
      for (let type in this._data[distribution]) {
        let counters = {};

        let interventionsPlatform = this._data[distribution][type].map(
          intervention => intervention["platform"]
        );

        for (let platform of this._config["platforms"]) {
          counters[platform] = interventionsPlatform.filter(
            p => p == platform
          ).length;
        }

        this._data[distribution][type] = counters;
      }
    }

    return this._data;
  }
}

module.exports = InterventionCounter;
