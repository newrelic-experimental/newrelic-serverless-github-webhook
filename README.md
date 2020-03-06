[![New Relic Experimental header](https://github.com/newrelic/open-source-office/raw/master/examples/categories/images/Experimental.png)](https://github.com/newrelic/open-source-office/blob/master/examples/categories/index.md#new-relic-experimental)

# newrelic-serverless-github-webhook
Function to move GitHub webhook events to NRDB using the Insights Collector endpoint.


# Usage

```bash
# if you don't have serverless installed
npm install -g serverless
git clone https://github.com/newrelic-experimental/newrelic-serverless-github-webhook.git
cd newrelic-serverless-github-webhook/github-to-newrelic
npm install
serverless deploy
```

You'll need to configure the following fields in your serverless environment
- NEW_RELIC_INSERT_KEY: [New Relic Events Insert API key](https://docs.newrelic.com/docs/insights/insights-data-sources/custom-data/introduction-event-api)
- NEW_RELIC_ACCOUNT_ID: [New Relic Account Id](https://docs.newrelic.com/docs/accounts/install-new-relic/account-setup/account-id)
- GITHUB_WEBHOOK_SECRET: [Setting a Secret shared between the serverless function and your GitHub webhook configuration](https://developer.github.com/webhooks)
- (optional) NEW_RELIC_EVENT_TYPE: Name the event to your liking
- (optional) NEW_RELIC_EVENT_COLLECTOR: Set the event collector endpoint (defaults to insights-collector.newrelic.com)

# Querying the Data

- Login to New Relic One
- Open the Chart Builder
- Query the chosen event type (default: `SELECT * from GithubEvent`)
