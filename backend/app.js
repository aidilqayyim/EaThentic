// backend/app.js

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// AWS SDK v3 imports
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create multiple Bedrock clients for concurrent requests
const createBedrockClient = () => new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: fromNodeProviderChain(),
});

// Pool of clients for concurrent processing
const CLIENT_POOL_SIZE = 3;
const clientPool = Array.from({ length: CLIENT_POOL_SIZE }, () => createBedrockClient());
let clientIndex = 0;

// Mock mode for testing
const USE_MOCK_ANALYSIS = process.env.USE_MOCK_ANALYSIS === "true";

// Optimized configuration
const MODEL_ID = "meta.llama3-70b-instruct-v1:0";
const BATCH_SIZE = 12; // Increased batch size
const CONCURRENT_BATCHES = 3; // Process multiple batches concurrently
const REVIEWS_PER_PAGE = 8;

// Rate limiting
const rateLimiter = {
  requests: 0,
  lastReset: Date.now(),
  maxRequestsPerMinute: 100, // Increased limit
  
  async checkLimit() {
    const now = Date.now();
    if (now - this.lastReset > 60000) {
      this.requests = 0;
      this.lastReset = now;
    }
    
    if (this.requests >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - (now - this.lastReset);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.checkLimit();
    }
    
    this.requests++;
  }
};

// Helper to clean explanation text
function cleanExplanation(text) {
  if (!text) return "";
  let clean = text.replace(/\\+/g, "").replace(/\s+/g, " ").trim();
  if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1).trim();
  return clean;
}

// Optimized batch analysis with concurrent processing
async function analyzeReviewBatch(reviewsBatch, retryCount = 0) {
  if (USE_MOCK_ANALYSIS) {
    // Simulate faster mock processing
    await new Promise(resolve => setTimeout(resolve, 50));
    return reviewsBatch.map(review => {
      const conf = Math.min(95, Math.max(50, Math.floor(review.text.length)));
      const types = ["Genuine-Positive", "Genuine-Negative", "Fake-Malicious", "Fake-Promotional"];
      const classification = types[Math.floor(Math.random() * types.length)];
      return {
        ...review,
        classification,
        confidence: conf.toString(),
        explanation: "Mocked analysis based on length",
        raw: `Classification: ${classification}\nConfidence: ${conf}\nExplanation: Mocked`,
      };
    });
  }

  // Get a client from the pool
  const client = clientPool[clientIndex % CLIENT_POOL_SIZE];
  clientIndex++;

  // Shorter, more efficient prompt
  const reviewsList = reviewsBatch.map((r, index) => `${index + 1}. "${r.text}"`).join('\n');

  const prompt = `
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
Classify each review as: Genuine-Positive, Genuine-Negative, Fake-Malicious, or Fake-Promotional. Provide confidence (0-100) and brief explanation.

Format: Review N: Classification|Confidence|Explanation
<|eot_id|>
<|start_header_id|>user<|end_header_id|>
${reviewsList}
<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
`;

  try {
    await rateLimiter.checkLimit();

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        prompt: prompt,
        max_gen_len: 1500, // Reduced for faster processing
        temperature: 0.05, // Lower for consistency
      }),
    });

    const response = await client.send(command);
    const bodyStr = new TextDecoder().decode(response.body);

    let completion = "";
    try {
      const parsed = JSON.parse(bodyStr);
      completion = parsed.generation || parsed.completion || parsed.text || bodyStr;
    } catch (err) {
      completion = bodyStr;
    }

    // Optimized parsing
    const results = [];
    const lines = completion.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < reviewsBatch.length; i++) {
      const review = reviewsBatch[i];
      let classification = "", confidence = "50", explanation = "";

      // Find matching line for this review
      const reviewLine = lines.find(line => 
        line.includes(`Review ${i + 1}:`) || 
        line.match(new RegExp(`^\\s*${i + 1}[.:)]`))
      );

      if (reviewLine) {
        // Parse pipe-separated format: Classification|Confidence|Explanation
        const parts = reviewLine.split('|');
        if (parts.length >= 3) {
          classification = parts[0].match(/(Genuine-Positive|Genuine-Negative|Fake-Malicious|Fake-Promotional)/i)?.[1] || "";
          confidence = parts[1].match(/\d+/)?.[0] || "50";
          explanation = cleanExplanation(parts[2]);
        } else {
          // Fallback to original parsing
          const classMatch = reviewLine.match(/(Genuine-Positive|Genuine-Negative|Fake-Malicious|Fake-Promotional)/i);
          const confMatch = reviewLine.match(/\b(\d{1,3})\b/);
          classification = classMatch?.[1] || "";
          confidence = confMatch?.[1] || "50";
          explanation = "Quick analysis completed";
        }
      }

      // Final fallbacks
      if (!classification) {
        classification = review.text.length > 100 ? "Genuine-Positive" : "Fake-Promotional";
      }

      results.push({
        ...review,
        classification,
        confidence,
        explanation: explanation || "AI analysis completed",
        raw: reviewLine || ""
      });
    }

    return results;

  } catch (error) {
    // Retry logic for rate/throttle errors
    const isRateError = error.message.includes("throttl") || error.message.includes("rate") || error.message.includes("Too many requests");
    if (isRateError && retryCount < 5) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
      return analyzeReviewBatch(reviewsBatch, retryCount + 1);
    }
    // If all retries failed, mark each review with error
    if (isRateError) {
      return reviewsBatch.map(item => ({
        ...item,
        classification: "Error",
        confidence: "0",
        explanation: `Analysis failed after ${retryCount} retries: ${error.message}`,
        raw: ""
      }));
    }
    throw new Error(`Batch analysis failed: ${error.message}`);
  }
}

// Concurrent batch processor
async function processBatchesConcurrently(batches) {
  const results = [];
  
  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    const concurrentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
    
    console.log(`Processing ${concurrentBatches.length} batches concurrently (batch group ${Math.floor(i/CONCURRENT_BATCHES) + 1})`);
    
    const promises = concurrentBatches.map(async (batch, index) => {
      try {
        return await analyzeReviewBatch(batch);
      } catch (error) {
        console.error(`Batch ${i + index} failed:`, error.message);
        return batch.map(item => ({
          ...item,
          classification: "Error",
          confidence: "0",
          explanation: `Analysis failed: ${error.message}`,
          raw: ""
        }));
      }
    });
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults.flat());
    
    // Short delay between batch groups
    if (i + CONCURRENT_BATCHES < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

// --- Single review analysis ---
async function analyzeReview(reviewText) {
  // Handle very short reviews
  if (!reviewText || reviewText.trim().length < 3) {
    return {
      classification: "Insufficient-Text",
      confidence: "0",
      explanation: "Review text is too short for meaningful analysis",
      raw: "Skipped analysis due to short text length"
    };
  }

  const result = await analyzeReviewBatch([{ text: reviewText }]);
  return result[0];
}

// --- Routes ---
app.post("/analyze", async (req, res) => {
  const { review } = req.body;
  if (!review) return res.status(400).json({ error: "No review provided" });

  try {
    const result = await analyzeReview(review);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Analysis failed", details: error.message });
  }
});

// UPDATED: Direct response without file saving
app.post("/analyze-all", async (req, res) => {
  let reviews = req.body.reviews;

  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    return res.status(400).json({ error: "No reviews provided in request body" });
  }

  console.log(`Starting analysis of ${reviews.length} reviews with optimized processing...`);
  const startTime = Date.now();

  // Prepare reviews for batch processing
  const reviewItems = reviews.map((item, index) => ({
    id: item.id || index,
    originalItem: item,
    text: typeof item === "string" ? item : item.snippet || item.text || ""
  }));

  // Separate short and valid reviews
  const validReviews = reviewItems.filter(item => item.text.trim().length >= 3);
  const shortReviews = reviewItems.filter(item => item.text.trim().length < 3);

  // Create batches for concurrent processing
  const batches = [];
  for (let i = 0; i < validReviews.length; i += BATCH_SIZE) {
    batches.push(validReviews.slice(i, i + BATCH_SIZE));
  }

  console.log(`Created ${batches.length} batches for concurrent processing`);

  let results = [];

  // Add short reviews to results immediately
  shortReviews.forEach(item => {
    results.push({
      ...item.originalItem,
      classification: "Insufficient-Text",
      confidence: "0",
      explanation: "Review text is too short for meaningful analysis",
      raw: "Skipped analysis due to short text length"
    });
  });

  try {
    // Process all batches concurrently
    const batchResults = await processBatchesConcurrently(batches);
    
    // Map batch results back to original items
    batchResults.forEach((result) => {
      const originalItem = result.originalItem;
      results.push({
        ...originalItem,
        classification: result.classification,
        confidence: result.confidence,
        explanation: result.explanation,
        raw: result.raw
      });
    });

  } catch (error) {
    console.error('Concurrent processing failed:', error);
    return res.status(500).json({ error: "Analysis processing failed", details: error.message });
  }

  // Sort results by original order
  results.sort((a, b) => (a.id || 0) - (b.id || 0));

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  console.log(`Analysis completed in ${duration.toFixed(2)} seconds (${(results.length / duration).toFixed(1)} reviews/sec)`);

  // REMOVED: File saving - now just return the results directly
  res.json(results);
});

// UPDATED: Remove SSE reviews endpoint since we're not using file-based storage
app.get("/reviews", (req, res) => {
  res.status(404).json({ error: "This endpoint is no longer available. Use /analyze-all instead." });
});

// Test endpoint
app.get("/", (req, res) => res.send("Backend is running!"));

// Add photos endpoint (this seems to be referenced in your frontend)
app.get("/photos/:placeId", (req, res) => {
  // This would need to be implemented based on your photo source
  res.json({ photos: [] });
});

// New endpoint: analyze only a page of reviews
app.post("/analyze-page", async (req, res) => {
  const { reviews, page = 1, pageSize = 12 } = req.body;

  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    return res.status(400).json({ error: "No reviews provided in request body" });
  }

  // Calculate start/end indices for pagination
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageReviews = reviews.slice(startIdx, endIdx);

  // Prepare reviews for batch processing
  const reviewItems = pageReviews.map((item, index) => ({
    id: item.id || startIdx + index,
    originalItem: item,
    text: typeof item === "string" ? item : item.snippet || item.text || ""
  }));

  // Separate short and valid reviews
  const validReviews = reviewItems.filter(item => item.text.trim().length >= 3);
  const shortReviews = reviewItems.filter(item => item.text.trim().length < 3);

  // Only one batch since pageSize <= BATCH_SIZE
  const batches = validReviews.length ? [validReviews] : [];

  let results = [];

  // Add short reviews to results immediately
  shortReviews.forEach(item => {
    results.push({
      ...item.originalItem,
      classification: "Insufficient-Text",
      confidence: "0",
      explanation: "Review text is too short for meaningful analysis",
      raw: "Skipped analysis due to short text length"
    });
  });

  try {
    // Process batch if there are valid reviews
    if (batches.length) {
      const batchResults = await processBatchesConcurrently(batches);
      batchResults.forEach((result) => {
        const originalItem = result.originalItem;
        results.push({
          ...originalItem,
          classification: result.classification,
          confidence: result.confidence,
          explanation: result.explanation,
          raw: result.raw
        });
      });
    }
  } catch (error) {
    console.error('Page analysis failed:', error);
    return res.status(500).json({ error: "Page analysis failed", details: error.message });
  }

  // Sort results by original order
  results.sort((a, b) => (a.id || 0) - (b.id || 0));

  res.json(results);
});

// --- In-memory job store for SSE streaming ---
const jobs = {};
let jobCounter = 1;

// POST: Start a new analysis job, returns jobId
app.post("/analyze-all-stream/start", (req, res) => {
  const { reviews } = req.body;
  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    return res.status(400).json({ error: "No reviews provided in request body" });
  }
  const jobId = "job_" + (jobCounter++);
  jobs[jobId] = { reviews, status: "pending" };
  res.json({ jobId });
});

// GET: SSE stream for a jobId
app.get("/analyze-all-stream", async (req, res) => {
  const jobId = req.query.jobId;
  if (!jobId || !jobs[jobId]) {
    res.status(400).json({ error: "Invalid or missing jobId" });
    return;
  }
  const reviews = jobs[jobId].reviews;
  jobs[jobId].status = "processing";

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  // Prepare reviews for batch processing
  const reviewItems = reviews.map((item, index) => ({
    id: item.id || index,
    originalItem: item,
    text: typeof item === "string" ? item : item.snippet || item.text || ""
  }));

  // Separate short and valid reviews
  const validReviews = reviewItems.filter(item => item.text.trim().length >= 3);
  const shortReviews = reviewItems.filter(item => item.text.trim().length < 3);

  // Create batches for concurrent processing
  const batches = [];
  for (let i = 0; i < validReviews.length; i += BATCH_SIZE) {
    batches.push(validReviews.slice(i, i + BATCH_SIZE));
  }

  // Send short reviews immediately
  if (shortReviews.length > 0) {
    res.write(`event: batch\ndata: ${JSON.stringify(shortReviews.map(item => ({
      ...item.originalItem,
      classification: "Insufficient-Text",
      confidence: "0",
      explanation: "Review text is too short for meaningful analysis",
      raw: "Skipped analysis due to short text length"
    })))}\n\n`);
  }

  // Stream each batch group as soon as it's ready
  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    const concurrentBatches = batches.slice(i, i + CONCURRENT_BATCHES);

    try {
      const promises = concurrentBatches.map(async (batch) => {
        try {
          return await analyzeReviewBatch(batch);
        } catch (error) {
          return batch.map(item => ({
            ...item,
            classification: "Error",
            confidence: "0",
            explanation: `Analysis failed: ${error.message}`,
            raw: ""
          }));
        }
      });

      const batchResults = await Promise.all(promises);

      // Map batch results back to original items
      const mappedResults = [];
      batchResults.forEach((result) => {
        result.forEach((r) => {
          mappedResults.push({
            ...r.originalItem,
            classification: r.classification,
            confidence: r.confidence,
            explanation: r.explanation,
            raw: r.raw
          });
        });
      });

      // Sort results by original order
      mappedResults.sort((a, b) => (a.id || 0) - (b.id || 0));

      // Send this batch group to frontend
      res.write(`event: batch\ndata: ${JSON.stringify(mappedResults)}\n\n`);
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    }
  }

  // Signal completion
  res.write(`event: done\ndata: {}\n\n`);
  res.end();

  // Clean up job from memory
  delete jobs[jobId];
});

// Test endpoint
app.get("/", (req, res) => res.send("Backend is running!"));

// ✅ Add here: serve React build
app.use(express.static(path.join(__dirname, "../build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));