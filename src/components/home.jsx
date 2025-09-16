import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import Navbar from '../components/navbar';
import Logo from '../components/logo';

const Home = () => {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const inputRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    async function initAutocomplete() {
      if (window.google && window.google.maps) {
        // Request the Places library
        await window.google.maps.importLibrary("places");

        // Attach autocomplete to the existing input box
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['name', 'formatted_address', 'geometry', 'place_id'], // Include place_id explicitly
        });

        // Add listener for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place) {
            setSelectedPlace({
              name: place.name,
              address: place.formatted_address,
              location: place.geometry?.location?.toJSON(),
              placeId: place.place_id, // Include placeId
            });
            console.log('Selected Place:', place);
            console.log('Place ID:', place.place_id); // Log the placeId for debugging
          }
        });
      }
    }

    async function initMap() {
      if (window.google && window.google.maps) {
        // Request needed libraries
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          window.google.maps.importLibrary("maps"),
          window.google.maps.importLibrary("marker"),
        ]);

        // Initialize the map
        const center = { lat: 2.9919, lng: 101.7072 }; // Kosass, UPM
        const map = new Map(mapRef.current, {
          center,
          zoom: 13,
          mapId: '4504f8b37365c3d0',
          mapTypeControl: false,
        });

        // Create the marker and info window
        const marker = new AdvancedMarkerElement({ map });
        const infoWindow = new window.google.maps.InfoWindow();
        const geocoder = new window.google.maps.Geocoder(); // Define geocoder instance

        // Save references
        markerRef.current = marker;
        infoWindowRef.current = infoWindow;

        // Add click listener to the map
        map.addListener('click', async (event) => {
          const location = event.latLng;
          marker.position = location;

          // Reverse geocode the clicked location
          geocoder.geocode({ location }, async (results, status) => {
            if (status === 'OK' && results[0]) {
              const placeId = results[0].place_id;
              const placeName = results[0].formatted_address;

              console.log('Place ID:', placeId); // Debugging: Log the place ID

              setSelectedPlace({
                name: placeName,
                address: `${location.lat()}, ${location.lng()}`,
                location: location.toJSON(),
                placeId, // Include placeId
              });
            } else {
              console.error('Geocoder failed due to:', status);
            }
          });
        });
      }
    }

    function updateInfoWindow(content, position) {
      const infoWindow = infoWindowRef.current;
      const marker = markerRef.current;
      if (infoWindow && marker) {
        infoWindow.setContent(content);
        infoWindow.setPosition(position);
        infoWindow.open({
          map: marker.map,
          anchor: marker,
          shouldFocus: false,
        });
      }
    }

    initAutocomplete();
    if (showMap) {
      initMap();
    }
  }, [showMap]);

  return (
    <div className="relative bg-gradient-to-br from-sage-50 via-white to-sage-100 w-full min-h-screen flex flex-col justify-center items-center text-sage-900 p-5 font-sans overflow-hidden">
      {/* Blurred bg */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-brand-orange/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-sage-300/30 rounded-full blur-3xl"></div>

      {/* Navbar */}
      <Navbar />

      <div className="flex flex-col items-center text-center relative z-10">
        {/* Logo */}
        <Logo variant="gradient" className="text-5xl md:text-7xl" />

        {/* Subtitle */}
        <p className="mt-4 text-xl text-sage-700/90 italic font-serif-display tracking-wide">
          Authentic dining, guaranteed.
        </p>

        {/* Description */}
        <p className="text-lg md:text-xl mt-8 max-w-xl leading-relaxed text-sage-800/90 font-medium font-sans">
          Don&apos;t fall for fake reviews. Enter a restaurant or location and let our AI find the hidden gems and expose the frauds.
        </p>

        {/* Integrated Search Bar */}
        <form className="relative w-full max-w-lg mt-5" autoComplete="on">
          <input
            ref={inputRef}
            className="w-full h-16 pl-14 pr-10 rounded-xl bg-white border border-orange-300
               text-lg text-sage-900 placeholder-gray-500 
               focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-300
               transition-all duration-300"
            placeholder="Find reviews in ..."
            type="text"
          />
          <button
            type="submit"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center 
               text-orange-500 hover:text-orange-600 transition-all duration-300 z-10"
          >
            <Search size={22} />
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center 
               text-orange-500 hover:text-orange-600 transition-all duration-300 z-10"
            onClick={() => setShowMap((prev) => !prev)}
          >
            <MapPin size={22} />
          </button>
        </form>
      </div>

      {/* Map container */}
      {showMap && (
        <div
          ref={mapRef}
          id="map"
          style={{ width: '100%', height: '400px', marginTop: '20px', borderRadius: '1rem' }}
        ></div>
      )}

      {/* Popup for selected place info */}
      {selectedPlace && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedPlace(null)}
            >
              ✕
            </button>
            <h3 className="font-semibold text-orange-600 text-lg">Selected Place:</h3>
            <p className="text-sm text-sage-800 mt-2">{selectedPlace.name}</p>
            <p className="text-xs text-sage-600">{selectedPlace.address}</p>
            {selectedPlace.placeId && (
              <p className="text-xs text-sage-600 mt-2">Place ID: {selectedPlace.placeId}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
