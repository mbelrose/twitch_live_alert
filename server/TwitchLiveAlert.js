// periodcially pools Twitch API to check if streamers are live
// if so, sends a toast notification to the desktop
// requires a config file with Twitch API client id and access token
// config file contains Twitch numerical ids, not streamer names

import { readFile } from 'node:fs/promises';
import { exec } from 'child_process';
import fetch from 'node-fetch';
import { promisify } from 'util';
import { isDesktopLinux, isAndroidLinux } from './lib/TestEnvironment.js';

const sleep = promisify(setTimeout);

if (!isDesktopLinux() && !isAndroidLinux()) {
  console.log('This script is only for desktop Linux or Android Linux');
  process.exit(1);
} elseif (isAndroidLinux()) {
  const BASE_DIRECTORY = `${process.env.HOME}/webdev_repositories_personal/twitch_live_alert/`;
  const PLAYER_COMMAND = `streamlink ${TWITCH_WATCH_URL}/`;
  const POPUP_COMMAND = 'zenity --info --text="Twitch Alert"';
  const POPUP_ARGUMENT = '--extra-button';
  const TERMINAL_COMMAND = 'gnome-terminal -- ';
  const TOAST_COMMAND = 'notify-send -t 3000 -u low';
} elseif (isDesktopLinux()) {
  const BASE_DIRECTORY = `${process.env.HOME}/webdev_repositories_personal/twitch_live_alert/`;
  const PLAYER_COMMAND = `streamlink ${TWITCH_WATCH_URL}/`;
  const POPUP_COMMAND = 'zenity --info --text="Twitch Alert"';
  const POPUP_ARGUMENT = '--extra-button';
  const TERMINAL_COMMAND = 'gnome-terminal -- ';
  const TOAST_COMMAND = 'notify-send -t 3000 -u low';
}


const CONFIG_FILE = `${BASE_DIRECTORY}/config/config.json`;
const TWITCH_WATCH_URL = 'https://www.twitch.tv';
const TWITCH_API_BASE_URL = 'https://api.twitch.tv/helix';
const POLL_INTERVAL_MS = 600000; // 10 minutes

async function readConfigFile() {
// to implement: error if config file is corrupted or missing or contains duplicate ids
  const data = await readFile(CONFIG_FILE);
  const config = JSON.parse(data);
  return config;
}

// query Twitch API by streamerid for what is live
// returns null if no streamers are live
// returns array of streamer info if at least one streamer is live
async function getStreamerInfo(ids, clientId, accessToken) {

  if (ids.length === 0) {
    return null;
  }
  const url = `${TWITCH_API_BASE_URL}/streams?user_id=${ids.join('&user_id=')}`;
  const headers = {
    'Client-ID': clientId,
    'Authorization': `Bearer ${accessToken}`
  };
  const response = await fetch(url, { headers });
  // to implement: error if response is not 200
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

  if (liveStreams === null) {
    console.log('No new streamers have gone live');
    return [];
  }

  // create a list of live streamer names
  const liveIds = [];
  const streamNameList = liveStreams.map(stream => {
    liveIds.push(stream.id);
    return stream.name;
  });

  // print a message to the console
  const now = new Date();
  const timeString = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  const links = streamNameList.reduce(
    (acc, name) => {
      const link = `${TWITCH_WATCH_URL}/${name}`;
      if (acc === '') {
        return link;
      } else {
        return `${acc}, ${link}`;
      }
  }
  , '');
  const consoleMessage = `Live stream(s): [${timeString}] ${links}`;
  console.log(consoleMessage);


  // make a toast notification
  const toastMessage = 'Live stream(s): '
    + streamNameList.join(', ');
  const toastCommand = `${TOAST_COMMAND} "${toastMessage}"`;
  exec(toastCommand);

  //make a dialogue to open stream in an app
  const options = streamNameList.reduce(
    (acc, name) => {
      const link = `${POPUP_ARGUMENT} ${name}`;
      if (acc === '') {
        return link;
      } else {
        return `${acc} ${link}`;
      }
  }
  , '');
  const popupCommand = `${POPUP_COMMAND} ${options}`;
  if (streamNameList.length > 0) {
    exec(popupCommand, (error, stdout, stderr) => {
      if (stdout) {
        const streamer = stdout.trim();
        console.log(`Selected streamer: ${streamer}`);
        exec(`${TERMINAL_COMMAND}${PLAYER_COMMAND}${streamer}`);
      }
    });
  }

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