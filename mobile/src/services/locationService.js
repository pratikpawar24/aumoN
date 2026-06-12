import * as Location from 'expo-location';

export const locationService = {
  requestPermission: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  getCurrent: async () => {
    const granted = await locationService.requestPermission();
    if (!granted) throw new Error('Location permission denied');
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      speed: loc.coords.speed,
    };
  },

  // Returns an Expo location subscription ({ remove() }). Caller must remove it.
  watch: async (onUpdate) => {
    const granted = await locationService.requestPermission();
    if (!granted) throw new Error('Location permission denied');
    return Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 20 },
      (loc) =>
        onUpdate({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          speed: loc.coords.speed,
        })
    );
  },
};

export default locationService;
