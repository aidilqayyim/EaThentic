import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Star, Compass, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Logo from '../components/logo';

const Home = () => {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualSearch, setManualSearch] = useState(false);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const navigate = useNavigate();

  const navigateToResults = useCallback(() => {
    const query = inputRef.current?.value || searchQuery;
    if (!query?.trim()) return;

    if (selectedPlace?.location && !manualSearch) {
      const locationParam = `${selectedPlace.location.lat},${selectedPlace.location.lng}`;
      navigate(`/results?query=${encodeURIComponent(query.trim())}&location=${locationParam}`);
    } else {
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
          setManualSearch(false);
          navigateToResults();
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
    setManualSearch(true);
    setSelectedPlace(null);
  };

  return (
    <div className="relative bg-gradient-to-br from-sage-50 via-white to-sage-100 w-full min-h-screen flex flex-col items-center text-sage-900 p-5 font-sans overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 via-white to-sage-100 animate-[gradientShift_12s_ease-in-out_infinite]" />

      {/* Decorative floating circles */}
      <div className="absolute w-72 h-72 bg-orange-200/30 rounded-full blur-3xl top-10 left-10 animate-float" />
      <div className="absolute w-96 h-96 bg-sage-300/20 rounded-full blur-3xl bottom-20 right-10 animate-pulse-slow" />

      <Navbar />

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12 relative z-10 w-full max-w-6xl pt-20">
        <div className="flex flex-col items-center text-center w-full lg:w-1/2 max-w-3xl animate-fadeIn">
          <Logo variant="gradient" className="text-5xl md:text-7xl drop-shadow-md" />
          <p className="mt-4 text-xl md:text-2xl text-sage-700/90 italic font-serif-display tracking-wide animate-shimmer bg-gradient-to-r from-orange-400 via-orange-200 to-orange-400 bg-200% bg-clip-text text-transparent">
            Authentic dining, guaranteed
          </p>

          {/* Tagline */}
          <p className="mt-3 text-lg leading-relaxed font-['Nunito']">
            Say goodbye to{" "}
            <span className="font-bold text-red-600 underline decoration-orange-500 decoration-2">
              fake reviews
            </span>
            ! Explore{" "}
            <span className="bg-orange-100 text-orange-600 font-semibold px-2 py-1 rounded-md">
              authentic eateries
            </span>
            , and let our{" "}
            <span className="bg-orange-100 text-orange-600 font-semibold px-2 py-1 rounded-md">
              AI guidance
            </span>{" "}
            lead you to the finest dining experiences.
          </p>

          {/* Search */}
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
                 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-300 focus:shadow-glow"
                placeholder="Find reviews in ..."
                type="text"
              />
              <button
                type="button"
                onClick={navigateToResults}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 cursor-default"
              >
                <Search size={22} />
              </button>
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold shadow-glow hover:bg-orange-600 transition-glow"
            >
              Search Now
            </button>
          </form>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full animate-fadeInUp">
        {[
          { icon: ShieldCheck, title: "Verified Reviews", text: "Only authentic, AI-filtered feedback you can trust" },
          { icon: Compass, title: "Discover Gems", text: "Explore hidden eateries and must-try local favourites" },
          { icon: Star, title: "Top Picks", text: "Get personalised recommendations tailored for you" },
        ].map((f, i) => (
          <div
            key={i}
            className="p-6 bg-white rounded-2xl shadow-md hover:shadow-glow transition-glow flex flex-col items-center text-center"
          >
            <f.icon className="text-orange-500 mb-3" size={36} />
            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
            <p className="text-sage-700">{f.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
