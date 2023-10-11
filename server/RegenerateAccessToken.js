// periodically will need to be run to regenerate access token, secret id is only used here
// probably should only run once per expiration period and copy the json file to any other instances

import { readFile, writeFile } from 'node:fs/promises';
import fetch from 'node-fetch';
import { isDesktopLinux, isAndroidLinux } from './lib/TestEnvironment.js';

const TWITCH_API_BASE_URL = 'https://id.twitch.tv/oauth2/token';
let BASE_DIRECTORY;

if (!isDesktopLinux() && !isAndroidLinux()) {
  console.log('This script is only for desktop Linux or Android Linux');
  process.exit(1);
} else if (isAndroidLinux()) {
  BASE_DIRECTORY = `${process.env.HOME}/.local/opt/twitch_live_alert`;
} else {
  BASE_DIRECTORY = `${process.env.HOME}/webdev_repositories_personal/twitch_live_alert`;
}
const CONFIG_FILE = `${BASE_DIRECTORY}/config/config.json`;
const CLIENT_ID_FILE = `${BASE_DIRECTORY}/config/client_id.txt`;
const CLIENT_SECRET_FILE = `${BASE_DIRECTORY}/config/client_secret.txt`;

async function readConfigFile() {
  // to implement: handle errors
  const data = await readFile(CONFIG_FILE);
  const config = JSON.parse(data);
  return config;
}


async function writeConfigFile(config) {
  const data = JSON.stringify(config, null, 2);
  await writeFile(CONFIG_FILE, data);
}

async function regenerateToken(clientID, clientSecret) {

  const headers = {
    'Content-Type': `application/x-www-form-urlencoded`
  };
  const body = `client_id=${clientID}&client_secret=${clientSecret}&grant_type=client_credentials`;
  const response = await fetch(TWITCH_API_BASE_URL, {
    method: "POST",
    headers: headers, 
    body: body });
  // to implement: handle errors
  const data = await response.json();
  console.log('RESPONSE RAWTEXT:')
  console.log(data);
  const twitchAccessToken = data.access_token;
  return twitchAccessToken;

}

async function main() {

  let clientID = await readFile(CLIENT_ID_FILE);
  clientID = clientID.toString().trimEnd();
  let clientSecret = await readFile(CLIENT_SECRET_FILE);
  clientSecret = clientSecret.toString().trimEnd();

  const config = await readConfigFile();
  // to implement: handle errors
  config.twitchAccessToken = await regenerateToken(clientID, clientSecret);
  await writeConfigFile( config );
  console.log(`token regeneration done`);
}

main().catch(console.error);