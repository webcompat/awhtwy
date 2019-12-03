/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const DataLoader = require("./dataLoader");

class DataImporter {
  constructor(interventionsConfig) {
    this._config = interventionsConfig;
  }

  async run() {
    let data = {};

    for (let distribution of this._config["distributions"]) {
      data[distribution] = {};

      for (let type of this._config["types"]) {
        let url = this._config["sources"][distribution][type];
        let loader = new DataLoader(url);

        data[distribution][type] = await loader.run();
      }
    }

    return data;
  }
}

module.exports = DataImporter;
