/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const DotEnv = require("dotenv");
const Express = require("express");
const Path = require("path");
const Schedule = require("node-schedule");
const Sentry = require("@sentry/node");

const Database = require("./lib/database");
const DataImporter = require("./lib/dataImporter");
const InterventionCounter = require("./lib/interventionCounter");
const ValueFormatter = require("./helpers/valueFormatter");

const config = require("./config/interventions.json");
DotEnv.config();

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

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
    .use(Sentry.Handlers.requestHandler())
    .use(Express.static(Path.join(__dirname, "public")))
    .set("views", Path.join(__dirname, "views"))
    .set("view engine", "ejs")
    .get("/", async (req, res) => {
      let latestCount = await database.getLatestCounts();
      res.render("pages/dashboard", { counts: latestCount["counters"] });
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
    .use((req, res) => res.status(404).render("pages/404"))
    .use(Sentry.Handlers.errorHandler())
    .listen(port, () => console.log(`Listening on port ${port}`));
})();
