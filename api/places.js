const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Autocomplete endpoint
router.get('/autocomplete', async (req, res) => {
  const input = req.query.input;
  if (!input) return res.status(400).json({ error: 'Missing input' });
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_API_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();
  res.json(data);
});

// Simple map endpoint (returns HTML with embedded Google Map)
router.get('/map', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Choose Location</title>
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; }
        </style>
        <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places"></script>
        <script>
          function initMap() {
            const map = new google.maps.Map(document.getElementById('map'), {
              center: { lat: 37.7749, lng: -122.4194 },
              zoom: 12,
            });
            let marker;
            map.addListener('click', function(e) {
              if (marker) marker.setMap(null);
              marker = new google.maps.Marker({
                position: e.latLng,
                map: map,
              });
              window.parent.postMessage({ lat: e.latLng.lat(), lng: e.latLng.lng() }, '*');
            });
          }
        </script>
      </head>
      <body onload="initMap()">
        <div id="map" style="width:100%;height:100%"></div>
      </body>
    </html>
  `);
});

module.exports = router;
