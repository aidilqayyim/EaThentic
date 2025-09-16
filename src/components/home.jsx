import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Logo from '../components/logo';

const Home = () => {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualSearch, setManualSearch] = useState(false); // Track if user is typing manually
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const navigate = useNavigate();

  const navigateToResults = useCallback(() => {
    const query = inputRef.current?.value || searchQuery;
    if (!query?.trim()) return;

    // Only include location if user selected a place from autocomplete (not manual search)
    if (selectedPlace?.location && !manualSearch) {
      // Location-based search
      const locationParam = `${selectedPlace.location.lat},${selectedPlace.location.lng}`;
      navigate(`/results?query=${encodeURIComponent(query.trim())}&location=${locationParam}`);
    } else {
      // Global search - explicitly don't include any location parameter
      navigate(`/results?query=${encodeURIComponent(query.trim())}`);
    }
  }, [searchQuery, selectedPlace, manualSearch, navigate]);

  useEffect(() => {
    if (window.google && window.google.maps) {
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ['name', 'formatted_address', 'geometry', 'place_id'],
      });

      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place && place.geometry) {
          setSelectedPlace({
            name: place.name,
            address: place.formatted_address,
            location: place.geometry.location.toJSON(),
            placeId: place.place_id,
          });
          setSearchQuery(place.name || place.formatted_address);
          setManualSearch(false); // Reset manual search flag
          navigateToResults(); // Trigger search navigation
        }
      });

      autocompleteRef.current = ac;
    }
  }, [navigateToResults]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigateToResults();
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    setManualSearch(true); // User is typing manually
    setSelectedPlace(null); // Reset selection when typing manually
  };

  return (
    <div className="relative bg-gradient-to-br from-sage-50 via-white to-sage-100 w-full min-h-screen flex flex-col items-center text-sage-900 p-5 font-sans overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 via-white to-sage-100 animate-[gradientShift_12s_ease-in-out_infinite]" />

      <Navbar />

      <div className="flex flex-col items-center text-center relative z-10 w-full max-w-3xl pt-20 animate-fadeIn">
        <Logo variant="gradient" className="text-5xl md:text-7xl drop-shadow-md" />
        <p className="mt-4 text-xl md:text-2xl text-sage-700/90 italic font-serif-display">
          Authentic dining, guaranteed.
        </p>

        <form
          onSubmit={handleSearch}
          className="relative w-full max-w-2xl mt-6 animate-slideUp flex gap-3 flex-col md:flex-row"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={handleInputChange}
              className="w-full h-16 pl-14 pr-10 rounded-xl bg-white border border-orange-300
                 text-lg text-sage-900 placeholder-gray-500 shadow-sm
                 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-300"
              placeholder="Find reviews in ..."
              type="text"
            />
            <button
              type="button"
              onClick={navigateToResults}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600"
            >
              <Search size={22} />
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default Home;