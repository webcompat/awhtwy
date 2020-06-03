/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Fetch = require("node-fetch");
const VM = require("vm");

class DataLoader {
  constructor(url) {
    this._url = url;
  }

  async run() {
    console.debug(`Fetching and importing ${this._url}...`);
    let payload = await Fetch(this._url).then((res) => res.text());

    /**
     * Hi there, random person looking at this piece of source code. Welcome!
     *
     * The following line is source *you should not copy* for your own project,
     * unless you absolutely know what it is doing. Esentially, this function
     * is loading a piece of JavaScript from any HTTP(s) URL, and executing it
     * inside NodeJS. This is, esentially, a by-design Remote Code Execution
     * vulnearbility.
     *
     * It's fine in this case, as we only ever use this function to load URLs
     * from sources we know and we trust. We load sources from our own code
     * repositories, and if any of the files there are compromised, us running
     * it here is the least of our concerns, as our CI infrastructure would
     * run it as well, and that would be a much more critical issue. However,
     * I'll repeat, this is a dangerous thing to do, so keep it in mind when
     * looking at this.
     *
     * Also note that we're providing the file with an empty module object, as
     * well as overriding require() with a function that always returns a
     * function that returns an empty array. This is not a security measure,
     * although it blocks the JS from running any NodeJS-native libraries,
     * this is done to allow the UserAgent and Injection configs to use
     * libraries that dynamically generates match patterns - which we have a
     * few. This should be considered a temporary workaround, until we have
     * figured out something nicer.
     */
    let data = VM.runInNewContext(payload, {
      module: {},
      require: () => () => [],
      InterventionHelpers: {
        matchPatternsForGoogle: () => [],
        matchPatternsForTLDs: () => [],
      },
    });

    return data.filter((intervention) => intervention["bug"] != "0000000");
  }
}

module.exports = DataLoader;
