import { readFile, writeFile } from 'node:fs/promises';
import fetch from 'node-fetch';

const CONFIG_FILE = 'config.json';
const TWITCH_API_BASE_URL = 'https://api.twitch.tv/helix';

async function readConfigFile() {
  const data = await readFile(CONFIG_FILE);
  const config = JSON.parse(data);
  return config;
}

async function writeConfigFile(config) {
  const data = JSON.stringify(config, null, 2);
  await writeFile(CONFIG_FILE, data);
}

async function getStreamerId(names, clientId, accessToken) {
  const url = `${TWITCH_API_BASE_URL}/users?login=${names.join('&login=')}`;
  const headers = {
    'Client-ID': clientId,
    'Authorization': `Bearer ${accessToken}`
  };
  const response = await fetch(url, { headers });
  const data = await response.json();
  const users = data.data;
  const idMap = {};
  for (const user of users) {
    idMap[user.login] = user.id;
  }
  return idMap;
}

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('Usage: node AddStreamer.js <name>');
    process.exit(1);
  }

  const { names, twitchClientId, twitchAccessToken } = await readConfigFile();
  const ids = await getStreamerId(names, twitchClientId, twitchAccessToken);
  await writeConfigFile({ ids, twitchClientId, twitchAccessToken });
  console.log(`import done`);
}

main().catch(console.error);