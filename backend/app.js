const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || "ap-southeast-1",
});

const bedrock = new AWS.BedrockRuntime();

// Mock mode for testing
const USE_MOCK_ANALYSIS = process.env.USE_MOCK_ANALYSIS === "true";

// Helper function to convert body to string
async function bodyToString(body) {
  if (!body) return "";
  if (typeof body === "string") return body;
  if (Buffer.isBuffer(body)) return body.toString("utf-8");
  if (body instanceof Uint8Array) return new TextDecoder().decode(body);
  return JSON.stringify(body);
}

// Helper to clean explanation text
function cleanExplanation(text) {
  if (!text) return "";
  let clean = text.replace(/\\+/g, "").replace(/\s+/g, " ").trim();
  const metadataPattern = /\}\],.*$/;
  clean = clean.replace(metadataPattern, "").trim();
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

// Bedrock call without retries
async function analyzeReview(review) {
  if (USE_MOCK_ANALYSIS) {
    const conf = Math.min(95, Math.max(50, Math.floor(review.length)));
    const types = ["Genuine-Positive", "Genuine-Negative", "Fake-Malicious", "Fake-Promotional"];
    const classification = types[Math.floor(Math.random() * types.length)];
    return {
      completion: `Classification: ${classification}\nConfidence: ${conf}\nExplanation: Mocked analysis based on length.`,
    };
  }

  const prompt = `
  Classify the following food review as [Genuine-Positive/Genuine-Negative/Fake-Malicious/Fake-Promotional].
  Also provide a confidence percentage (0-100) and a brief explanation.

  Review: "${review}"
  
  Format your response as:
  Classification: [Genuine-Positive/Genuine-Negative/Fake-Malicious/Fake-Promotional]
  Confidence: [0-100] (in percentage)
  Explanation: [brief explanation]
  `;

  const params = {
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    accept: "application/json",
    contentType: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    }),
  };

  const response = await bedrock.invokeModel(params).promise();
  const bodyStr = await bodyToString(response.body);

  let parsed;
  try {
    parsed = JSON.parse(bodyStr);
  } catch {
    parsed = { text: bodyStr };
  }

  let completion = "";
  if (parsed.completion) completion = parsed.completion;
  else if (parsed.text) completion = parsed.text;
  else if (parsed?.choices?.length) {
    completion = parsed.choices.map(c => c.text || JSON.stringify(c)).join("\n");
  } else if (parsed?.outputs?.length) {
    completion = parsed.outputs.map(o => {
      if (o.outputText) return o.outputText;
      if (o.content?.[0]?.text) return o.content[0].text;
      return JSON.stringify(o);
    }).join("\n");
  } else {
    completion = JSON.stringify(parsed);
  }

  return { completion, rawParsed: parsed };
}

// Single review analyze endpoint
app.post("/analyze", async (req, res) => {
  const { review } = req.body;
  if (!review) return res.status(400).json({ error: "No review provided" });

  try {
    const result = await analyzeReview(review);
    let classification = "";
    let confidence = "";
    let explanation = "";

    if (result.completion) {
      const match = result.completion.match(
        /Classification:\s*(Genuine-Positive|Genuine-Negative|Fake-Malicious|Fake-Promotional)[\s\S]*?Confidence:\s*(\d+)[\s\S]*?Explanation:\s*([\s\S]*)/i
      );
      if (match) {
        classification = match[1];
        confidence = match[2];
        explanation = cleanExplanation(match[3]);
      }
    }

    res.json({ classification, confidence, explanation, raw: result.completion });
  } catch (error) {
    res.status(500).json({ error: "Analysis failed", details: error.message });
  }
});

// Fetch all reviews
app.get("/reviews", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const reviewsPath = path.join(__dirname, "reviews.json");
  fs.readFile(reviewsPath, "utf-8", (err, data) => {
    if (err) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Failed to read reviews file" })}\n\n`);
      res.write("event: done\ndata: {}\n\n");
      return res.end();
    }
    try {
      const reviews = JSON.parse(data);
      res.write(`event: reviews\ndata: ${JSON.stringify(reviews)}\n\n`);
      res.write("event: done\ndata: {}\n\n");
      res.end();
    } catch {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Failed to parse reviews file" })}\n\n`);
      res.write("event: done\ndata: {}\n\n");
      res.end();
    }
  });
});

// Analyze all reviews sequentially without delays or retries
app.post("/analyze-all", async (req, res) => {
  let reviews = req.body.reviews;
  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    const reviewsPath = path.join(__dirname, "reviews.json");
    try {
      const data = fs.readFileSync(reviewsPath, "utf-8");
      reviews = JSON.parse(data);
    } catch {
      return res.status(500).json({ error: "Failed to read reviews file" });
    }
  }

  const mapped = reviews.map((item, idx) =>
    typeof item === "string" ? { id: idx, snippet: item } : item
  );

  const results = [];
  for (const item of mapped) {
    const reviewText = (item.snippet || item.review || item.text || item.content || "").toString();
    if (!reviewText) {
      results.push({ ...item, classification: "", confidence: "", explanation: "No text", raw: "" });
      continue;
    }

    try {
      const result = await analyzeReview(reviewText);
      const raw = result.completion || "";
      let classification = "";
      let confidence = "";
      let explanation = raw;

      const match = result.completion.match(
        /Classification:\s*(Genuine-Positive|Genuine-Negative|Fake-Malicious|Fake-Promotional)[\s\S]*?Confidence:\s*(\d+)[\s\S]*?Explanation:\s*([\s\S]*)/i
      );
      if (match) {
        classification = match[1];
        confidence = match[2];
        explanation = cleanExplanation(match[3]);
      }

      results.push({ ...item, snippet: reviewText, classification, confidence, explanation, raw });
    } catch (err) {
      console.error("Single review analysis failed:", err.message);
      results.push({ ...item, snippet: reviewText, classification: "", confidence: "", explanation: `Analysis failed: ${err.message}`, raw: "" });
    }
  }

  const reviewsPath = path.join(__dirname, "reviews.json");
  fs.writeFileSync(reviewsPath, JSON.stringify(results, null, 2), "utf-8");
  res.json(results);
});

// Test endpoint
app.get("/", (req, res) => res.send("Backend is running!"));

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
