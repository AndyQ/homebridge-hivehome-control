/* eslint-disable indent */
import {PlatformConfig} from 'homebridge';

import {Log} from '../util/log';

import {DEVICE_LOGIN_REQUIRED, HeatingMode, kChallengeName, kScanIntervalSecs, pyhiveapi, PyHiveAuth, PyHiveType} from './hive-api';

// Translate a mode to the format suitable for a request to the server.
export function translateModeForRequest(mode: HeatingMode) {
  return (mode === HeatingMode.kOn ? HeatingMode.kManual : mode);
}

// Log into, configure and start a Hive session.
export function startHiveSession(config: PlatformConfig) {
  const hiveSession = pyhiveapi.Hive({
    username: config.hiveUsername,
    password: config.hivePassword,
  });

  // Tell the auth object about the device if we have already registered it.
  hiveSession.auth.__setattr__(PyHiveAuth.kDevGroupKey, config.deviceGroupKey);
  hiveSession.auth.__setattr__(PyHiveAuth.kDevKey, config.deviceKey);
  hiveSession.auth.__setattr__(PyHiveAuth.kDevPassword, config.devicePassword);

  // Perform the login.
  const login = hiveSession.login();

  // If the device is already registered, log in using its information.
  const challengeName = login.get(kChallengeName).toString();
  if (challengeName === DEVICE_LOGIN_REQUIRED) {
    hiveSession.deviceLogin();
  } else {
    Log.error('Could not log in. Are you sure the device is registered?');
    Log.debug('Login replied with:', challengeName);
    return null;
  }

  // Set the minimum interval between refreshes from the server.
  hiveSession.updateInterval(kScanIntervalSecs);

  // Return the logged-in session object.
  hiveSession.startSession();
  return hiveSession;
}

// Update Hive data and catch any exceptions that occur.
export function updateHiveData(hiveSession, hiveDevice) {
  try {
    return hiveSession.updateData(hiveDevice);
  } catch (ex) {
    Log.debug('Error updating Hive data:', ex);
  }
  return false;
}

// Retrieve a list of all hot water devices from the Hive session.
export function getHiveDeviceList(hiveSession) {
  const waterHeaters = hiveSession.deviceList.__getitem__(PyHiveType.kHotWater);
  const roomHeaters = hiveSession.deviceList.__getitem__(PyHiveType.kHeating);
  return roomHeaters.toJS().concat(waterHeaters.toJS());
}
