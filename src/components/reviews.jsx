import { useEffect, useState, useRef } from "react";
import { Star, UserRound, Store } from "lucide-react";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const reviewsRef = useRef([]); // Ref to store the latest reviews
  const [stages, setStages] = useState([
    { stage: "Getting reviews", status: "loading", color: "grey" },
    { stage: "Loading the first reviews", status: "loading", color: "grey" },
    { stage: "Loading the rest of the reviews", status: "loading", color: "grey" },
    { stage: "Filtering the reviews", status: "loading", color: "grey" },
  ]);
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [brokenImages, setBrokenImages] = useState({});

  const [photoUrl, setPhotoUrl] = useState(null);
  const [placeDetails, setPlaceDetails] = useState({
    name: "",
    address: "",
    hours: [],
    contact: "", // Add contact field
  });
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

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
            const url = place.photos[0].getUrl({ maxWidth: 600 });
            setPhotoUrl(url);
          }
          setPlaceDetails({
            name: place.name,
            address: place.formatted_address,
            hours: place.opening_hours?.weekday_text || [],
            contact: place.formatted_phone_number || "N/A", // Set contact information
          });
          setAvgRating(place.rating || 0); // Set average rating from place.rating
          setTotalReviews(place.user_ratings_total || 0); // Set total reviews from place.user_ratings_total
        }
      }
    );

    const evtSource = new EventSource(
      `http://localhost:4000/reviews?placeId=${placeId}`
    );

    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "stage") {
        setStages((prev) =>
          prev.map((s) =>
            s.stage === data.stage
              ? { ...s, status: data.status, color: data.color }
              : s
          )
        );
      } else if (data.type === "reviews") {
        setReviews(data.reviews);
        reviewsRef.current = data.reviews;
      } else if (data.type === "error") {
        setError(data.message);
        evtSource.close();
      } else if (data.type === "done") {
        setFinished(true);
        evtSource.close();
        const reviewsJson = JSON.stringify(reviewsRef.current, null, 2);
        console.log("Fetched Reviews:", reviewsJson);
      }
    };

    evtSource.onerror = () => {
      if (!finished) {
        setError("Connection lost");
      }
      evtSource.close();
    };

    return () => {
      evtSource.close();
    };
  }, [finished]);

  useEffect(() => {
    if (reviews.length > 0) {
      const totalStars = reviews.reduce((sum, review) => sum + review.rating, 0);
      setAvgRating((totalStars / reviews.length).toFixed(1)); // Calculate average rating
      setTotalReviews(reviews.length); // Set total number of reviews
    }
  }, [reviews]);

  async function analyzeReview() {
    if (!reviewsRef.current || reviewsRef.current.length === 0) {
      setAnalyzeError("No reviews to analyze.");
      return;
    }
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const response = await fetch("http://localhost:5000/analyze-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: reviewsRef.current }),
      });
      if (!response.ok) {
        let msg = "Failed to analyze reviews";
        try {
          const errData = await response.json();
          if (errData && errData.error) msg = errData.error;
        } catch {}
        throw new Error(msg);
      }
      const data = await response.json();
      setReviews(data);
    } catch (err) {
      setAnalyzeError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  // Helper to check if any stage is loading
  const isLoadingStages = stages.some(s => s.status === "loading");

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
    <div className="min-h-screen bg-gradient-to-tr from-orange-100 via-white to-sage-100 animate-[gradientShift_12s_ease-in-out_infinite] py-10 px-4 relative">
      {/* Stage Loading Modal */}
      {isLoadingStages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-8 min-w-[320px]">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Loading Reviews</h2>
            <ul>
              {stages.map((s, i) => {
                let icon = null;
                let animate = "";

                if (s.status === "loading") {
                  icon = (
                    <span className="inline-block w-7 h-7 mr-3 animate-spin border-4 border-blue-300 border-t-blue-500 rounded-full" />
                  );
                  animate = "animate-pulse";
                } else if (s.status === "success") {
                  icon = (
                    <span className="text-2xl mr-3">✅</span>
                  );
                  animate = "animate-bounce";
                } else if (s.status === "error") {
                  icon = (
                    <span className="text-2xl mr-3">❌</span>
                  );
                  animate = "animate-shake";
                }

                return (
                  <li
                    key={i}
                    className={`flex items-center px-4 py-3 mb-2 rounded-lg bg-gray-50 shadow transition-all duration-200 ${animate}`}
                  >
                    {icon}
                    <span className="font-semibold text-gray-700">{s.stage}</span>
                    {s.status === "error" && (
                      <span className="text-xs px-2 py-1 rounded bg-white border ml-auto">Error</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <style>
            {`
            @keyframes shake {
              0% { transform: translateX(0); }
              25% { transform: translateX(-4px); }
              50% { transform: translateX(4px); }
              75% { transform: translateX(-4px); }
              100% { transform: translateX(0); }
            }
            .animate-shake {
              animation: shake 0.5s;
            }
            `}
          </style>
        </div>
      )}

      {/* Header Card */}
      <div className="max-w-5xl mx-auto bg-white/80 rounded-2xl shadow-lg p-8 mb-8 flex flex-col md:flex-row gap-8">
        {/* Place Info */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex gap-6 items-center">
            <div className="w-[110px] h-[110px] flex-shrink-0 rounded-xl overflow-hidden shadow">
              {finished && photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Place"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-full h-full flex items-center justify-center bg-gray-100"
                style={{ display: finished && photoUrl ? 'none' : 'flex' }}
              >
                <Store className="w-12 h-12 text-gray-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{placeDetails.name || "Restaurant Name"}</h1>
              <p className="text-gray-500">{placeDetails.address || "Location"}</p>
              <p className="text-gray-400 text-sm">
                {placeDetails.hours.length > 0 ? placeDetails.hours.join(", ") : "Open Hours"}
              </p>
              <p className="text-gray-400 text-sm">Contact: {placeDetails.contact}</p>
            </div>
          </div>
          <div className="flex gap-8 mt-4">
            {/* Remove Total Reviews and Average Rating */}
            <div>
              <span className="block text-xs text-gray-400">Flagged</span>
              <span className="text-lg font-semibold">
                {reviews.length > 0 ? (() => {
                  const validReviews = reviews.filter(
                    review => review.confidence !== undefined && !isNaN(parseFloat(review.confidence))
                  );
                  if (validReviews.length === 0) return "N/A";
                  const fakeCount = validReviews.filter(
                    review => review.classification === "Fake-Malicious" || review.classification === "Fake-Promotional"
                  ).length;
                  const fakeScore = (fakeCount / validReviews.length) * 100;
                  return `${fakeCount} (${fakeScore.toFixed(0)}%)`;
                })() : "N/A"}
              </span>
            </div>
          </div>
        </div>
        {/* Fake Score */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-pink-100 to-blue-100 rounded-xl p-6 shadow">
          <span className="text-4xl font-bold text-pink-500">
            {reviews.length > 0 ? (() => {
              const validReviews = reviews.filter(
                review => review.confidence !== undefined && !isNaN(parseFloat(review.confidence))
              );
              if (validReviews.length === 0) return "N/A";
              const fakeCount = validReviews.filter(
                review => review.classification === "Fake-Malicious" || review.classification === "Fake-Promotional"
              ).length;
              const fakeScore = (fakeCount / validReviews.length) * 100;
              return `${fakeScore.toFixed(0)}%`;
            })() : "N/A"}
          </span>
          <span className="text-sm text-gray-500 mt-2">Fake Score</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
        {/* Left: Reviews */}
        <div className="flex-1">
          {/* Reviews */}
          <h3 className="mb-4 text-xl font-bold text-gray-800">Reviews</h3>
          <button
            onClick={analyzeReview}
            disabled={analyzing}
            className="mb-4 px-6 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition-glow font-semibold disabled:opacity-50"
          >
            {analyzing ? "Analyzing..." : "Analyze Reviews"}
          </button>
          {analyzeError && (
            <p className="text-red-600 mb-2 flex items-center gap-2">
              <span>❌</span> {analyzeError}
            </p>
          )}
          {reviews.length === 0 ? (
            finished ? <p className="text-gray-500">No reviews found.</p> : ''
          ) : (
            <ul>
              {reviews.map((review, index) => (
                <li key={index} className="flex items-start mb-6 bg-white rounded-xl shadow p-4">
                  {brokenImages[index] || !review.profilePicture ? (
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-200 mr-4">
                      <UserRound className="w-7 h-7 text-gray-500" />
                    </div>
                  ) : (
                    <img
                      src={review.profilePicture}
                      alt={`${review.user}'s profile`}
                      className="w-12 h-12 rounded-full mr-4 object-cover"
                      onError={() => handleImageError(index)}
                    />
                  )}
                  <div>
                    <div className="font-semibold text-gray-800">{review.user}</div>
                    <div className="text-yellow-500 font-bold">{review.rating}★</div>
                    <div className="text-gray-600">{review.snippet}</div>
                    {review.isoDate && (
                      <div className="text-xs text-gray-400 mt-2">{review.isoDate}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: Star Breakdown */}
        <div className="w-full md:w-[340px] flex flex-col items-center">
          {/* Big Average Rating Star */}
          <div className="flex flex-col items-center mb-8">
            <span className="text-4xl font-bold text-gray-800 mb-2">{avgRating}</span>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-12 h-12 mx-1 ${i < Math.round(avgRating) ? "text-yellow-400" : "text-gray-200"}`}
                  fill={i < Math.round(avgRating) ? "#facc15" : "none"}
                  stroke={i < Math.round(avgRating) ? "#facc15" : "#e5e7eb"}
                />
              ))}
            </div>
            <span className="text-lg text-gray-500 mt-2">{totalReviews} reviews</span>
          </div>
          {/* Star Breakdown Progress Bars */}
          <div className="bg-white rounded-xl shadow p-6 w-full">
            <h2 className="font-bold mb-6 text-gray-800 text-lg text-center">Star Breakdown</h2>
            <ul className="space-y-4">
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviews.filter(r => r.rating === star && !isNaN(r.rating)).length;
                const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <li key={star} className="flex items-center">
                    <span className="flex items-center mr-2 text-yellow-500 font-bold w-10 justify-end">
                      {star} <Star className="w-5 h-5 ml-1" />
                    </span>
                    <div className="flex-1 mx-2">
                      <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-5 rounded-full bg-yellow-400 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <span className="ml-3 text-gray-700 font-semibold w-8 text-right">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

