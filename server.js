const express = require("express");
const cors = require("cors");
const https = require("follow-redirects").https;

const app = express();
app.use(cors());
app.use(express.json());

const SERPER_API_KEY =
  process.env.SERPER_API_KEY ||
  "7651777abb2a5c57bc954b33cee11d7481fee1af";

// helper: fetch one page (placeId OR nextPageToken)
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

    // console.log("📤 Sending request body:", body);

    const serperReq = https.request(options, (serperRes) => {
      // console.log("📥 Got response with status:", serperRes.statusCode);

      let chunks = [];
      serperRes.on("data", (chunk) => chunks.push(chunk));
      serperRes.on("end", () => {
        const bodyStr = Buffer.concat(chunks).toString();
        // console.log("📄 Raw response string:", bodyStr);

        try {
          const data = JSON.parse(bodyStr);
          resolve(data);
        } catch (err) {
          // console.error("❌ JSON parse error:", err.message);
          reject(err);
        }
      });
    });

    serperReq.on("error", (error) => {
      // console.error("❌ Request error:", error);
      reject(error);
    });

    serperReq.write(JSON.stringify(body));
    serperReq.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.get("/reviews", async (req, res) => {
  const placeId = req.query.placeId;
  if (!placeId) {
    return res.status(400).json({ error: "Missing placeId" });
  }

  try {
    let results = [];
    let token = null;

    for (let i = 0; i < 3; i++) {
      // Always include placeId, even when using nextPageToken
      const body = token
        ? { placeId, nextPageToken: token, gl: "my" }
        : { placeId, gl: "my" };

      const data = await fetchSerperPage(body);

      // console.log(`📄 Page ${i + 1} raw response:`, JSON.stringify(data, null, 2));

      if (!data.reviews || data.reviews.length === 0) break;

      results.push(
        ...data.reviews.map((r, idx) => ({
          id: `${i}-${idx}`, // unique id
          rating: r.rating,
          snippet: r.snippet,
          user: r.user?.name || "Anonymous",
          isoDate: r.date,
        }))
      );

      if (data.nextPageToken) {
        // console.log(`🔑 Page ${i + 1} nextPageToken:`, data.nextPageToken);
        token = data.nextPageToken;
        await sleep(2000); // avoid rate-limit
      } else {
        // console.log(`⚠️ No nextPageToken found on page ${i + 1}`);
        break;
      }
    }

    res.json(results);
  } catch (err) {
    // console.error("❌ Error fetching reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
