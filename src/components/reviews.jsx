import { useEffect, useState, useRef } from "react";
import { Star, UserRound } from "lucide-react";

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

  if (error) {
    return <p style={{ color: "red" }}>❌ {error}</p>;
  }

  return (
    <div>
      <div className='w-full border-b-gray-500 mb-4 border-b-2 py-5 flex px-3'>
        <div className=' w-[70%] flex flex-col'>
          <div className='flex flex-row'>
            <div className="w-[110px] h-[110px] flex-shrink-0">
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
                className="w-full h-full flex items-center justify-center "
                style={{ display: finished && photoUrl ? 'none' : 'flex' }}
              >
                <UserRound className="w-12 h-12 text-gray-500" />
              </div>
            </div>
            <div className="">
              <h1 className="break-words">{placeDetails.name || "Restaurant Name"}</h1>
              <h1 className="break-words">{placeDetails.address || "Location"}</h1>
              <h1 className="break-words">
                {placeDetails.hours.length > 0 ? placeDetails.hours.join(", ") : "Open Hours"}
              </h1>
            </div>
            <div className=' w-[40%]'>
              Contact: {placeDetails.contact}
            </div>
          </div>
          <h1>Total Reviews: {totalReviews}</h1>
          <h1>Average Rating: {avgRating}</h1>
          <div>
            Our system flagged something bla bla bla bla
          </div>
        </div>
        <div className=' w-[30%]'>
          <div className=''>
            {reviews.length > 0 ? (
              (() => {
                // Filter valid reviews (exclude those with missing or invalid confidence)
                const validReviews = reviews.filter(
                  review => review.confidence !== undefined && !isNaN(parseFloat(review.confidence))
                );

                if (validReviews.length === 0) return "N/A";

                // Count fake reviews
                const fakeCount = validReviews.filter(
                  review => review.classification === "Fake-Malicious" || review.classification === "Fake-Promotional"
                ).length;

                // Calculate fake score as a percentage
                const fakeScore = (fakeCount / validReviews.length) * 100;

                return (
                  <>
                    {fakeScore.toFixed(0)}%
                    <span> Fake Score</span>
                  </>
                );
              })()
            ) : (
              "N/A"
            )}
          </div>
          <div className='flex justify-between items-center'>
            <h1>Total Reviews</h1>
            <p>{totalReviews}</p>
          </div>
          <div className='flex justify-between items-center'>
            <h1>Avg Rating</h1>
            <p>{avgRating}</p>
          </div>
          <div className='flex justify-between items-center'>
            <h1>Flagged</h1>
            <p>
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
            </p>
          </div>
        </div>
      </div>
      <div className='flex'>
        <div className='w-[65%]'>
          <ul>
            {stages.map((s, i) => (
              <li key={i} style={{ color: s.color }}>
                {s.stage} ({s.status})
              </li>
            ))}
          </ul>

          <h3 className='mb-3'>Reviews</h3>
          <button onClick={analyzeReview} disabled={analyzing} className="mb-2 bg-pink-200 rounded-md hover:bg-pink-500 duration-200">
            {analyzing ? "Analyzing..." : "Analyze Reviews"}
          </button>
          {analyzeError && <p style={{ color: "red" }}>❌ {analyzeError}</p>}
          {reviews.length === 0 ? (
            finished ? <p>No reviews found.</p> : ''
          ) : (
            <ul>
              {reviews.map((review, index) => (
                <li key={index} className="flex items-start mb-4">
                  {brokenImages[index] || !review.profilePicture ? (
                    // Show UserRound icon as fallback
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 mr-3">
                      <UserRound className="w-6 h-6 text-gray-500" />
                    </div>
                  ) : (
                    // Show user profile picture
                    <img
                      src={review.profilePicture}
                      alt={`${review.user}'s profile`}
                      className="w-10 h-10 rounded-full mr-3 object-cover"
                      onError={() => handleImageError(index)}
                    />
                  )}
                  <div>
                    <div>{review.user}</div> ({review.rating}★): {review.snippet}
                      <br />
                      {review.isoDate && <div className="mb-3">{review.isoDate}</div>}
                    </div>
                </li>
              ))}            
            </ul>
          )}
        </div>
        <div>
          {/* Star Breakdown */}
          <div className="ml-6">
            <h2 className="font-bold mb-2">Star Breakdown</h2>
            <ul>
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviews.filter(
                  r => r.rating === star && !isNaN(r.rating)
                ).length;
                return (
                  <li key={star} className="flex items-center mb-1">
                    <span className="flex items-center mr-2">
                      {star} <Star className="w-4 h-4 mx-1" />
                    </span>
                    <span>{count}</span>
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

