const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const { mapLimiter } = require('../middleware/rateLimiter');

router.get('/search', mapLimiter, mapController.searchLocations);
router.get('/autocomplete', mapLimiter, mapController.autocomplete);
router.get('/geocode', mapLimiter, mapController.geocode);
router.get('/reverse-geocode', mapLimiter, mapController.reverseGeocode);
router.get('/pois', mapLimiter, mapController.getPOIs);
router.get('/bus-stops', mapLimiter, mapController.getBusStops);
router.get('/buildings', mapLimiter, mapController.getBuildings);
router.get('/shops', mapLimiter, mapController.getShops);
router.get('/streets', mapLimiter, mapController.getStreets);

module.exports = router;