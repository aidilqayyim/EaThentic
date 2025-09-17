import fs from "fs";

// Example: Replace this with your actual scraping logic
const scrapedReviews = [
  "Delicious food, will come again!",
  "Service was slow and the food was cold.",
  "Absolutely loved the atmosphere and taste.",
  "Overpriced for the quality, not recommended."
];

// Convert scraped texts into structured objects
const reviewsArray = scrapedReviews.map((text, i) => ({
  id: i + 1, // unique ID
  user: "Anonymous", // or scraped username if available
  rating: null, // set if you can scrape ratings, otherwise leave null
  snippet: text,
  isoDate: new Date().toISOString().split("T")[0] // today’s date
}));

// Save to backend/reviews.json
fs.writeFileSync(
  "./backend/reviews.json",
  JSON.stringify(reviewsArray, null, 2),
  "utf-8"
);

console.log("✅ Scraped reviews saved to backend/reviews.json");
