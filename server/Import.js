//take a JSON file of streamer names or urls and 
// import them into the config file as twitch streamer id numbers

import { readFile, writeFile } from 'node:fs/promises';
import fetch from 'node-fetch';

const BASE_DIRECTORY = `${process.env.HOME}/webdev_repositories_personal/twitch_live_alert/`;
const CONFIG_FILE = `${BASE_DIRECTORY}/config/config.json`;
const TWITCH_API_BASE_URL = 'https://api.twitch.tv/helix';

async function readConfigFile() {
  // to implement: handle errors
  const data = await readFile(CONFIG_FILE);
  const config = JSON.parse(data);
  return config;
}

async function readNameFile(NameFile) {
  // to implement: handle errors
  let data = await readFile(NameFile);
  data = data.toString();
  let names = data.split('\n');
  // extract the streamer name from the URL if it's a URL
  names = names.map( (nameLine) => {
    const nameArr = nameLine.split('/');
    return nameArr[nameArr.length - 1];
  });
  // strip out any empty lines
  names = names.filter( (nameLine) => { 
    return nameLine.length > 0;
  });
  return names;
}

async function writeConfigFile(config) {
  const data = JSON.stringify(config, null, 2);
  await writeFile(CONFIG_FILE, data);
}

// take a list of streamer names and return a map of names to ids
async function getStreamerId(names, clientId, accessToken) {
  const url = `${TWITCH_API_BASE_URL}/users?login=${names.join('&login=')}`;
  const headers = {
    'Client-ID': clientId,
    'Authorization': `Bearer ${accessToken}`
  };
  const response = await fetch(url, { headers });
  // to implement: handle errors
  const data = await response.json();
  let users = data.data;
  //convert data to a map of names to ids
  users = users.map( (userItem) => {
    return userItem.id;
    
  });
  return users;
}

async function main() {
  const nameFile = process.argv[2];
  if (!nameFile) {
    console.error('Usage: node Import.js <filename>');
    process.exit(1);
  }

  const { oldids, twitchClientId, twitchAccessToken } = await readConfigFile();
  const names = await readNameFile(nameFile);
  // this will overwrite old ids
  const ids = await getStreamerId(names, twitchClientId, twitchAccessToken);
  // to implement: handle errors
  await writeConfigFile({ ids, twitchClientId, twitchAccessToken });
  console.log(`import done`);
}

main().catch(console.error);