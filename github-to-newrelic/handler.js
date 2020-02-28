'use strict';
const http = require('https');
const crypto = require('crypto');
const flatten = require('flat');

function signRequestBody(key, body) {
  return `sha1=${crypto.createHmac('sha1', key).update(body, 'utf-8').digest('hex')}`;
}

module.exports.webhook = async (event, context, callback) => {

  var errMsg; // eslint-disable-line
  const token = process.env.GITHUB_WEBHOOK_SECRET;
  const headers = event.headers;
  const sig = headers['X-Hub-Signature'];
  const githubEvent = headers['X-GitHub-Event'];
  const id = headers['X-GitHub-Delivery'];
  const calculatedSig = signRequestBody(token, event.body);

  if (typeof token !== 'string') {
    errMsg = 'Must provide a \'GITHUB_WEBHOOK_SECRET\' env variable';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  if (!sig) {
    errMsg = 'No X-Hub-Signature found on request';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  if (!githubEvent) {
    errMsg = 'No X-Github-Event found on request';
    return callback(null, {
      statusCode: 422,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  if (!id) {
    errMsg = 'No X-Github-Delivery found on request';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  if (sig !== calculatedSig) {
    errMsg = 'X-Hub-Signature incorrect. Github webhook token doesn\'t match';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  /* eslint-disable */
  console.log('---------------------------------');
  console.log(`Github-Event: "${githubEvent}" with action: "${event.body.action}"`);
  console.log('---------------------------------');
  console.log('Payload', event.body);
  /* eslint-enable */

  // Do custom stuff here with github event data
  // For more on events see https://developer.github.com/v3/activity/events/types/

  const body = event.body;

  const options = {
      hostname: process.env['NEW_RELIC_EVENT_COLLECTOR'] || 'insights-collector.newrelic.com',
      path: `/v1/accounts/${process.env['NEW_RELIC_ACCOUNT_ID']}/events`,
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'X-Insert-Key': process.env['NEW_RELIC_INSERT_KEY']
      }
  }

  const eventType = process.env['NEW_RELIC_EVENT_TYPE'] || 'GitHub'

  const payload = flatten(body);
  payload.eventType = eventType;

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
        var responseBody = '';
        res.on('data',(chunk) => responseBody = responseBody += chunk);
        res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: responseBody
                });
        });
    });

    req.on('error', (e) => {
      reject(`Insights insert request failed: ${e}`);
    });

    // write data to request body
    req.write(JSON.stringify(payload));
    req.end();

  });
};
