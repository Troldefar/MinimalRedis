const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');
const app = express();

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const client = redis.createClient(REDIS_PORT);

// Handle response
function setResponse(username, repos) {
  return `
    <h1>
      ${username.charAt(0).toUpperCase() + username.slice(1, username.length)}
    </h1>
    <p>
      Amount of public repos: ${repos}
    </p>
  `;
}

// Fetch
async function getRepos(req, res, next) {
  try {
    console.log("Fetching data");
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data     = await response.json();
    const repos    = data.public_repos;
    // REDIT: SET
    client.setex(username, 3600, repos);
    res.send(setResponse(username, repos));
  } catch (e) {
    console.log("ERROR: ", e);
    res.status(500);
  }
}

// Cache middleware function
function cacheMiddleware(req, res, next) {
  const { username } = req.params;
  client.get(username, (error, data) => {
    if(error) throw error;
    if(data) {
      console.log("Data is already present");
      res.send(setResponse(username, data));
    } else {
      console.log("Data is not present");
      next();
    }
  });
}

app.get('/', (req, res, next) => {
  res.send("World");
})

app.get('/repos/:username', cacheMiddleware, getRepos);

app.listen(PORT, () => {
  console.log(`App listening on ${PORT}`);
});