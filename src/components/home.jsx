import React, { useEffect, useState, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import Navbar from '../components/navbar';
import Logo from '../components/logo';

const Home = () => {
  const [showMap, setShowMap] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    if (showMap) {
      async function initMap() {
        if (window.google && window.google.maps && window.google.maps.importLibrary) {
          const position = { lat: 2.9926, lng: 101.7070 };
          const { Map } = await window.google.maps.importLibrary("maps");
          const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");

          const map = new Map(mapRef.current, {
            zoom: 15,
            center: position,
            mapId: "DEMO_MAP_ID",
          });

          const marker = new AdvancedMarkerElement({
            map: map,
            position: position,
            gmpDraggable: true,
            title: "UPM Campus",
          });

          marker.addListener("dragend", () => {
            const pos = marker.position;
            console.log("Marker dragged to:", pos.lat, pos.lng);
          });
        }
      }
      initMap();

      // Wait for the map expand animation before scrolling
      const scrollTimeout = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 550); // Slightly more than transition duration

      return () => clearTimeout(scrollTimeout);
    }
  }, [showMap]);

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length > 2) {
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`);
        if (!res.ok) { setSuggestions([]); return; }
        const data = await res.json();
        setSuggestions(data.predictions || []);
      } catch {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-sage-50 via-white to-sage-100 w-full min-h-screen flex flex-col items-center text-sage-900 p-5 font-sans overflow-hidden">
      {/* Blurred background */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-brand-orange/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-sage-300/30 rounded-full blur-3xl"></div>

      {/* Navbar */}
      <Navbar />

      {/* Static Header / Logo */}
      <div className="flex flex-col items-center text-center relative z-10 w-full max-w-3xl pt-24">
        <Logo variant="gradient" className="text-5xl md:text-7xl" />
        <p className="mt-4 text-xl text-sage-700/90 italic font-serif-display tracking-wide">
          Authentic dining, guaranteed.
        </p>
        <p className="text-lg md:text-xl mt-4 max-w-xl leading-relaxed text-sage-800/90 font-medium font-sans">
          Say goodbye to fake reviews! Explore{' '}
          <span className="text-orange-500 font-semibold">hidden gems</span>, uncover authentic eateries, and let our{' '}
          <span className="text-orange-500 font-semibold">AI guidance</span> lead you to the finest dining experiences around you.
        </p>

      </div>

      {/* Scrollable Search + Map Content */}
      <div className="flex flex-col items-center text-center relative z-10 w-full max-w-3xl mt-6">
        {/* Search Bar */}
        <form className="relative w-full" autoComplete="on">
          <input
            className="w-full h-16 pl-14 pr-14 rounded-xl bg-white border border-orange-300
              text-lg text-sage-900 placeholder-gray-500 
              hover:border-orange-500
              focus:outline-none focus:border-orange-500 focus:ring-6 focus:ring-orange-300
              transition-colors transition-shadow duration-300"
            placeholder="Find reviews in ..."
            type="text"
            value={query}
            onChange={handleInputChange}
          />
          <button
            type="submit"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center 
              text-orange-500 hover:text-orange-600 transition-all duration-300"
          >
            <Search size={22} />
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center 
              text-orange-500 hover:text-orange-600 transition-all duration-300"
            onClick={() => setShowMap(v => !v)}
            title="Choose from map"
          >
            <MapPin size={22} />
          </button>
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-2 bg-white border border-orange-200 rounded-xl shadow-lg z-20">
              {suggestions.map((s) => (
                <li
                  key={s.place_id}
                  className="px-4 py-2 cursor-pointer hover:bg-orange-50"
                  onClick={() => { setQuery(s.description); setSuggestions([]); }}
                >
                  {s.description}
                </li>
              ))}
            </ul>
          )}
        </form>

        {/* Map Panel */}
        <div
          ref={mapRef}
          id="map"
          className={`w-full rounded-xl mt-4 transition-all duration-500 ease-in-out
            ${showMap ? 'h-96 opacity-100 shadow-lg overflow-auto' : 'h-0 opacity-0 overflow-hidden'}`}
        ></div>
      </div>
    </div>
  );
};

export default Home;
