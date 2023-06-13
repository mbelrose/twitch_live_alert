import { readFile } from 'node:fs/promises';
import { exec } from 'child_process';
import fetch from 'node-fetch';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

const CONFIG_FILE = '../config/config.json';
const TWITCH_API_BASE_URL = 'https://api.twitch.tv/helix';
const POLL_INTERVAL_MS = 600000; // 10 minutes

async function readConfigFile() {
  console.log(`Reading config file ${CONFIG_FILE}`);
  const data = await readFile(CONFIG_FILE);
  const config = JSON.parse(data);
  return config;
}

async function getStreamerInfo(id, clientId, accessToken) {
  const url = `${TWITCH_API_BASE_URL}/streams?user_id=${id}`;
  const headers = {
    'Client-ID': clientId,
    'Authorization': `Bearer ${accessToken}`
  };
  const response = await fetch(url, { headers });
  const data = await response.json();
  if (data.data.length > 0) {
    const stream = data.data[0];
    return {
      id,
      name: stream.user_name,
      title: stream.title,
      viewerCount: stream.viewer_count
    };
  } else {
    return null;
  }
}

async function checkStreamers(ids, clientId, accessToken) {
  for (const id of ids) {
    const streamerInfo = await getStreamerInfo(id, clientId, accessToken);
    if (streamerInfo) {
      const toast_message = `${streamerInfo.name} is live (${streamerInfo.viewerCount} viewers)`;
      const command = `notify-send "${toast_message}" -t 3000`;
      console.log(toast_message);
      console.log(command);
      exec(command);
    } else {
      console.log(`${id} is not live`);
    }
  }
}

async function main() {
  const { ids, twitchClientId, twitchAccessToken } = await readConfigFile();
  while (true) {
    await checkStreamers(ids, twitchClientId, twitchAccessToken);
    await sleep(POLL_INTERVAL_MS);
  }
}

main().catch(console.error);