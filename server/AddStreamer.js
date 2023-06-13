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

async function getStreamerId(name, clientId, accessToken) {
  const url = `${TWITCH_API_BASE_URL}/users?login=${name}`;
  const headers = {
    'Client-ID': clientId,
    'Authorization': `Bearer ${accessToken}`
  };
  const response = await fetch(url, { headers });
  const data = await response.json();
  if (data.data.length > 0) {
    const user = data.data[0];
    return user.id;
  } else {
    return null;
  }
}

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('Usage: node AddStreamer.js <name>');
    process.exit(1);
  }

  const { ids, twitchClientId, twitchAccessToken } = await readConfigFile();
  const id = await getStreamerId(name, twitchClientId, twitchAccessToken);
  if (id && !ids.includes(id)) {
    ids.push(id);
    await writeConfigFile({ ids, twitchClientId, twitchAccessToken });
    console.log(`Added ${name} (${id}) to config`);
  } else {
    console.log(`${name} not found or already in config`);
  }
}

main().catch(console.error);