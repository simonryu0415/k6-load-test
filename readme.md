# Performance Testing with K6

> Load testing workshop, demonstrating k6

### Prerequisite
- docker
- ngrok

## Run locally 
- `docker-compose up -d influxdb grafana`
- Load http://localhost:3000, and import the `grafana_dashboard.json` config to a new dashboard.
- `docker-compose run k6 run /tests/01-zone.js`

## Run via github action
- `ngro http 8086`: connect port to influxdb
- Trigger the workflow via push or manual dispatch
- Load http://localhost:3000, and import the `grafana_dashboard.json` config to a new dashboard.

## Run on Cloud

- Create an account with LoadImpact here to use the cloud run: [https://app.loadimpact.com/account/login](https://app.loadimpact.com/account/login)
- Replace `LI_TOKEN` in the `Dockerfile` with your account token.
- `docker-compose run k6 cloud /tests/01-simple/test.js` to run the test in the cloud

Look through the k6 docs here: https://support.loadimpact.com/4.0/

## References 
- https://github.com/cajames/performance-testing-with-k6
- https://www.youtube.com/watch?v=Xyq6GItCAvY&t=1663s&ab_channel=k6