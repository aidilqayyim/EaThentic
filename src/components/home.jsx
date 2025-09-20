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
      <div ref={aboutRef} className="relative z-10 mt-32 w-full max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-sage-900 mb-4">About <span className="text-brand-orange">EaThentic</span></h2>
          <p className="text-xl text-sage-700 max-w-3xl mx-auto">
            We're revolutionizing how you discover authentic dining experiences through AI-powered review verification
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-sage-900">Our Mission</h3>
            <p className="text-lg text-sage-700 leading-relaxed">
              In a world flooded with fake reviews and misleading ratings, we believe every diner deserves authentic insights. 
              Our advanced AI technology filters out promotional and malicious reviews, ensuring you only see genuine feedback 
              from real customers.
            </p>
            <p className="text-lg text-sage-700 leading-relaxed">
              Whether you're exploring a new city or looking for hidden gems in your neighborhood, TrueReviews guides you 
              to exceptional dining experiences you can trust.
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-100 to-sage-100 rounded-2xl p-8">
            <div className="grid grid-cols-1 gap-6">
              {[
                { icon: Users, title: "10,000+", subtitle: "Verified Reviews" },
                { icon: Target, title: "95%", subtitle: "Accuracy Rate" },
                { icon: Award, title: "500+", subtitle: "Partner Restaurants" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="bg-orange-500 rounded-full p-3">
                    <stat.icon className="text-white" size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-sage-900">{stat.title}</div>
                    <div className="text-sage-700">{stat.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h3 className="text-2xl font-bold text-sage-900 mb-6 text-center">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Search", desc: "Enter any restaurant or location to find reviews" },
              { step: "02", title: "Analyze", desc: "Our AI scans and verifies review authenticity" },
              { step: "03", title: "Discover", desc: "Get genuine insights and make informed decisions" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="bg-orange-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h4 className="text-xl font-bold text-sage-900 mb-2">{item.title}</h4>
                <p className="text-sage-700">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
