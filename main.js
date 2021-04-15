/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const DotEnv = require("dotenv");
const Express = require("express");
const Path = require("path");
const Schedule = require("node-schedule");

const Database = require("./lib/database");
const DataImporter = require("./lib/dataImporter");
const DateHelpers = require("./helpers/dateHelpers");
const HistoryFormatter = require("./helpers/historyFormatter");
const InterventionCounter = require("./lib/interventionCounter");
const ValueFormatter = require("./helpers/valueFormatter");

const config = require("./config/interventions.json");
DotEnv.config();

async function runImportAndCount(config, database) {
  let data = await new DataImporter(config).run();
  await database.storeCurrentInterventions(data);

  // The counter has side effects. It mutates the data object coming in, and
  // since JS does not support native deep-copying objects, let's just agree on
  // not touching the order of execution here.
  let counters = new InterventionCounter(config, data).run();
  await database.storeCounters(counters);
}

(async () => {
  let database = new Database();
  await database.connect();

  // Run the automatic importer once a day, at midnight. That's frequent enough
  // to not lag too far behind current development, but rare enoough to have
  // meaningful history without downscaling measurements. :)
  Schedule.scheduleJob("0 0 0 * * *", async () => {
    await runImportAndCount(config, database);
  });

  // If there are no active interventions, let's run a full import first. This
  // helps bootstrapping the empty database and have the dashboard up and
  // running immediately.
  if ((await database.countActiveInterventions()) < 1) {
    await runImportAndCount(config, database);
  }

  // Express is used for serving the dashboard itself. We have both the tracking
  // and the dashboard in the same application to make deployment simple, and
  // to only have a single node process running at all times.
  let port = process.env.PORT || 5000;
  Express()
    .use(Express.static(Path.join(__dirname, "public")))
    .set("views", Path.join(__dirname, "views"))
    .set("view engine", "ejs")
    .get("/", async (req, res) => {
      let latestCount = await database.getLatestCounts();
      res.render("pages/dashboard", { counts: latestCount["counters"] });
    })
    .get("/refresh", async (req, res) => {
      await runImportAndCount(config, database);

      res.writeHead(302, { Location: "/" });
      res.end();
    })
    .get("/list/:distribution", async (req, res) => {
      let distribution = req.params.distribution;
      if (!config["distributions"].includes(distribution)) {
        return res.status(404).render("pages/404");
      }

      let interventions = await database.getInterventionsForDistribution(
        distribution
      );

      interventions = interventions.map(ValueFormatter);

      res.render("pages/list", {
        distribution: distribution,
        interventions: interventions,
      });
    })
    .get("/data.json", async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
      res.setHeader("Content-Type", "application/json");

      let startDate = req.query.start;
      let endDate = req.query.end;
      let distribution = req.query.distribution;
      let type = req.query.type;

      if (!startDate || !startDate.match(DateHelpers.VALID_DATE)) {
        let today = new Date();
        startDate = new Date(today.getFullYear(), 0, 1);
      } else {
        startDate = DateHelpers.parseDateString(startDate);
      }

      if (!endDate || !endDate.match(DateHelpers.VALID_DATE)) {
        let today = new Date();
        endDate = new Date(
          Date.UTC(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            23,
            59,
            59,
            999
          )
        );
      } else {
        endDate = DateHelpers.parseDateString(endDate, true);
      }

      if (!distribution || !config["distributions"].includes(distribution)) {
        return res
          .status(400)
          .end('{"error": "distribution parameter unset or invalid!"}');
      }

      if (!type || !(config["types"].includes(type) || type == "all")) {
        return res
          .status(400)
          .end('{"error": "type parameter unset or invalid!"}');
      }

      let data = await database.getHistoricalData(
        startDate,
        endDate,
        distribution
      );
      res.end(JSON.stringify(data.map((row) => HistoryFormatter(row, type))));
    })
    .use((req, res) => res.status(404).render("pages/404"))
    .listen(port, () => console.log(`Listening on port ${port}`));
})();
