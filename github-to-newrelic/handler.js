'use strict';
const http = require('https');
const crypto = require('crypto');
const flatten = require('flat');

function signRequestBody(key, body) {
  return `sha1=${crypto.createHmac('sha1', key).update(body, 'utf-8').digest('hex')}`;
}

/**
 * There are a number of fields in the GitHub event payload that we don't need, so let's not send them.
 * @param {Object} obj - flattened event object
 */
function prune_object(obj) {
  Object.keys(obj).forEach(k => {
    /*
    remove most url fields
    remove flag fields (contains has or is)
    if the value if empty or null
    */
    if ((k.indexOf("url") > -1 && k.indexOf(".url") == -1)
        || k.startsWith("has")
        || k.startsWith("is")
        || obj[k] === null
        || obj[k] === "") {
      delete obj[k];
    }
    //convert arrays to json
    if (typeof obj[k] == 'object') {
      obj[k] = JSON.stringify(obj[k]);
    }
    //convert booleans to 1's and 0's
    if (typeof obj[k] == 'boolean') {
      obj[k] = obj[k] ? 1 : 0;
    }
  });
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
  } else {

  }

  const bodyText = decodeURIComponent(event.body.substring("payload=".length));

  /* eslint-disable */
  //console.log('---------------------------------');
  //console.log(`Github-Event: "${githubEvent}"`);
  //console.log('---------------------------------');
  //console.log(typeof bodyText);
  //console.log('Payload', bodyText);
  /* eslint-enable */

  // Do custom stuff here with github event data
  // For more on events see https://developer.github.com/v3/activity/events/types/

  const options = {
      hostname: process.env['NEW_RELIC_EVENT_COLLECTOR'] || 'insights-collector.newrelic.com',
      path: `/v1/accounts/${process.env['NEW_RELIC_ACCOUNT_ID']}/events`,
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'X-Insert-Key': process.env['NEW_RELIC_INSERT_KEY']
      }
  }

  const eventType = process.env['NEW_RELIC_EVENT_TYPE'] || 'GithubEvent'

  const body = JSON.parse(bodyText);

  const payload = flatten(body);
  payload.eventType = eventType;
  payload.timestamp = (new Date()).getTime();
  prune_object(payload);

  /* eslint-disable */
  //console.log('---------------------------------');
  //console.log(eventType, payload);
  //console.log('---------------------------------');
  /* eslint-enable */

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