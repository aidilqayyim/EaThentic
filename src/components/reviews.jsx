import { useEffect, useState } from "react";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const placeId = new URLSearchParams(window.location.search).get("placeId");
    if (!placeId) {
      setError("Missing placeId");
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`http://localhost:4000/reviews?placeId=${placeId}`)
      .then((res) => res.json())
      .then((data) => {
        setReviews(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>⏳ Loading reviews (including next pages)...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>❌ {error}</p>;
  }

  return (
    <div>
      {reviews.length === 0 ? (
        <p>No reviews found.</p>
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
