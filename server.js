require("dotenv").config();
const express = require("express");
const cors = require("cors");
const https = require("follow-redirects").https;
const process = require("process");

const app = express();
app.use(cors());
app.use(express.json());

const SERPER_API_KEY = process.env.SERPER_API_KEY;

function fetchSerperPage(body) {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      hostname: "google.serper.dev",
      path: "/reviews",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      maxRedirects: 20,
    };

    const serperReq = https.request(options, (serperRes) => {
      let chunks = [];
      serperRes.on("data", (chunk) => chunks.push(chunk));
      serperRes.on("end", () => {
        const bodyStr = Buffer.concat(chunks).toString();
        try {
          const data = JSON.parse(bodyStr);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      });
    });

    serperReq.on("error", (error) => reject(error));
    serperReq.write(JSON.stringify(body));
    serperReq.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// uses Server-Sent Events (SSE) to stage loading (untuk buat loading ikut stages)
app.get("/reviews", async (req, res) => {
  const placeId = req.query.placeId;
  if (!placeId) {
    return res.status(400).json({ error: "Missing placeId" });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  function sendStage(stage, status, color) {
    res.write(
      `data: ${JSON.stringify({ type: "stage", stage, status, color })}\n\n`
    );
  }

  function sendReviews(reviews) {
    res.write(`data: ${JSON.stringify({ type: "reviews", reviews })}\n\n`);
  }

  try {
    let results = [];
    let token = null;

    // Stage 1
    sendStage("Getting reviews", "done", "green");

    for (let i = 0; i < 2; i++) {
      const body = token
        ? { placeId, nextPageToken: token, gl: "my" }
        : { placeId, gl: "my" };

      const data = await fetchSerperPage(body);

      if (!data.reviews || data.reviews.length === 0) break;

      // Stage 2 & 3
      if (i === 0) sendStage("Loading the first reviews", "done", "green");
      if (i === 0 && !data.nextPageToken) {
        // If only one page of reviews is found, mark stage 3 as done
        sendStage("Loading the rest of the reviews", "done", "green");
      } else if (i > 0) {
        sendStage("Loading the rest of the reviews", "done", "green");
      }

      // ✅ Only take reviews with a snippet
      const filtered = data.reviews
        .filter((r) => r.snippet && r.snippet.trim() !== "")
        .map((r, idx) => ({
          id: results.length + idx + 1,
          rating: r.rating,
          snippet: r.snippet,
          user: r.user?.name || "Anonymous",
          isoDate: r.date,
          profilePicture: r.user?.thumbnail || null,
        }));

      results.push(...filtered);

      if (data.nextPageToken) {
        token = data.nextPageToken;
        await sleep(2000);
      } else {
        break;
      }
    }

    // Stage 4
    sendStage("Filtering the reviews", "done", "green");

    // Send reviews dekat reviews.jsx
    sendReviews(results);

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();

  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
    res.end();
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
