import React, {useCallback, useEffect} from 'react';
import {
  Button,
  DeviceEventEmitter,
  SafeAreaView,
  StatusBar,
  Text,
} from 'react-native';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import {usePermission} from './src/usePermission';
import {RESULTS} from 'react-native-permissions';
import Geolocation, {PositionError} from 'react-native-geolocation-service';

// importing Service to call

const App = () => {
  const {
    handleAppPermission,
    checkPermission,
    locationPermissions,
  } = usePermission();

  useEffect(() => {
    handleAppPermission();

    // device event emitter used to
    let subscription = DeviceEventEmitter.addListener(
      'notificationClickHandle',
      function (e) {
        console.log('json', e);
      },
    );
    return () => {
      subscription.remove();
    };
  }, [handleAppPermission]);

  const haversineDistance = useCallback((mk1, mk2) => {
    const R = 6371.071; // Radius of the Earth in km
    const rlat1 = mk1.latitude * (Math.PI / 180); // Convert degrees to radians
    const rlat2 = mk2.latitude * (Math.PI / 180); // Convert degrees to radians
    const difflat = rlat2 - rlat1; // Radian difference (latitudes)
    const difflon = (mk2.longitude - mk1.longitude) * (Math.PI / 180); // Radian difference (longitudes)

    return (
      2 *
      R *
      Math.asin(
        Math.sqrt(
          Math.sin(difflat / 2) * Math.sin(difflat / 2) +
            Math.cos(rlat1) *
              Math.cos(rlat2) *
              Math.sin(difflon / 2) *
              Math.sin(difflon / 2),
        ),
      ) *
      1000
    );
  }, []);

  const onStart = async () => {
    // Checking if the task i am going to create already exist and running, which means that the foreground is also running.
    if (ReactNativeForegroundService.is_task_running('taskid')) {
      return;
    }

    const permission = await checkPermission();

    if (
      permission[locationPermissions[0]] !== RESULTS.GRANTED &&
      permission[locationPermissions[1]] !== RESULTS.GRANTED
    ) {
      return;
    }

    console.log('permission granted');
    // Creating a task.
    ReactNativeForegroundService.add_task(
      () => {
        Geolocation.getCurrentPosition(
          (position) => {
            const {longitude, latitude} = position.coords;

            const distance = haversineDistance(
              {longitude, latitude},
              {longitude: 0, latitude: 0},
            );

            console.log({distance});
          },
          (error) => {
            console.error(error.code, error.message);
            if (error.code === PositionError.PERMISSION_DENIED) {
              handleAppPermission && handleAppPermission();
            }
          },
          {
            enableHighAccuracy: true,
            accuracy: {android: 'high', ios: 'bestForNavigation'},
          },
        );
      },
      {
        delay: 500,
        onLoop: true,
        taskId: 'taskid',
        onError: (e) => console.log('Error logging:', e),
      },
    );
    // starting  foreground service.
    return ReactNativeForegroundService.start({
      id: 144,
      title: 'Foreground Service',
      message: 'you are online!',
    });
  };

  const onStop = () => {
    // Make always sure to remove the task before stoping the service. and instead of re-adding the task you can always update the task.
    if (ReactNativeForegroundService.is_task_running('taskid')) {
      ReactNativeForegroundService.remove_task('taskid');
    }
    // Stoping Foreground service.
    return ReactNativeForegroundService.stop();
  };
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView
        style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>An Example for React Native Foreground Service. </Text>
        <Button title={'Start'} onPress={onStart} />
        <Button title={'Stop'} onPress={onStop} />
      </SafeAreaView>
    </>
  );
};

export default App;
