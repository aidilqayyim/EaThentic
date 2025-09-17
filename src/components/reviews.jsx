import { useEffect, useState, useRef } from "react";

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

    return clean;
  };

  useEffect(() => {
    const placeId = new URLSearchParams(window.location.search).get("id");
    if (!placeId) {
      setError("Missing placeId");
      return;
    }

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
      <ul>
        {stages.map((s, i) => (
          <li key={i} style={{ color: s.color }}>
            {s.stage} ({s.status})
          </li>
        ))}
      </ul>

      <h3 className='mb-3'>Reviews</h3>
      <button onClick={analyzeReview} disabled={analyzing} className="mb-2">
        {analyzing ? "Analyzing..." : "Analyze Reviews"}
      </button>
      {analyzeError && <p style={{ color: "red" }}>❌ {analyzeError}</p>}
      {reviews.length === 0 ? (
        finished ? <p>No reviews found.</p> : ''
      ) : (
        <ul>
          {reviews.map((review, index) => (
            <li key={index + 1}>
              <div>{review.user}</div> ({review.rating}★): {review.snippet}
              <br />
              {review.isoDate && <div className='mb-3'>{review.isoDate}</div>}
              {review.classification && (
                <div style={{ marginTop: "0.5em", marginBottom: "1em" }}>
                  <strong>Classification:</strong> {review.classification}<br />
                  <strong>Confidence:</strong> {review.confidence}<br />
                  <strong>Explanation:</strong> {formatExplanation(review.explanation)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
