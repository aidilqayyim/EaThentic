import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Clock, ExternalLink, Search } from 'lucide-react';
import Navbar from '../components/navbar';
import Logo from '../components/logo';

const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef(null);

  const query = searchParams.get('query');
  const location = searchParams.get('location');

  useEffect(() => {
    console.log('URL params:', { query, location }); // Debug log
    setSearchQuery(query || '');
    if (query) {
      searchPlacesByQuery();
    }
  }, [query, location]);

  const searchPlacesByQuery = async () => {
    setLoading(true);
    setError(null);

    // Use the query from URL params, not from state
    const currentQuery = query || searchQuery;
    console.log('Current query for search:', currentQuery); // Debug log
    
    if (!currentQuery || !currentQuery.trim()) {
      setError('Please enter a search query');
      setLoading(false);
      return;
    }

    try {
      if (!window.google || !window.google.maps) throw new Error('Google Maps not loaded');

      // Default center (Kuala Lumpur) - only used if location is provided
      const center = location
        ? { lat: Number(location.split(',')[0]), lng: Number(location.split(',')[1]) }
        : { lat: 2.9919, lng: 101.7072 }; 

      const [{ Map }] = await Promise.all([window.google.maps.importLibrary('maps')]);
      const map = new Map(mapRef.current, {
        center,
        zoom: location ? 12 : 6, // Zoom out more for global searches
        mapId: '4504f8b37365c3d0',
        mapTypeControl: false,
      });

      const service = new window.google.maps.places.PlacesService(map);

      // Build request - ONLY include location/radius if location parameter exists and is not empty
      const request = { 
        query: currentQuery, // Use currentQuery instead of searchQuery
        type: 'restaurant' 
      };
      
      // Only add location restrictions if location parameter is provided and not empty
      if (location && location.trim() && location !== 'null' && location !== 'undefined') {
        request.location = center;
        request.radius = 15000; // 15km radius
        console.log('Using location-based search:', center); // Debug log
      } else {
        console.log('Using global search - no location restrictions'); // Debug log
      }
      // If no location, do a global search without location restrictions

      console.log('Final search request:', request); // Debug log

      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
          handleSearchResults(results, map);
        } else {
          setError('No matching restaurants found. Try a different keyword.');
          setPlaces([]);
          setLoading(false);
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to initialize search. Please try again.');
      setLoading(false);
    }
  };

  const handleSearchResults = (results, map) => {
    const filtered = results
      .filter(p => p.name && p.geometry)
      .filter(p => p.rating && p.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 20);

    if (filtered.length === 0) {
      setError('No restaurants found');
      setPlaces([]);
      setLoading(false);
      return;
    }

    addMarkersToMap(filtered, map);
    setPlaces(filtered);
    setLoading(false);
  };

  const addMarkersToMap = (places, map) => {
    const bounds = new window.google.maps.LatLngBounds();
    places.forEach((place, i) => {
      if (!place.geometry?.location) return;

      const marker = new window.google.maps.Marker({
        position: place.geometry.location,
        map,
        title: place.name,
        label: (i + 1).toString(),
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold text-orange-600">${place.name}</h3>
            <p class="text-sm text-gray-600">${place.formatted_address || place.vicinity || ''}</p>
            <div class="flex items-center mt-1">
              <span class="text-yellow-500">★</span>
              <span class="ml-1 text-sm">${place.rating || 'N/A'}</span>
              ${place.user_ratings_total ? `<span class="text-gray-500 text-xs ml-1">(${place.user_ratings_total})</span>` : ''}
            </div>
          </div>
        `,
      });

      marker.addListener('click', () => infoWindow.open(map, marker));
      bounds.extend(place.geometry.location);
    });

    if (places.length === 1) map.setCenter(places[0].geometry.location);
    else map.fitBounds(bounds);
  };

  const handleNewSearch = e => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // For new searches from the results page, don't carry over the old location
    // Let it be a global search unless user specifically wants location-based search
    navigate(`/results?query=${encodeURIComponent(searchQuery)}`);
  };

  const getPlaceDetailsUrl = place => {
    if (place.place_id) return `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
    const search = encodeURIComponent(`${place.name} ${place.vicinity || place.formatted_address || ''}`);
    return `https://www.google.com/maps/search/?api=1&query=${search}`;
  };

  const getPriceDisplay = priceLevel => {
    if (!priceLevel) return null;
    const prices = ['Inexpensive', 'Moderate', 'Expensive', 'Very Expensive'];
    return { symbols: '$'.repeat(priceLevel), text: prices[priceLevel - 1] };
  };

  return (
    <div className="relative bg-gradient-to-br from-sage-50 via-white to-sage-100 min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 via-white to-sage-100 animate-[gradientShift_12s_ease-in-out_infinite]"></div>

      <Navbar />

      <div className="relative z-10 container mx-auto px-4 pt-20">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-orange-600 hover:text-orange-700 transition-colors">
            <ArrowLeft size={20} /> Back to Home
          </button>
          <Logo variant="gradient" className="text-2xl" />
        </div>

        <form onSubmit={handleNewSearch} className="relative w-full max-w-2xl mx-auto mb-6 flex gap-3">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 h-14 pl-12 pr-4 rounded-xl bg-white border border-orange-300 text-lg text-sage-900 placeholder-gray-500 shadow-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-300 transition-all duration-300"
            placeholder="Search for restaurants, cafes, food..."
            type="text"
          />
          <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600 transition-colors">
            <Search size={20} />
          </button>
        </form>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-sage-900 mb-4">
              Places matching "{query}"
              {location && <span className="text-sm font-normal text-sage-600 ml-2">(near selected location)</span>}
              {places.length > 0 && <span className="text-sm font-normal text-sage-600 ml-2">({places.length} result{places.length !== 1 ? 's' : ''})</span>}
            </h2>

            {loading && <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div><span className="ml-3 text-sage-600">Searching for places...</span></div>}
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}

            {places.map((place, index) => (
              <div
                key={place.place_id || `${place.name}-${index}`}
                onClick={() => navigate(`/results/review?id=${place.place_id}`)}
                className="bg-white rounded-xl border border-sage-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 animate-fadeInUp hover:cursor-pointer"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-semibold text-sage-900 flex items-center gap-2">
                    <span className="bg-orange-500 text-white text-sm rounded-full w-6 h-6 flex items-center justify-center font-medium">{index + 1}</span>
                    {place.name}
                  </h3>
                  {place.rating && (
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                      <Star size={16} className="text-yellow-500 fill-current" />
                      <span className="font-medium text-yellow-700">{place.rating}</span>
                      {place.user_ratings_total && <span className="text-yellow-600 text-sm">({place.user_ratings_total})</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sage-700">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-orange-500 flex-shrink-0" />
                    <span className="text-sm">{place.formatted_address || place.vicinity || 'Address not available'}</span>
                  </div>
                  {place.opening_hours && <div className="flex items-center gap-2"><Clock size={16} className="text-orange-500 flex-shrink-0" /><span className={`text-sm font-medium ${place.opening_hours.open_now ? 'text-green-600' : 'text-red-600'}`}>{place.opening_hours.open_now ? 'Open now' : 'Closed'}</span></div>}
                  {place.price_level && getPriceDisplay(place.price_level) && <div className="flex items-center gap-2"><span className="text-orange-500">💰</span><span className="text-sm">{getPriceDisplay(place.price_level).symbols} ({getPriceDisplay(place.price_level).text})</span></div>}
                </div>

                <div className="mt-4 flex gap-2">
                  <a href={getPlaceDetailsUrl(place)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
                    <ExternalLink size={16} /> View on Maps
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:sticky lg:top-24 h-96 lg:h-[600px]">
            <div ref={mapRef} className="w-full h-full rounded-xl shadow-lg border-2 border-sage-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;