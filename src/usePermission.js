import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, AppState, AppStateStatus, Platform} from 'react-native';
import {
  checkMultiple,
  openSettings,
  PERMISSIONS,
  request,
  RESULTS,
} from 'react-native-permissions';
import {PermissionStatus} from 'react-native-permissions/src/types';
import RNRestart from 'react-native-restart';

export const usePermission = () => {
  const appState = useRef(AppState.currentState);
  const [settingsOpened, setSettingsOpened] = useState(false);

  const locationPermissions = useMemo(
    () =>
      Platform.OS === 'android'
        ? [
            PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
            PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
          ]
        : [
            PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
            PERMISSIONS.IOS.LOCATION_ALWAYS,
          ],
    [],
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        if (appState.current.match(/inactive|background/) && settingsOpened) {
          RNRestart.Restart();
        }
      }
      appState.current = nextAppState;
    };

    AppState.addEventListener('change', handleAppStateChange);
  }, [settingsOpened]);

  const askPermission = useCallback(() => {
    Alert.alert(
      'Location permission needed!',
      'Click the settings button to change the settings',
      [
        {
          text: 'Cancel',
          onPress: () => {
            console.log('asdas');
          },
        },
        {
          text: 'Set Setting',
          onPress: () => {
            setSettingsOpened(true);
            openSettings();
          },
        },
      ],
    );
  }, []);

  const checkPermission = useCallback(async () => {
    return await checkMultiple(locationPermissions);
  }, [locationPermissions]);

  const handleAppPermission = useCallback(async () => {
    let permissions: PermissionStatus = await checkPermission();

    if (permissions[0] !== RESULTS.GRANTED) {
      permissions[0] = await request(locationPermissions[0]);
    }

    if (permissions[1] !== RESULTS.GRANTED) {
      permissions[1] = await request(locationPermissions[1]);
    }

    if (
      permissions[0] === RESULTS.DENIED ||
      permissions[1] === RESULTS.DENIED
    ) {
      await handleAppPermission();
    }

    if (
      permissions[0] === RESULTS.BLOCKED ||
      permissions[1] === RESULTS.BLOCKED
    ) {
      askPermission();
    }
    return permissions;
  }, [askPermission, checkPermission, locationPermissions]);

  return {
    handleAppPermission,
    settingsOpened,
    checkPermission,
    locationPermissions,
  };
};
