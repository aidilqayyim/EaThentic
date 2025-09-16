import { useEffect, useState } from "react";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [stages, setStages] = useState([
    { stage: "Getting reviews", status: "loading", color: "grey" },
    { stage: "Loading the first reviews", status: "loading", color: "grey" },
    { stage: "Loading the rest of the reviews", status: "loading", color: "grey" },
    { stage: "Filtering the reviews", status: "loading", color: "grey" },
  ]);
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);

    useEffect(() => {
    const placeId = new URLSearchParams(window.location.search).get("placeId");
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
        } else if (data.type === "error") {
        setError(data.message);
        evtSource.close();
        } else if (data.type === "done") {
        setFinished(true);
        evtSource.close();
        }
    };

    evtSource.onerror = () => {
        // ❌ don’t show "connection lost" if we already finished
        if (!finished) {
        setError("Connection lost");
        }
        evtSource.close();
    };

    return () => {
        evtSource.close();
    };
    }, [finished]);

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

      <h3>Reviews</h3>
      {reviews.length === 0 ? (
        finished ? <p>No reviews found.</p> : ''
      ) : (
        <ul>
          {reviews.map((review) => (
            <li key={review.id}>
              <strong>{review.user}</strong> ({review.rating}★): {review.snippet}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
