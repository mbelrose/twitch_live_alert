const { exec } = require('child_process');
const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const options = new chrome.Options();

options.setPageLoadStrategy(PageLoadStrategy.EAGER);
options.setScriptTimeout(10000);
options.addArguments('--headless');

async function getStreamerInfo(streamer) {
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  try {
    await driver.get(`https://www.twitch.tv/${streamer}`);
    const name = await driver.findElement(By.className('tw-font-size-4')).getText();
    const title = await driver.findElement(By.className('tw-font-size-5')).getText();
    const viewerCount = await driver.findElement(By.className('tw-stat__value')).getText();
    const isLive = await driver.findElement(By.className('stream-live-indicator-container')).isDisplayed();
    return {name, title, viewerCount, isLive};
  } finally {
    await driver.quit();
  }
}

const streamer = process.argv[2];
getStreamerInfo(streamer)
.then( (streamerInfo) => {
  if (streamerInfo.isLive) {
    exec(`notify-send "${streamer} is live" "${streamerInfo.title} (${streamerInfo.viewerCount} viewers)"`);
  }
  console.log(res.json(streamerInfo));
})
.catch( () => {
  console.log('error');
});
