/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Client } = require("pg");

class Database {
  constructor() {
    this._client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL,
    });
  }

  async connect() {
    await this._client.connect();

    /**
     * This table holds interventions multiple time: once per distribution
     * channel. While we could normalize this away, just having it this way
     * reduces the amount of complexity. However, this is something for
     * future iterations, if we decide to add more things to this dashboard.
     */
    await this._client.query(`CREATE TABLE IF NOT EXISTS interventions (
      id SERIAL PRIMARY KEY,
      key VARCHAR(1024),
      type VARCHAR(1024),
      distribution VARCHAR(1024),
      platform VARCHAR(1024),
      domain VARCHAR(1024),
      bug VARCHAR(1024)
    );`);

    /**
     * As above, this table shouldn't really hold all the counters inside a
     * JSON blob, but rather be normalized into two tables. However, there
     * are multiple motivations for keeping the history that way: it's easier
     * to export and re-use in other projects, and it heavily reduces the amount
     * of rows stored in the table, which is relevant in our setup.
     */
    await this._client.query(`CREATE TABLE IF NOT EXISTS history (
      id SERIAL PRIMARY KEY,
      datetime TIMESTAMP WITH TIME ZONE,
      counters JSON
    );`);
  }

  async storeCurrentInterventions(data) {
    /**
     * As we only keep the current interventions in the interventions table,
     * we have to clear the table before we can add the imported data. To
     * avoid a gap in data availability in the frontend, and to make sure we
     * don't end up with NaNs in the case of an importing error, let's do
     * everything in a transaction that allows us to rollback if needed.
     */
    try {
      await this._client.query("BEGIN");
      await this.truncateInterventions();

      for (let distribution in data) {
        for (let type in data[distribution]) {
          for (let intervention of data[distribution][type]) {
            await this.storeIntervention(distribution, type, intervention);
          }
        }
      }

      await this._client.query("COMMIT");
    } catch (_) {
      await this._client.query("ROLLBACK");
    }
  }

  async truncateInterventions() {
    await this._client.query("TRUNCATE TABLE interventions;");
  }

  async storeIntervention(distribution, type, data) {
    return await this._client.query(
      "INSERT INTO interventions(key, type, distribution, platform, domain, bug) VALUES($1, $2, $3, $4, $5, $6);",
      [
        data["id"],
        type,
        distribution,
        data["platform"],
        data["domain"],
        data["bug"],
      ]
    );
  }

  async storeCounters(counters) {
    return await this._client.query(
      "INSERT INTO history(datetime, counters) VALUES(CURRENT_TIMESTAMP, $1);",
      [JSON.stringify(counters)]
    );
  }

  async countActiveInterventions() {
    let result = await this._client.query(
      "SELECT count(*) FROM interventions;"
    );

    return result.rows[0].count;
  }

  async getLatestCounts() {
    let result = await this._client.query(
      "SELECT * FROM history ORDER BY datetime DESC LIMIT 1"
    );

    return result.rows[0];
  }

  async getInterventionsForDistribution(distribution) {
    let result = await this._client.query(
      "SELECT * FROM interventions WHERE distribution = $1 ORDER BY lower(domain) ASC;",
      [distribution]
    );

    return result.rows;
  }
}

module.exports = Database;
