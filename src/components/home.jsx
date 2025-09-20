import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Star, Compass, ShieldCheck, Users, Target, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Logo from '../components/logo';

const Home = () => {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualSearch, setManualSearch] = useState(false);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const aboutRef = useRef(null);
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

  // Handle hash navigation for about section
  useEffect(() => {
    if (window.location.hash === '#about' && aboutRef.current) {
      setTimeout(() => {
        const offsetTop = aboutRef.current.offsetTop - 100;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }, 100); // Small delay to ensure page is loaded
    }
  }, []);

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

      <Navbar aboutRef={aboutRef} />

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12 relative z-10 w-full max-w-6xl pt-20">
        <div className="flex flex-col items-center text-center w-full lg:w-1/2 max-w-3xl animate-fadeIn">
          <Logo variant="gradient" className="text-5xl md:text-7xl drop-shadow-md" />
          <p className="mt-4 text-xl md:text-2xl text-sage-700/90 italic font-serif-display tracking-wide animate-shimmer bg-gradient-to-r from-orange-400 via-orange-200 to-orange-400 bg-200% bg-clip-text text-transparent">
            Authentic dining, guaranteed
          </p>

          {/* Tagline */}
          <p className="mt-3 text-lg leading-relaxed">
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

      {/* About Section */}
      <div
        ref={aboutRef}
        className="relative z-10 mt-32 w-full max-w-6xl"
      >
        {/* Soft decorative backdrop */}
        <div className="pointer-events-none absolute -top-16 -right-24 w-96 h-96 bg-orange-200/30 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -bottom-10 -left-24 w-[28rem] h-[28rem] bg-sage-300/25 blur-3xl rounded-full" />

        {/* Heading */}
        <div className="text-center mb-16 md:mb-20 animate-fadeInUp">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-sage-900 mb-4 md:mb-6">
            About <span className="text-brand-orange">EaThentic</span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-sage-700/90 max-w-3xl mx-auto leading-relaxed h-8">
            EaThentic is your AI-powered guide for spotting{" "}
            <span className="font-semibold text-red-600">fake reviews </span>
            on Google Maps easily. Say goodbye to misleading ratings and get the clear, trustworthy insights you need to find the right place to eat.
          </p>
        </div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-stretch mb-16 lg:mb-20">
          {/* Story / Mission (compact) */}
          <div className="bg-white border border-sage-200/60 rounded-2xl p-6 md:p-7 shadow-sm animate-fadeInUp">
            <h3 className="text-xl md:text-2xl font-bold text-sage-900 mb-3">Why it matters</h3>
            <p className="text-sage-700 leading-relaxed">
              Fake and biased reviews waste time and money. They mislead diners and punish honest businesses.
            </p>

            <div className="my-4 h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent" />

            <h3 className="text-xl md:text-2xl font-bold text-sage-900 mb-2">How we help</h3>
            <p className="text-sage-700 leading-relaxed">
              We filter noise with AI to surface trustworthy signals, so choices feel confident and fair.
            </p>

            <ul className="mt-4 space-y-2.5 text-sage-800/90">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>Promo-word and burst detection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>Duplicate phrase spotting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>Clear confidence scores</span>
              </li>
            </ul>
          </div>

          {/* Stats tiles (compact, minimal wrapper, interactive tiles) */}
          <div className="relative">
            <h4 className="text-lg md:text-xl font-extrabold tracking-tight text-sage-900 mb-2 text-center">At a glance</h4>
            <div className="mx-auto mb-4 h-1 w-14 rounded-full bg-gradient-to-r from-orange-400 to-orange-600" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Users, title: "Real Diners", subtitle: "Voices that matter" },
                { icon: Target, title: "AI Detection", subtitle: "Precision flags" },
                { icon: Award, title: "Fair Dining", subtitle: "For honest places" },
              ].map((stat, i) => (
                <div key={i} className="relative group overflow-hidden rounded-2xl border border-sage-200 bg-white/80 p-4 shadow-sm hover:shadow-lg hover:border-orange-300 transition-all duration-200">
                  {/* Accent bar */}
                  <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-orange-400 to-orange-600 opacity-80" aria-hidden="true" />

                  {/* Subtle hover glow */}
                  <span className="pointer-events-none absolute -right-8 -top-8 w-24 h-24 rounded-full bg-orange-200/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />

                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <span className="absolute inset-0 rounded-full bg-orange-200/40 blur-md opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 ring-1 ring-orange-200 flex items-center justify-center">
                        <stat.icon size={18} className="transition-transform duration-200 group-hover:scale-110" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm md:text-base font-semibold text-sage-900 truncate group-hover:text-orange-600 transition-colors">{stat.title}</div>
                      </div>
                      <div className="text-sage-700 text-xs md:text-sm">{stat.subtitle}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
