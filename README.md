# areWeHotfixingTheWebYet.com

"Are We Hotfixing the Web Yet" is a small dashboard that shows the current state of deployed (and not deployed) site interventions [shipping in the Web Compatbility GoFaster system add-on](https://wiki.mozilla.org/Compatibility/Go_Faster_Addon).

At the moment, it's relatively simple. Counters for all relevant distributions and platforms are available, as well as a detailed list allowing a quick overview of deployed interventions.

## Data update

The data is updated once a day, at midnight, via a in-process running scheduled task. Data is gathered by downloading the current definition files from inside the addon's source code locations, storing the values into a Postgres database.

## Historical data

In addition to displaying the current values, we store historical measurements generated once a day. These records only include the number of interventions per distribution, type, and platform, but that data is enough to gather insight into how we work with interventions over time.

Note that, at this point, data is only gathered, but not exposed. If we gather enough data, we'll add a JSON endpoint to grab historical records.

## Deployment

This project was designed to be run on Heroku with the Postgres addon active. Other depolyment targets are supported, as long as there is a recent version of Node.js and a Postgres server available. `.env.example` highlights available environment variables.

For Heroku, make sure that the connection to the database server is made over SSL:

```
heroku config:set DATABASE_SSL=true
```

## License

MPL.
