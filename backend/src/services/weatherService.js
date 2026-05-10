const axios = require('axios');
const { config } = require('../config/env');

/**
 * OpenWeather One Call client. Feature-flagged on OPENWEATHER_API_KEY:
 *   - With key: returns current temp + condition + wind for a coordinate.
 *   - Without key: returns null. Callers must handle null silently.
 */

const OPEN_WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';

const isConfigured = () => Boolean(config.openWeatherApiKey);

const getCurrent = async (lat, lng) => {
  if (!isConfigured()) return null;
  try {
    const { data } = await axios.get(OPEN_WEATHER_URL, {
      params: {
        lat, lon: lng,
        appid: config.openWeatherApiKey,
        units: 'metric',
      },
      timeout: 4000,
    });
    return {
      temperatureC:   Math.round(data.main?.temp ?? 0),
      feelsLikeC:     Math.round(data.main?.feels_like ?? 0),
      humidity:       data.main?.humidity,
      windKmh:        Math.round((data.wind?.speed ?? 0) * 3.6),
      condition:      data.weather?.[0]?.main || 'Unknown',
      description:    data.weather?.[0]?.description || '',
      icon:           data.weather?.[0]?.icon || null,
      cityName:       data.name,
      observedAt:     new Date(data.dt * 1000).toISOString(),
    };
  } catch (err) {
    console.warn('Weather lookup failed:', err.message);
    return null;
  }
};

module.exports = { getCurrent, isConfigured };
