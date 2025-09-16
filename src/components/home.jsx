import React, { useEffect, useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import Navbar from '../components/navbar';
import Logo from '../components/logo';

const Home = () => {
  const [showMap, setShowMap] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (showMap) {
      async function initMap() {
        if (window.google && window.google.maps && window.google.maps.importLibrary) {
          const { Map } = await window.google.maps.importLibrary('maps');
          new Map(document.getElementById('map'), {
            center: { lat: 37.7749, lng: -122.4194 },
            zoom: 12,
          });
        }
      }
      initMap();
    }
  }, [showMap]);

  // Autocomplete handler
  const handleInputChange = async (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length > 2) {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`);
      const data = await res.json();
      setSuggestions(data.predictions || []);
    } else {
      setSuggestions([]);
    }
  };

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

        {/* Map container above the input box, only when showMap is true */}
        {showMap && (
          <div
            id="map"
            style={{ width: '100%', height: '400px', marginTop: '2rem', borderRadius: '1rem' }}
          ></div>
        )}

        {/* Integrated Search Bar */}
        <form className="relative mt-10 w-full max-w-lg" autoComplete="on">
          <input
            className="w-full h-16 pl-14 pr-14 rounded-xl bg-white border border-orange-300
               text-lg text-sage-900 placeholder-gray-500 
               focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-300
               transition-all duration-300"
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
            onClick={() => setShowMap((v) => !v)}
            title="Choose from map"
          >
            <MapPin size={22} />
          </button>
          {/* Autocomplete suggestions dropdown */}
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-2 bg-white border border-orange-200 rounded-xl shadow-lg z-20">
              {suggestions.map((s) => (
                <li
                  key={s.place_id}
                  className="px-4 py-2 cursor-pointer hover:bg-orange-50"
                  onClick={() => {
                    setQuery(s.description);
                    setSuggestions([]);
                  }}
                >
                  {s.description}
                </li>
              ))}
            </ul>
          )}
        </form>
      </div>
    </div>
  );
};

export default Home;
