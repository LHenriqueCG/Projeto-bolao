const functions = require('firebase-functions');
const https = require('https');

exports.footballProxy = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  const options = {
    hostname: 'api.football-data.org',
    path: '/v4/competitions/WC/matches?status=FINISHED',
    headers: { 'X-Auth-Token': 'a41012c521d44be98b1a9792c557e175' }
  };

  https.get(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      res.set('Content-Type', 'application/json');
      res.status(200).send(data);
    });
  }).on('error', (e) => {
    res.status(500).send(JSON.stringify({ error: e.message }));
  });
});
