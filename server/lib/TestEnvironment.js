import os from 'os';

const platform = os.platform();

export const isDesktopLinux = () => {
  if (platform === 'linux') {
    return true;
  } else {
    return false;
  }
};

export const isAndroidLinux = () => {
  if (platform === 'android') {
    return true;
  } else {
    return false;
  }
};