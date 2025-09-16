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
        await window.google.maps.importLibrary("places");
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['name', 'formatted_address', 'geometry', 'place_id'],
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place) {
            setSelectedPlace({
              name: place.name,
              address: place.formatted_address,
              location: place.geometry?.location?.toJSON(),
              placeId: place.place_id,
            });
          }
        });
      }
    }

    async function initMap() {
      if (window.google && window.google.maps) {
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          window.google.maps.importLibrary("maps"),
          window.google.maps.importLibrary("marker"),
        ]);
        const center = { lat: 2.9919, lng: 101.7072 };
        const map = new Map(mapRef.current, {
          center,
          zoom: 13,
          mapId: '4504f8b37365c3d0',
          mapTypeControl: false,
        });

        const marker = new AdvancedMarkerElement({ map });
        const infoWindow = new window.google.maps.InfoWindow();
        const geocoder = new window.google.maps.Geocoder();

        markerRef.current = marker;
        infoWindowRef.current = infoWindow;

        map.addListener('click', async (event) => {
          const location = event.latLng;
          marker.position = location;
          geocoder.geocode({ location }, async (results, status) => {
            if (status === 'OK' && results[0]) {
              setSelectedPlace({
                name: results[0].formatted_address,
                address: `${location.lat()}, ${location.lng()}`,
                location: location.toJSON(),
                placeId: results[0].place_id,
              });
            }
          });
        });
      }
    }

    initAutocomplete();
    if (showMap) {
      initMap();
      const scrollTimeout = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 550);
      return () => clearTimeout(scrollTimeout);
    }
  }, [showMap]);

  return (
    <div className="relative bg-gradient-to-br from-sage-50 via-white to-sage-100 w-full min-h-screen flex flex-col items-center text-sage-900 p-5 font-sans overflow-hidden">


      {/* Animated gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 via-white to-sage-100 
      animate-[gradientShift_12s_ease-in-out_infinite]"></div>

      {/* Floating gradient */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-brand-orange/20 
      rounded-full blur-3xl animate-float animate-subtleGlow"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-sage-300/30 
      rounded-full blur-3xl animate-float"></div>
      <div className="absolute top-1/3 left-1/2 w-64 h-64 bg-orange-200/20 
      rounded-full blur-2xl animate-[float_10s_ease-in-out_infinite_alternate]"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-sage-300/30 rounded-full blur-3xl animate-float"></div>

      {/* Navbar */}
      <Navbar />

      {/* Header / Logo */}
      <div className="flex flex-col items-center text-center relative z-10 w-full max-w-3xl pt-20 animate-fadeIn">
        <Logo variant="gradient" className="text-5xl md:text-7xl drop-shadow-md" />
        <p className="mt-4 text-xl md:text-2xl text-sage-700/90 italic font-serif-display tracking-wide animate-shimmer bg-gradient-to-r from-orange-400 via-orange-200 to-orange-400 bg-200% bg-clip-text text-transparent hover:drop-shadow-glow">
          Authentic dining, guaranteed.
        </p>
        <p className="mt-3 text-lg leading-relaxed font-serif-display">
          <span className="relative inline-block">
            <span className="relative font-bold text-red-600 animate-slideUp">
              Say goodbye to{" "}
              <span className="underline decoration-orange-500">
                fake reviews!
              </span>
            </span>
          </span>{" "}
          Explore{" "}
          <span className="text-orange-500 font-semibold">
            hidden gems
          </span>
          , uncover authentic eateries, and let our{" "}
          <span className="text-orange-500 font-semibold">
            AI guidance
          </span>{" "}
          lead you to the finest dining experiences around you
        </p>



        {/* Integrated Search Bar */}
        <form className="relative w-full max-w-lg mt-6 animate-slideUp">
          <input
            ref={inputRef}
            className="w-full h-16 pl-14 pr-10 rounded-xl bg-white border border-orange-300
               text-lg text-sage-900 placeholder-gray-500 shadow-sm
               hover:shadow-glow focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-300
               transition-all duration-500"
            placeholder="Find reviews in ..."
            type="text"
          />
          <button
            type="submit"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center 
               text-orange-500 hover:scale-110 hover:text-orange-600 transition-all duration-300 z-10"
          >
            <Search size={22} />
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center 
               text-orange-500 hover:scale-110 hover:text-orange-600 transition-all duration-300 z-10"
            onClick={() => setShowMap((prev) => !prev)}
          >
            <MapPin size={22} />
          </button>
        </form>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        id="map"
        className={`w-full mt-6 transition-all duration-700 ease-in-out transform
          ${showMap
            ? 'h-96 opacity-100 rounded-2xl shadow-2xl border-2 scale-100'
            : 'h-0 opacity-0 overflow-hidden scale-95'
          }`}
      ></div>

      {/* Selected Place Below */}
      {selectedPlace && (
        <div className="mt-2 w-full max-w-lg bg-white border border-sage-200 rounded-xl p-4 shadow-md text-left z-20 relative animate-fadeInUp">
          <h3 className="font-semibold text-orange-600 text-sm">Selected Place</h3>
          <p className="text-sm text-sage-800">{selectedPlace.name}</p>
          <p className="text-xs text-sage-600">{selectedPlace.address}</p>
          {selectedPlace.placeId && (
            <p className="text-xs text-sage-500 mt-1">Place ID: {selectedPlace.placeId}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
