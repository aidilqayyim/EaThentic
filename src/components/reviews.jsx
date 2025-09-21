// reviews.jsx

import { useEffect, useState, useRef } from "react";
import { Star, UserRound, Store, MapPin, Clock, Phone, AlertTriangle, Users, Flag } from "lucide-react";
import Navbar from '../components/navbar';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const reviewsRef = useRef([]); // Ref to store the latest reviews
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [brokenImages, setBrokenImages] = useState({});

  const [photos, setPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showAllHours, setShowAllHours] = useState(false);
  const [placeDetails, setPlaceDetails] = useState({
    name: "",
    address: "",
    hours: [],
    contact: "", // Add contact field
  });
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [starFilter, setStarFilter] = useState('all');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [reviewLoading, setReviewLoading] = useState([]); // Array of loading states per review
  const [analyzingStarted, setAnalyzingStarted] = useState(false); // Track if analysis has started

  const handleImageError = (index) => {
    setBrokenImages((prev) => ({ ...prev, [index]: true }));
  };

  // Helper to clean explanation text
  const formatExplanation = (text) => {
    if (!text) return "";
    // Remove escaped quotes, backslashes, and extra spaces
    let clean = text.replace(/\\+/g, "").replace(/\s+/g, " ").trim();

    // Remove trailing JSON metadata patterns like }],"stop_reason":...
    const metadataPattern = /\}\],.*$/;
    clean = clean.replace(metadataPattern, "").trim();

    // Remove wrapping quotes if present
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.slice(1, -1).trim();
    }

    // Remove trailing quotation mark if present
    if (clean.endsWith('"')) {
      clean = clean.slice(0, -1).trim();
    }

    return clean;
  };

  useEffect(() => {
    const placeId = new URLSearchParams(window.location.search).get("id");
    if (!placeId) {
      setError("Missing placeId");
      return;
    }

    const service = new window.google.maps.places.PlacesService(
      document.createElement("div")
    );

    service.getDetails(
      { placeId, fields: ["photos", "name", "formatted_address", "opening_hours", "formatted_phone_number", "rating", "user_ratings_total"] },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          if (place.photos && place.photos.length > 0) {
            const photoUrls = place.photos.slice(0, 5).map(photo => 
              photo.getUrl({ maxWidth: 800 })
            );
            setPhotos(photoUrls);
            
            // If we have less than 3 photos, fetch additional ones from backend
            if (photoUrls.length < 3) {
              fetch(`http://43.216.83.231:5000/photos/${placeId}`)
                .then(res => res.json())
                .then(data => {
                  if (data.photos) {
                    const additionalPhotos = data.photos.slice(0, 5 - photoUrls.length);
                    setPhotos(prev => [...prev, ...additionalPhotos]);
                  }
                })
                .catch(err => console.log('Failed to fetch additional photos:', err));
            }
          } else {
            // No photos from Google Places, try to get some from backend
            fetch(`http://43.216.83.231:5000/photos/${placeId}`)
              .then(res => res.json())
              .then(data => {
                if (data.photos) {
                  setPhotos(data.photos.slice(0, 5));
                }
              })
              .catch(err => console.log('Failed to fetch photos:', err));
          }
          setPlaceDetails({
            name: place.name,
            address: place.formatted_address,
            hours: place.opening_hours?.weekday_text || [],
            contact: place.formatted_phone_number || "N/A",
          });
          setAvgRating(place.rating || 0);
          setTotalReviews(place.user_ratings_total || 0);
        }
      }
    );

    // Fetch reviews from AWS API with staged loading
    const fetchReviews = async () => {
      try {

        const res = await fetch(`https://6nogrtm6y1.execute-api.us-east-1.amazonaws.com/review?placeId=${placeId}`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Lambda response:', data);
        
        // Check if this is a staged response or final response
        if (data.stage && data.status) {
          
          if (data.status === "error") {
            throw new Error(data.error || `Failed at stage: ${data.stage}`);
          }
          
          // If there's partial data, update reviews
          if (data.data && Array.isArray(data.data)) {
            setReviews(data.data);
            reviewsRef.current = data.data;
          }
          
          // Continue polling if not completed
          if (!data.completed) {
            // Implement polling logic if needed for real-time updates
            return;
          }
        } else if (data.reviews && Array.isArray(data.reviews)) {
          // This is the final response with all reviews
          console.log('Final reviews:', data.reviews);
          
          setReviews(data.reviews);
          reviewsRef.current = data.reviews;
        } else {
          // Empty response
          setReviews([]);
          reviewsRef.current = [];
        }
        
        setFinished(true);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setError(error.message || "Failed to fetch reviews");
      }
    };

    fetchReviews();
  }, []);

  useEffect(() => {
    if (reviews.length > 0) {
      const totalStars = reviews.reduce((sum, review) => sum + review.rating, 0);
      setAvgRating((totalStars / reviews.length).toFixed(1)); // Calculate average rating
      setTotalReviews(reviews.length); // Set total number of reviews
    }
  }, [reviews]);

  // Streaming analysis with SSE using jobId
  async function analyzeReview() {
    if (!reviewsRef.current || reviewsRef.current.length === 0) {
      setAnalyzeError("No reviews to analyze.");
      return;
    }

    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzingStarted(true); // Mark that analysis has started

    setReviewLoading(Array(reviewsRef.current.length).fill(true));
    setReviews(reviewsRef.current);

    try {
      // 1. Start the job and get jobId
      const startRes = await fetch("http://43.216.83.231:5000/analyze-all-stream/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: reviewsRef.current }),
      });
      if (!startRes.ok) throw new Error("Failed to start analysis job");
      const { jobId } = await startRes.json();
      if (!jobId) throw new Error("No jobId returned from backend");

      // 2. Connect to SSE with jobId
      const es = new EventSource(`http://43.216.83.231:5000/analyze-all-stream?jobId=${jobId}`);

      es.addEventListener("batch", (e) => {
        const batch = JSON.parse(e.data);
        setReviews(prev => {
          const merged = [...prev];
          batch.forEach(result => {
            const idx = merged.findIndex(r => r.id === result.id);
            if (idx >= 0) merged[idx] = result;
          });
          return merged;
        });
        setReviewLoading(prev => {
          const updated = [...prev];
          batch.forEach(result => {
            const idx = reviewsRef.current.findIndex(r => r.id === result.id);
            if (idx >= 0) updated[idx] = false;
          });
          return updated;
        });
      });

      es.addEventListener("done", () => {
        setAnalyzing(false);
        es.close();
      });

      es.addEventListener("error", (e) => {
        setAnalyzeError("Streaming error");
        setAnalyzing(false);
        es.close();
      });
    } catch (err) {
      setAnalyzeError(err.message);
      setReviewLoading(Array(reviewsRef.current.length).fill(false));
      setAnalyzing(false);
    }
  }

  // Show classification filter if analysis started or any review has classification
  const showClassificationFilter = analyzingStarted || reviews.some(r => r.classification);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-50 to-blue-50">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <p className="text-red-600 text-lg font-semibold flex items-center gap-2">
            <span>❌</span> {error}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-tr from-orange-100 via-white to-sage-100 animate-[gradientShift_12s_ease-in-out_infinite] py-6 px-2 sm:px-4 relative">
      {/* Loading Modal */}
      {!finished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800 text-center">Loading Reviews...</h2>
          </div>
        </div>
      )}
      <Navbar />

      {/* Image Modal */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => { setIsImageModalOpen(false); setZoomLevel(1); }}>
          <div className="relative max-w-full sm:max-w-4xl max-h-[90vh] mx-2 sm:mx-4 overflow-hidden">
            <img
              src={photos[currentPhotoIndex]}
              alt="Place"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-200 cursor-grab active:cursor-grabbing"
              style={{ transform: `scale(${zoomLevel})` }}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta)));
              }}
            />
            <button
              onClick={() => { setIsImageModalOpen(false); setZoomLevel(1); }}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/50 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
            <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(prev => Math.min(3, prev + 0.2));
                }}
                className="bg-black/50 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-black/70 transition-colors text-xl"
              >
                +
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(prev => Math.max(0.5, prev - 0.2));
                }}
                className="bg-black/50 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-black/70 transition-colors text-xl"
              >
                −
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(1);
                }}
                className="bg-black/50 text-white rounded px-2 py-1 text-xs hover:bg-black/70 transition-colors"
              >
                1:1
              </button>
            </div>
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex(prev => prev === 0 ? photos.length - 1 : prev - 1);
                  }}
                  className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center hover:bg-black/70 transition-colors text-xl"
                >
                  ‹
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex(prev => prev === photos.length - 1 ? 0 : prev + 1);
                  }}
                  className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center hover:bg-black/70 transition-colors text-xl"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="mt-8 sm:mt-12 max-w-full sm:max-w-6xl mx-auto bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-4 sm:p-8 mb-8 sm:mb-12 flex flex-col lg:flex-row gap-6 sm:gap-8 transition-all duration-500">
        {/* Place Info */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
            {/* Photo Carousel */}
            <div className="w-full sm:w-[220px] sm:h-[220px] lg:w-[260px] lg:h-[260px] flex-shrink-0 rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative group bg-gray-50 mx-auto sm:mx-0">
              {finished && photos.length > 0 ? (
                <>
                  <img
                    src={photos[currentPhotoIndex]}
                    alt="Place"
                    className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300 cursor-pointer"
                    onClick={() => setIsImageModalOpen(true)}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
                        aria-label="Previous photo"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setCurrentPhotoIndex(prev => prev === photos.length - 1 ? 0 : prev + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
                        aria-label="Next photo"
                      >
                        ›
                      </button>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                        {photos.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentPhotoIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                              index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                            aria-label={`Go to photo ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  <Store className="w-16 h-16" />
                </div>
              )}
            </div>
            {/* Mobile-only: View all photos button */}
            <div className="sm:hidden mt-3">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(true)}
                className="px-3 py-2 text-sm font-semibold rounded-lg bg-white text-gray-800 shadow border border-gray-200 hover:bg-gray-50 active:bg-gray-100"
              >
                View all photos
              </button>
            </div>

            {/* Place Details */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 font-nunito truncate">{placeDetails.name || "Restaurant Name"}</h1>
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 text-gray-700">
                <div className="bg-blue-50 rounded-full p-2 flex-shrink-0">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-base font-medium leading-snug break-words">{placeDetails.address || "Location"}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 sm:gap-3 text-gray-600">
                  <div className="bg-green-50 rounded-full p-2 flex-shrink-0">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base">{placeDetails.hours.length > 0 ? placeDetails.hours[0] : "Open Hours"}</p>
                      {/* Open/Closed badge */}
                      {placeDetails.hours && placeDetails.hours.length > 0 && (
                        (() => {
                          const first = placeDetails.hours[0]?.toLowerCase?.() || "";
                          const isOpen = first.includes("open");
                          const isClosed = first.includes("closed");
                          if (!isOpen && !isClosed) return null;
                          return (
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                              isClosed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-red-500' : 'bg-green-500'}`}></span>
                              {isClosed ? 'Closed' : 'Open'}
                            </span>
                          );
                        })()
                      )}
                    </div>
                    {placeDetails.hours.length > 1 && (
                      <button
                        onClick={() => setShowAllHours(!showAllHours)}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                      >
                        {showAllHours ? 'Show less' : 'Show all hours'}
                      </button>
                    )}
                  </div>
                </div>
                {showAllHours && placeDetails.hours.length > 1 && (
                  <div className="ml-8 sm:ml-11 space-y-1">
                    {placeDetails.hours.slice(1).map((hour, index) => (
                      <p key={index} className="text-xs text-gray-500">{hour}</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-gray-600">
                <div className="bg-purple-50 rounded-full p-2 flex-shrink-0">
                  <Phone className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-base break-all">{placeDetails.contact}</p>
              </div>
            </div>
          </div>

          {/* Divider on small screens for visual separation */}
          <div className="sm:hidden mt-3 border-t border-gray-200"></div>
          {/* Flagged Badge */}
          <div className="flex gap-4 sm:gap-6 mt-4">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-xl p-3 sm:p-4 shadow-lg hover:shadow-xl transition-all duration-300 ">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">Suspicious Reviews</span>
                  <span className="text-base sm:text-lg font-bold text-white">
                    {reviews.length > 0 ? (() => {
                      const validReviews = reviews.filter(
                        review => review.confidence !== undefined && !isNaN(parseFloat(review.confidence))
                      );
                      if (validReviews.length === 0) return "N/A";
                      const fakeCount = validReviews.filter(
                        review => review.classification === "Fake-Malicious" || review.classification === "Fake-Promotional"
                      ).length;
                      const fakeScore = (fakeCount / validReviews.length) * 100;
                      return `${fakeCount} Reviews (${fakeScore.toFixed(0)}%)`;
                    })() : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fake Score Card */}
        <div className="w-full lg:w-[400px] flex flex-col gap-4 mt-6 lg:mt-0">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-glow">
            <div className="flex gap-2 sm:gap-3 items-center">
              {/* Circular SVG ring showing fake score percentage */}
              <div className="score-ring" aria-hidden="true">
                <svg width="72" height="72" viewBox="0 0 42 42" className="sm:w-[96px] sm:h-[96px]">
                  <defs>
                    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316"/>
                      <stop offset="100%" stopColor="#ef4444"/>
                    </linearGradient>
                  </defs>
                  <circle cx="21" cy="21" r="15.5" stroke="#eef2f6" strokeWidth="6" fill="none"></circle>
                  <circle 
                    cx="21" 
                    cy="21" 
                    r="15.5" 
                    stroke="url(#g1)" 
                    strokeWidth="6" 
                    fill="none"
                    strokeDasharray={`${reviews.length > 0 ? (() => {
                      const validReviews = reviews.filter(
                        review => review.confidence !== undefined && !isNaN(parseFloat(review.confidence))
                      );
                      if (validReviews.length === 0) return 0;
                      const fakeCount = validReviews.filter(
                        review => review.classification === "Fake-Malicious" || review.classification === "Fake-Promotional"
                      ).length;
                      return (fakeCount / validReviews.length) * 100;
                    })() : 0} ${100 - (reviews.length > 0 ? (() => {
                      const validReviews = reviews.filter(
                        review => review.confidence !== undefined && !isNaN(parseFloat(review.confidence))
                      );
                      if (validReviews.length === 0) return 0;
                      const fakeCount = validReviews.filter(
                        review => review.classification === "Fake-Malicious" || review.classification === "Fake-Promotional"
                      ).length;
                      return (fakeCount / validReviews.length) * 100;
                    })() : 0)}`}
                    strokeLinecap="round" 
                    transform="rotate(-90 21 21)"
                  ></circle>
                  <text x="21" y="22.8" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#0b1220">
                    {reviews.length > 0 ? (() => {
                      const validReviews = reviews.filter(
                        review => review.confidence !== undefined && !isNaN(parseFloat(review.confidence))
                      );
                      if (validReviews.length === 0) return "0";
                      const fakeCount = validReviews.filter(
                        review => review.classification === "Fake-Malicious" || review.classification === "Fake-Promotional"
                      ).length;
                      return Math.round((fakeCount / validReviews.length) * 100);
                    })() : "0"}
                  </text>
                  <text x="21" y="28.2" textAnchor="middle" fontSize="3.5" fill="#6b7280">/100</text>
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-base sm:text-lg font-bold text-gray-900">FakeScore</div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {reviews.length > 0 ? (() => {
                    const validReviews = reviews.filter(
                      review => review.confidence !== undefined && !isNaN(parseFloat(review.confidence))
                    );
                    if (validReviews.length === 0) return "No data";
                    const fakeCount = validReviews.filter(
                      review => review.classification === "Fake-Malicious" || review.classification === "Fake-Promotional"
                    ).length;
                    const fakeScore = (fakeCount / validReviews.length) * 100;
                    const level = fakeScore > 70 ? "Very high confidence" : fakeScore > 40 ? "High confidence" : fakeScore > 20 ? "Medium confidence" : "Low confidence";
                    return `${Math.round(fakeScore)} — ${fakeScore > 50 ? 'Likely fake' : 'Likely genuine'} (${level})`;
                  })() : "No data"}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Our AI combines promo-words, burst detection and duplicate phrases.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-sm sm:text-base font-medium text-blue-700">Total Reviews</div>
              </div>
              <div className="text-sm sm:text-base font-bold text-blue-900">{reviews.length}</div>
            </div>
            <div className="flex items-center justify-between p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-100 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-yellow-100 rounded-full p-2">
                  <Star className="w-5 h-5 text-yellow-600 fill-current" />
                </div>
                <div className="text-sm sm:text-base font-medium text-yellow-700">Avg Rating</div>
              </div>
              <div className="flex items-center gap-1 text-sm sm:text-base font-bold text-yellow-900">
                {avgRating}
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 sm:p-4 bg-red-50 rounded-lg border border-red-100 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-red-100 rounded-full p-2">
                  <Flag className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-sm sm:text-base font-medium text-red-700">Flagged</div>
              </div>
              <div className="text-sm sm:text-base font-bold text-red-900">
                {reviews.length > 0 ? (() => {
                  const validReviews = reviews.filter(
                    review => review.confidence !== undefined && !isNaN(parseFloat(review.confidence))
                  );
                  if (validReviews.length === 0) return "0 (0%)";
                  const fakeCount = validReviews.filter(
                    review => review.classification === "Fake-Malicious" || review.classification === "Fake-Promotional"
                  ).length;
                  const fakeScore = (fakeCount / validReviews.length) * 100;
                  return `${fakeCount} (${fakeScore.toFixed(0)}%)`;
                })() : "0 (0%)"}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-full sm:max-w-6xl mx-auto flex flex-col md:flex-row gap-6 sm:gap-8">
        {/* Rating Distribution: always first on small screens, right side on md+ screens */}
        <div className="w-full md:w-[340px] flex flex-col items-center mt-6 md:mt-0 order-1 md:order-2">
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 w-full">
            <h2 className="font-bold mb-4 sm:mb-6 text-gray-800 text-lg text-center">Rating Distribution</h2>
            <ul className="space-y-3 sm:space-y-4">
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviews.filter(r => r.rating === star && !isNaN(r.rating)).length;
                const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <li key={star} className="flex items-center">
                    <span className="flex items-center mr-2 text-yellow-500 font-bold w-8 sm:w-10 justify-end">
                      {star} <Star className="w-5 h-5 ml-1" />
                    </span>
                    <div className="flex-1 mx-2">
                      <div className="relative h-4 sm:h-5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-4 sm:h-5 rounded-full bg-yellow-400 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <span className="ml-2 sm:ml-3 text-gray-700 font-semibold w-6 sm:w-8 text-right">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Reviews: always below on small screens, left side on md+ screens */}
        <div className="flex-1 min-w-0 order-2 md:order-1">
          <div className="mb-4">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Reviews</h3>
            {/* Show Analyze button until pressed */}
            {!analyzing && (
              <button
                onClick={analyzeReview}
                disabled={analyzing}
                className="mb-4 px-4 sm:px-6 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition-glow font-semibold disabled:opacity-50 w-full sm:w-auto"
              >
                Analyze Reviews
              </button>
            )}
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={starFilter}
                onChange={(e) => setStarFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Stars</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              {showClassificationFilter && (
                <select
                  value={classificationFilter}
                  onChange={(e) => setClassificationFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Classifications</option>
                  <option value="fake">Fake</option>
                  <option value="genuine">Genuine</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="unknown">Unknown</option>
                  <option value="insufficient">Insufficient</option>
                </select>
              )}
              <button
                onClick={() => {
                  setStarFilter('all');
                  setClassificationFilter('all');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Reset Filters
              </button>
            </div>
          </div>
          {analyzeError && (
            <p className="text-red-600 mb-2 flex items-center gap-2">
              <span>❌</span> {analyzeError}
            </p>
          )}
          {reviews.length === 0 ? (
            finished ? <p className="text-gray-500">No reviews found.</p> : ''
          ) : (() => {
            const filteredReviews = reviews
              .filter(review => starFilter === 'all' || review.rating === parseInt(starFilter))
              .filter(review => {
                if (classificationFilter === 'all') return true;
                if (classificationFilter === 'fake') return review.classification?.startsWith('Fake');
                if (classificationFilter === 'genuine') return review.classification && !review.classification.startsWith('Fake') && review.classification !== 'Unknown' && review.classification !== 'Insufficient';
                if (classificationFilter === 'suspicious') return review.confidence !== undefined && parseFloat(review.confidence) < 50;
                if (classificationFilter === 'unknown') return review.classification === 'Unknown';
                if (classificationFilter === 'insufficient') return review.classification === 'Insufficient';
                return true;
              });
            
            return filteredReviews.length === 0 ? (
              <p className="text-gray-500">No reviews found matching the selected filters.</p>
            ) : (
              <ul>
                {filteredReviews.map((review, index) => (
                <li key={index} className={`flex flex-col sm:flex-row items-start mb-6 bg-white rounded-xl shadow p-3 sm:p-4 relative ${
                  review.classification && review.confidence !== undefined
                    ? parseFloat(review.confidence) < 50
                      ? 'border-2'
                      : review.classification.startsWith('Fake')
                      ? 'border-2 border-red-500'
                      : 'border-2 border-green-500'
                    : ''
                }`} style={review.classification && review.confidence !== undefined && parseFloat(review.confidence) < 50 ? {borderColor: '#FFA200'} : {}}>
                  <div className="w-12 h-12 flex-shrink-0 mr-0 sm:mr-4 mb-2 sm:mb-0">
                    {brokenImages[index] || !review.profilePicture ? (
                      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-200 border-2 border-gray-300">
                        <UserRound className="w-6 h-6 text-gray-500" />
                      </div>
                    ) : (
                      <img
                        src={review.profilePicture}
                        alt={`${review.user}'s profile`}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        onError={() => handleImageError(index)}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{review.user}</div>
                    <div className="text-yellow-500 font-bold">{review.rating}★</div>
                    <div className="text-gray-600">{review.snippet}</div>
                    {review.isoDate && (
                      <div className="text-xs text-gray-400 mt-2">{review.isoDate}</div>
                    )}
                    {/* Per-review loading spinner */}
                    {analyzing && reviewLoading[index] && (!review.classification || !review.explanation) && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                        <span className="text-xs text-orange-500">Analyzing...</span>
                      </div>
                    )}
                    {/* Show explanation as soon as it's available */}
                    {review.classification && review.explanation && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-500 border-l-2 border-gray-300">
                        {formatExplanation(review.explanation)}
                      </div>
                    )}
                  </div>
                  {/* Classification Bubble: show as soon as available */}
                  {review.classification && review.confidence !== undefined && (
                    <div className="absolute top-3 right-3">
                      <div className={`px-3 py-2 rounded-full text-xs font-semibold text-white shadow-lg ${
                        parseFloat(review.confidence) < 50
                          ? 'text-black'
                          : review.classification.startsWith('Fake') 
                          ? 'bg-red-500' 
                          : review.classification === 'Unknown' || review.classification === 'Insufficient'
                          ? 'bg-gray-500' 
                          : 'bg-green-500'
                      }`} style={parseFloat(review.confidence) < 50 ? {backgroundColor: '#FF8C00'} : {}}>
                        {parseFloat(review.confidence) < 50
                          ? 'Suspicious'
                          : `${review.classification.startsWith('Fake') 
                            ? 'Fake' 
                            : review.classification === 'Unknown' 
                            ? 'Unknown' 
                            : review.classification === 'Insufficient' 
                            ? 'Insufficient' 
                            : 'Genuine'}: ${Math.round(parseFloat(review.confidence))}%`}
                      </div>
                    </div>
                  )}
                </li>
              ))}
              </ul>
            );
          })()}
        </div>
      </div>
    </div>
  );
}