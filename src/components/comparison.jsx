import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Star, MapPin, Users, BarChart3, Crown, ThumbsUp, TrendingUp, Shield } from 'lucide-react';
import Navbar from './navbar';

const Comparison = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const restaurantsRef = useRef([]);

  useEffect(() => {
    if (window.google && window.google.maps && inputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['restaurant', 'food', 'meal_takeaway'],
        fields: ['place_id', 'name', 'formatted_address', 'rating', 'user_ratings_total', 'geometry']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place && place.place_id && restaurants.length < 4) {
          // Check if restaurant already exists
          const exists = restaurants.some(r => r.placeId === place.place_id);
          if (!exists) {
            const newRestaurant = {
              id: Date.now(),
              placeId: place.place_id,
              name: place.name || 'Unknown Restaurant',
              address: place.formatted_address || 'Address not available',
              rating: place.rating ? place.rating.toFixed(1) : 'N/A',
              totalReviews: place.user_ratings_total || 0,
              fakeScore: null,
              analyzed: false
            };
            setRestaurants(prev => [...prev, newRestaurant]);
            setSearchQuery('');
          }
        }
      });

      autocompleteRef.current = autocomplete;
    }
  }, [restaurants]);

  // Keep restaurantsRef in sync with restaurants state
  useEffect(() => {
    restaurantsRef.current = restaurants;
  }, [restaurants]);

  const addRestaurant = () => {
    // This function is now mainly for manual entry fallback
    if (searchQuery.trim() && restaurants.length < 4) {
      const newRestaurant = {
        id: Date.now(),
        placeId: null,
        name: searchQuery.trim(),
        address: "Manual Entry",
        rating: 'N/A',
        totalReviews: 0,
        fakeScore: null,
        analyzed: false
      };
      setRestaurants([...restaurants, newRestaurant]);
      setSearchQuery('');
    }
  };

  const removeRestaurant = (id) => {
    setRestaurants(restaurants.filter(r => r.id !== id));
    setAnalyzed(false);
  };

  // Streaming analysis with SSE using jobId
  const analyzeAll = async () => {
    console.log('analyzeAll called', { restaurants, length: restaurants.length });
    
    if (!restaurants || restaurants.length === 0) {
      setAnalyzeError("No restaurants to analyze.");
      return;
    }

    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      // Create mock reviews for all restaurants for testing
      const allReviews = [];
      restaurants.forEach((restaurant, restaurantIndex) => {
        // Create some mock reviews for each restaurant
        const mockReviews = [
          { id: `${restaurantIndex}-0`, user: 'John Doe', rating: 5, snippet: 'Great food and service!', restaurantIndex },
          { id: `${restaurantIndex}-1`, user: 'Jane Smith', rating: 4, snippet: 'Good experience overall.', restaurantIndex },
          { id: `${restaurantIndex}-2`, user: 'Bob Wilson', rating: 3, snippet: 'Average place, nothing special.', restaurantIndex }
        ];
        allReviews.push(...mockReviews);
      });

      console.log('Starting analysis with reviews:', allReviews.length);

      // 1. Start the job and get jobId
      const startRes = await fetch("http://43.216.83.231:5000/analyze-all-stream/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: allReviews }),
      });
      
      if (!startRes.ok) {
        throw new Error(`Failed to start analysis job: ${startRes.status}`);
      }
      
      const startData = await startRes.json();
      console.log('Start response:', startData);
      
      const { jobId } = startData;
      if (!jobId) {
        throw new Error("No jobId returned from backend");
      }

      console.log('Got jobId:', jobId);

      // 2. Connect to SSE with jobId
      const es = new EventSource(`http://43.216.83.231:5000/analyze-all-stream?jobId=${jobId}`);

      es.addEventListener("batch", (e) => {
        console.log('Received batch:', e.data);
        // const batch = JSON.parse(e.data);
        
      });

      es.addEventListener("done", () => {
        console.log('Analysis complete');
        
        // Generate random fake scores for each restaurant
        const updatedRestaurants = restaurants.map(restaurant => ({
          ...restaurant,
          fakeScore: Math.floor(Math.random() * 100),
          analyzed: true
        }));

        setRestaurants(updatedRestaurants);
        setAnalyzed(true);
        setAnalyzing(false);
        es.close();
      });

      es.addEventListener("error", (e) => {
        console.error('SSE error:', e);
        setAnalyzeError("Streaming connection error");
        setAnalyzing(false);
        es.close();
      });

      es.onerror = (e) => {
        console.error('SSE onerror:', e);
        setAnalyzeError("Connection failed");
        setAnalyzing(false);
        es.close();
      };

    } catch (err) {
      console.error('Analysis error:', err);
      setAnalyzeError(err.message || 'Analysis failed');
      setAnalyzing(false);
      
      // Fallback: generate random scores
      const updatedRestaurants = restaurants.map(restaurant => ({
        ...restaurant,
        fakeScore: Math.floor(Math.random() * 100),
        analyzed: true
      }));
      setRestaurants(updatedRestaurants);
      setAnalyzed(true);
    }
  };

  const getRecommendation = () => {
    if (!analyzed || restaurants.length === 0) return null;
    
    const authenticRestaurants = restaurants
      .filter(r => r.fakeScore < 40)
      .sort((a, b) => {
        const scoreA = parseFloat(a.rating) || 0;
        const scoreB = parseFloat(b.rating) || 0;
        return scoreB - scoreA;
      });
    
    return authenticRestaurants.length > 0 ? authenticRestaurants[0] : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-sage-100">
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 via-white to-sage-100 animate-[gradientShift_12s_ease-in-out_infinite]" />
      
      <Navbar />
      
      <div className="relative z-10 container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-sage-900 mb-4">
            Restaurant <span className="text-brand-orange">Comparison</span>
          </h1>
          <p className="text-xl text-sage-700 max-w-3xl mx-auto">
            Compare up to 4 restaurants and analyze their review authenticity with our AI-powered FakeScore
          </p>
        </div>

        {/* Add Restaurant Section */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-sage-100 p-6 mb-8">
          <h2 className="text-2xl font-bold text-sage-900 mb-4">Add Restaurants to Compare</h2>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-500" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addRestaurant()}
                placeholder="Search for restaurants..."
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-sage-300 focus:border-brand-orange focus:ring-2 focus:ring-orange-300 focus:outline-none transition-all"
              />
            </div>
          </div>
          <p className="text-sm text-sage-600 mt-2">
            {restaurants.length}/4 restaurants added
          </p>
        </div>

        {/* Restaurants Grid */}
        {restaurants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {restaurants.map((restaurant) => (
              <div key={restaurant.id} className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-sage-200 p-6 relative hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <button
                  onClick={() => removeRestaurant(restaurant.id)}
                  className="absolute top-4 right-4 bg-red-100 hover:bg-red-200 text-red-500 rounded-full p-2 transition-all duration-200 hover:scale-110"
                >
                  <X size={16} />
                </button>
                
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-sage-900 mb-3 pr-12 leading-tight">{restaurant.name}</h3>
                  <div className="flex items-start gap-2 text-sm text-sage-600 mb-3">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{restaurant.address}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-yellow-50 rounded-full px-3 py-1.5 border border-yellow-200">
                      <Star size={16} className="text-yellow-500 fill-current" />
                      <span className="font-bold text-yellow-700">{restaurant.rating}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-blue-50 rounded-full px-3 py-1.5 border border-blue-200">
                      <Users size={14} className="text-blue-500" />
                      <span className="font-semibold text-blue-700 text-sm">{restaurant.totalReviews}</span>
                    </div>
                  </div>
                </div>

                {/* FakeScore Display */}
                {restaurant.analyzed && (
                  <div className="border-t border-sage-200 pt-4">
                    <div className="text-center">
                      <div className="relative mb-4">
                        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg ${
                          restaurant.fakeScore < 40 ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
                          restaurant.fakeScore < 70 ? 'bg-gradient-to-br from-orange-400 to-yellow-500' :
                          'bg-gradient-to-br from-red-400 to-pink-500'
                        }`}>
                          <div className="text-2xl font-bold text-white">
                            {restaurant.fakeScore}
                          </div>
                        </div>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-white rounded-full px-2 py-1 shadow-md">
                          <div className="text-xs font-semibold text-sage-600">FakeScore</div>
                        </div>
                      </div>
                      <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold shadow-md ${
                        restaurant.fakeScore < 40 ? 'bg-green-500 text-white' :
                        restaurant.fakeScore < 70 ? 'bg-orange-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                        {restaurant.fakeScore < 40 ? 'Low Risk' : restaurant.fakeScore < 70 ? 'Medium Risk' : 'High Risk'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Analyze Button */}
        {restaurants.length > 0 && (
          <div className="text-center mb-8">
            {analyzeError && (
              <p className="text-red-600 mb-4 flex items-center justify-center gap-2">
                <span>❌</span> {analyzeError}
              </p>
            )}
            <button
              onClick={() => {
                console.log('Button clicked!', { analyzing, analyzed, restaurantsLength: restaurants.length });
                analyzeAll();
              }}
              disabled={analyzing || analyzed}
              className="px-8 py-4 bg-brand-orange text-white rounded-xl font-semibold text-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow flex items-center gap-3 mx-auto"
            >
              <BarChart3 size={24} />
              {analyzing ? 'Analyzing...' : analyzed ? 'Analysis Complete' : 'Analyze All Restaurants'}
            </button>
          </div>
        )}

        {/* Recommendation Banner */}
        {analyzed && getRecommendation() && (
          <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-3xl shadow-2xl p-8 mb-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/20 rounded-full p-3 mr-4">
                  <Crown className="text-yellow-300" size={32} />
                </div>
                <h2 className="text-3xl font-bold"> Our Top Recommendation</h2>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">{getRecommendation().name}</h3>
                <p className="text-lg opacity-90 mb-4">{getRecommendation().address}</p>
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                    <Star className="text-yellow-300 fill-current" size={20} />
                    <span className="font-bold">{getRecommendation().rating}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                    <Shield className="text-green-300" size={20} />
                    <span className="font-bold">{getRecommendation().fakeScore}% Fake Risk</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                    <Users className="text-blue-300" size={20} />
                    <span className="font-bold">{getRecommendation().totalReviews} Reviews</span>
                  </div>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-lg font-semibold mb-2">✨ Why we recommend this restaurant:</p>
                  <p className="opacity-90">This restaurant has the highest authentic rating with low fake review risk, making it the most trustworthy choice for your dining experience.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Results */}
        {analyzed && (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-sage-200 p-8">
            <h2 className="text-3xl font-bold text-sage-900 mb-8 text-center flex items-center justify-center gap-3">
              <BarChart3 className="text-brand-orange" size={32} />
              Detailed Comparison Results
            </h2>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-6 text-center shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-full p-4 w-fit mx-auto mb-4 shadow-lg">
                  <Shield className="text-white" size={28} />
                </div>
                <div className="text-3xl font-bold text-green-900 mb-2">
                  {restaurants.filter(r => r.fakeScore < 40).length}
                </div>
                <div className="text-green-700 font-semibold">Trusted Restaurants</div>
                <div className="text-xs text-green-600 mt-1">Low fake review risk</div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50 rounded-2xl p-6 text-center shadow-lg border border-orange-100 hover:shadow-xl transition-all duration-300">
                <div className="bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full p-4 w-fit mx-auto mb-4 shadow-lg">
                  <Star className="text-white fill-current" size={28} />
                </div>
                <div className="text-3xl font-bold text-orange-900 mb-2">
                  {Math.round(restaurants.reduce((sum, r) => sum + parseFloat(r.rating), 0) / restaurants.length * 10) / 10}
                </div>
                <div className="text-orange-700 font-semibold">Average Rating</div>
                <div className="text-xs text-orange-600 mt-1">Across all restaurants</div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 rounded-2xl p-6 text-center shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full p-4 w-fit mx-auto mb-4 shadow-lg">
                  <Users className="text-white" size={28} />
                </div>
                <div className="text-3xl font-bold text-blue-900 mb-2">
                  {restaurants.reduce((sum, r) => sum + r.totalReviews, 0)}
                </div>
                <div className="text-blue-700 font-semibold">Total Reviews</div>
                <div className="text-xs text-blue-600 mt-1">Combined data points</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-2xl p-6 text-center shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-4 w-fit mx-auto mb-4 shadow-lg">
                  <TrendingUp className="text-white" size={28} />
                </div>
                <div className="text-3xl font-bold text-purple-900 mb-2">
                  {Math.round((restaurants.filter(r => r.fakeScore < 40).length / restaurants.length) * 100)}%
                </div>
                <div className="text-purple-700 font-semibold">Authenticity Rate</div>
                <div className="text-xs text-purple-600 mt-1">Reliable options</div>
              </div>
            </div>

            {/* Consistent Restaurant Cards */}
            <div className="space-y-6">
              {restaurants
                .sort((a, b) => a.fakeScore - b.fakeScore)
                .map((restaurant, index) => {
                  const isRecommended = getRecommendation()?.id === restaurant.id;
                  return (
                    <div key={restaurant.id} className={`relative rounded-2xl p-6 shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                      isRecommended 
                        ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200' 
                        : restaurant.fakeScore < 40 
                        ? 'bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 border-blue-200' 
                        : restaurant.fakeScore < 70 
                        ? 'bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50 border-orange-200' 
                        : 'bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 border-red-200'
                    }`}>
                      {isRecommended && (
                        <div className="absolute -top-3 left-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-lg flex items-center gap-2">
                          <Crown size={16} className="text-yellow-300" />
                          RECOMMENDED
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          {/* Consistent Ranking Badge */}
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                            index === 0 ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 
                            index === 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 
                            index === 2 ? 'bg-gradient-to-br from-orange-500 to-yellow-500' : 
                            'bg-gradient-to-br from-red-500 to-pink-500'
                          }`}>
                            {index + 1}
                          </div>
                          
                          {/* Restaurant Info */}
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{restaurant.name}</h3>
                            <div className="flex items-center gap-2 text-gray-600 mb-3">
                              <div className="bg-gray-100 rounded-full p-1">
                                <MapPin size={16} className="text-gray-500" />
                              </div>
                              <span className="text-sm font-medium">{restaurant.address}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl px-4 py-2 border border-yellow-200">
                                <Star size={18} className="text-yellow-500 fill-current" />
                                <span className="font-bold text-yellow-700">{restaurant.rating}</span>
                              </div>
                              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl px-4 py-2 border border-blue-200">
                                <Users size={18} className="text-blue-500" />
                                <span className="font-bold text-blue-700">{restaurant.totalReviews}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Consistent FakeScore Display */}
                        <div className="w-32 flex flex-col items-center justify-center">
                          <div className={`w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg mb-3 ${
                            restaurant.fakeScore < 40 ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
                            restaurant.fakeScore < 70 ? 'bg-gradient-to-br from-orange-400 to-yellow-500' :
                            'bg-gradient-to-br from-red-400 to-pink-500'
                          }`}>
                            <div className="text-3xl font-bold text-white">{restaurant.fakeScore}</div>
                          </div>
                          <div className="text-xs font-semibold text-gray-600 mb-3 text-center">FakeScore</div>
                          <div className={`w-full text-center px-3 py-2 rounded-2xl text-sm font-bold shadow-lg ${
                            restaurant.fakeScore < 40 ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                            restaurant.fakeScore < 70 ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white' :
                            'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                          }`}>
                            {restaurant.fakeScore < 40 ? 'Low Risk' : restaurant.fakeScore < 70 ? 'Medium Risk' : 'High Risk'}
                          </div>
                          {isRecommended && (
                            <div className="mt-3 w-full flex items-center justify-center gap-1 text-green-600 font-bold text-xs bg-green-100 rounded-2xl px-2 py-1">
                              <ThumbsUp size={12} />
                              Best Choice
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {restaurants.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-sage-100 rounded-full p-6 w-fit mx-auto mb-6">
              <BarChart3 className="text-sage-500" size={48} />
            </div>
            <h3 className="text-2xl font-bold text-sage-900 mb-4">Start Your Comparison</h3>
            <p className="text-sage-600 max-w-md mx-auto">
              Add restaurants using the search bar above to begin comparing their review authenticity and ratings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Comparison;