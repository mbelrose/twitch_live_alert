const os = require('os');

export const isDesktopLinux = () => {
  const platform = os.platform();
  if (platform === 'linux') {
    const desktopSession = process.env.XDG_CURRENT_DESKTOP;
    if (desktopSession) {
      return true;
    }
  }
  return false;
};

export const isAndroidLinux = () => {
  const platform = os.platform();
  if (platform === 'linux') {
    const release = os.release();
    if (release.includes('Android')) {
      return true;
    }
  }
  return false;
};