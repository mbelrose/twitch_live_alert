const express = require('express');
const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const options = new chrome.Options();
options.setPageLoadStrategy(PageLoadStrategy.EAGER);
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

const app = express();

app.get('/:streamer', async (req, res) => {
  const streamer = req.params.streamer;
  try {
    const streamerInfo = await getStreamerInfo(streamer);
    res.json(streamerInfo);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

app.listen(8501, () => {
  console.log('Server listening on port 8501');
});