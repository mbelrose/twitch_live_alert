// periodcially pools Twitch API to check if streamers are live
// if so, sends a toast notification to the desktop
// requires a config file with Twitch API client id and access token
// config file contains Twitch numerical ids, not streamer names

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

// query Twitch API by streamerid for what is live
// returns null if no streamers are live
// returns array of streamer info if at least one streamer is live
async function getStreamerInfo(ids, clientId, accessToken) {
  const url = `${TWITCH_API_BASE_URL}/streams?user_id=${ids.join('&user_id=')}`;
  const headers = {
    'Client-ID': clientId,
    'Authorization': `Bearer ${accessToken}`
  };
  const response = await fetch(url, { headers });
  const data = await response.json();
  const streams = data.data;
  if (streams.length > 0) {
    const streamerInfo = streams.map(stream => ({
      id: stream.user_id,
      name: stream.user_name,
      title: stream.title,
      viewerCount: stream.viewer_count
    }));
    return streamerInfo;
  } else {
    return null;
  }
}

// manage list of live streamers and toast notifications
async function checkStreamers(ids, clientId, accessToken) {
  const liveStreams = await getStreamerInfo(ids, clientId, accessToken);
  const liveIds = [];
  const streamNameList = liveStreams.map(stream => {
    liveIds.push(stream.id);
    return stream.name;
  });
  const toastMessage = 'Live stream(s): '
    + streamNameList.join(', ');
  console.log(toastMessage);
  const command = `notify-send "${toastMessage}" -t 3000 -a TwitchLiveAlert -u low "${stream.title}" "${stream.name}" "${streamUrl}"`;
  exec(command);
  return liveIds;
}

async function main() {
  let { ids, twitchClientId, twitchAccessToken } = await readConfigFile();
  while (true) {
    const liveIds = await checkStreamers(ids, twitchClientId, twitchAccessToken);
    // will only notify when a streamer goes live
    // to implement: readd streamer if they go offline
    ids = ids.filter(id => !liveIds.includes(id));
    await sleep(POLL_INTERVAL_MS);
  }
}

main().catch(console.error);