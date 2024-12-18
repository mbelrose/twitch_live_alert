// periodcially pools Twitch API to check if streamers are live
// if so, sends a toast notification to the desktop
// requires a config file with Twitch API client id and access token
// config file contains Twitch numerical ids, not streamer names

// to initialize and maybe regenerate access token:
// curl -X POST 'https://id.twitch.tv/oauth2/token' \
// -H 'Content-Type: application/x-www-form-urlencoded' \
// -d 'client_id=<your client id goes here>&client_secret=<your client secret goes here>&grant_type=client_credentials'


import { readFile } from 'node:fs/promises';
import { exec } from 'child_process';
import fetch from 'node-fetch';
import { promisify } from 'util';
import { isDesktopLinux, isAndroidLinux, isWindows } from './lib/TestEnvironment.js';

const sleep = promisify(setTimeout);

const TWITCH_WATCH_URL = 'https://www.twitch.tv';
const TWITCH_API_BASE_URL = 'https://api.twitch.tv/helix';
const POLL_INTERVAL_MS = 120000; // 3 minutes

let BASE_DIRECTORY, CONFIG_FILE, PLAYER_COMMAND, PLAYER_COMMAND_SUFFIX,
  POPUP_COMMAND, POPUP_ARGUMENT, POPUP_QUOTE, POPUP_LIST_DELIMITOR,
  TERMINAL_COMMAND, TOAST_COMMAND, TOAST_QUOT;

if (!isDesktopLinux() && !isAndroidLinux()) {
  console.log('This script is only for desktop Linux or Android Linux');
  process.exit(1);
} else if (isAndroidLinux()) {
  BASE_DIRECTORY = `${process.env.HOME}/.local/opt/twitch_live_alert`;
  CONFIG_FILE = `${BASE_DIRECTORY}/config/config.json`;
  PLAYER_COMMAND_SUFFIX = ')';
  PLAYER_COMMAND = `am start -n org.videolan.vlc/org.videolan.vlc.gui.video.VideoPlayerActivity -a android.intent.action.VIEW -d $(yt-dlp -f "480p,480p30" -g ${TWITCH_WATCH_URL}/`;
  POPUP_COMMAND = 'termux-dialog radio -v';
  POPUP_ARGUMENT = '';
  POPUP_QUOTE = '"';
  POPUP_LIST_DELIMITOR = ',';
  TERMINAL_COMMAND = '';
  TOAST_COMMAND = 'termux-toast -s';
  TOAST_QUOT = '"';
} else {
  BASE_DIRECTORY = `/mnt/8cba077b-050c-47b9-9e82-8c8b0730ca1e/opt/twitch_live_alert`;
  CONFIG_FILE = `${BASE_DIRECTORY}/config/config.json`;
  PLAYER_COMMAND_SUFFIX = '';
  PLAYER_COMMAND = '/mnt/8cba077b-050c-47b9-9e82-8c8b0730ca1e/Documents/local_script/youtube_dl_scripts/youtube-dl_video_stream_twitch.sh ';
  // using plaintext match, so make sure no tag text is contained in another 
  POPUP_COMMAND = '\
    zenity --list --radiolist \
    --title="Twitch Alert" --height=600 --width=600 \
    --print-column=2 \
    --column=radiobutton --column=streamer_id \
  ';
  POPUP_ARGUMENT = 'FALSE';
  POPUP_QUOTE = '';
  POPUP_LIST_DELIMITOR = ' ';
  TERMINAL_COMMAND = 'gnome-terminal -- ';
  TOAST_COMMAND = 'notify-send -t 3000 -u low';
  TOAST_QUOT = '"';
}


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
  let response;
  try {
    response = await fetch(url, { headers });
  } catch (error) {
    console.log(`The server did not respond. 
    ${error.message}`) // this might leak access token, ok for local
  }
  let data;
  try {
    if (response.ok) {
      data = await response.json();
    } else {
      console.log(`The server returned an error.  ${response.status}: ${response.statusText}`);
      console.log ('Do you need to regenerate the access token? See RegenerateAccessToken.js');
    }
  } catch (error) {
    console.log(error.message);
  }

  let streams = { length: 0};
  try {
    streams = data.data;
  } catch (error) {
    console.log(error.message);
  }
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
        return `${acc} , ${link}`;
      }
  }
  , '');
  const consoleMessage = `Live stream(s): [${timeString}] ${links}`;
  console.log(consoleMessage);


  // make a toast notification
  const toastMessage = 'Live stream(s): '
    + streamNameList.join(', ');
  const toastCommand = `${TOAST_COMMAND} ${TOAST_QUOT}${toastMessage}${TOAST_QUOT}`;
  exec(toastCommand);

  //make a dialogue to open stream in an app
  const options = streamNameList.reduce(
    (acc, name) => {
      const link = `${POPUP_ARGUMENT} ${name}`;
      if (acc === '') {
        return link;
      } else {
        return `${acc}${POPUP_LIST_DELIMITOR}${link}`;
      }
  }
  , '');

  const popupCommand = 
    `${POPUP_COMMAND} ${POPUP_QUOTE}${options}${POPUP_QUOTE}`;
  if (streamNameList.length > 0) {
    exec(popupCommand, (error, stdout, stderr) => {
      if (stdout) {
        let streamer;
        if (isAndroidLinux()) {
          streamer = JSON.parse(stdout).text;
        } else {
          streamer = stdout.trim();
        }
        console.log(`Selected streamer: ${streamer}`);
        exec(`${TERMINAL_COMMAND}${PLAYER_COMMAND}${streamer}${PLAYER_COMMAND_SUFFIX}`);
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
