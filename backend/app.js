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

// Create Bedrock client using SSO/default credentials
const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: fromNodeProviderChain(),
});

// Mock mode for testing
const USE_MOCK_ANALYSIS = process.env.USE_MOCK_ANALYSIS === "true";

// Model configuration
const MODEL_ID = "meta.llama3-70b-instruct-v1:0";
const BATCH_SIZE = 8; // Optimal batch size for Llama 3 70B

// Helper to clean explanation text
function cleanExplanation(text) {
  if (!text) return "";
  let clean = text.replace(/\\+/g, "").replace(/\s+/g, " ").trim();
  if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1).trim();
  return clean;
}

// --- Updated batch analysis function with proper parsing ---
async function analyzeReviewBatch(reviewsBatch) {
  if (USE_MOCK_ANALYSIS) {
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

  // Create batch prompt for Llama format
  const reviewsList = reviewsBatch.map((r, index) => `REVIEW ${index + 1}: "${r.text}"`).join('\n\n');

const prompt = `
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are an expert food review analyst. Analyze each review and classify it into one of these categories:
- Genuine-Positive: Authentic positive feedback
- Genuine-Negative: Authentic negative feedback  
- Fake-Malicious: Fake review intended to harm the business
- Fake-Promotional: Fake review intended to promote the business

For each review, provide:
1. Classification
2. Confidence percentage (0-100)
3. Brief explanation

**CRITICAL**: Format your response EXACTLY as shown below. Do NOT add any introductory text like "Here are the analyses:".
<|eot_id|>
<|start_header_id|>user<|end_header_id|>
Analyze these food reviews:

${reviewsList}

Provide your analysis in this exact format for each review:

Review 1:
Classification: [category]
Confidence: [percentage]
Explanation: [brief explanation]

Review 2:
Classification: [category]
Confidence: [percentage]
Explanation: [brief explanation]

[Continue for all reviews...]
<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
`;

  try {
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        prompt: prompt,
        max_gen_len: 2048, // Increased for better batch responses
        temperature: 0.1, // Lower temperature for more consistent formatting
      }),
    });

    const response = await bedrock.send(command);
    const bodyStr = new TextDecoder().decode(response.body);

    let completion = "";
    try {
      const parsed = JSON.parse(bodyStr);
      completion = parsed.generation || parsed.completion || parsed.text || bodyStr;
    } catch (err) {
      completion = bodyStr;
    }

    // console.log("Raw completion:", completion); // Debug log

    // Parse batch response - improved parsing logic
    const results = [];
    
    // Split by review markers and filter out empty blocks
    const reviewBlocks = completion.split(/(?=Review\s+\d+:)/).filter(block => block.trim() && !block.includes("Here are the analyses:"));
    
    // If we don't have enough blocks, create empty ones
    while (reviewBlocks.length < reviewsBatch.length) {
      reviewBlocks.push("");
    }

    for (let i = 0; i < reviewsBatch.length; i++) {
      const review = reviewsBatch[i];
      const block = reviewBlocks[i] || "";

      // Extract classification, confidence, and explanation with more robust regex
      const classificationMatch = block.match(/Classification:\s*(Genuine-Positive|Genuine-Negative|Fake-Malicious|Fake-Promotional)/i);
      const confidenceMatch = block.match(/Confidence:\s*(\d+)/i);
      const explanationMatch = block.match(/Explanation:\s*([\s\S]*?)(?=\n*(?:Review\s+\d+:|\n*$))/i);

      let classification = classificationMatch ? classificationMatch[1] : "";
      let confidence = confidenceMatch ? confidenceMatch[1] : "";
      let explanation = explanationMatch ? cleanExplanation(explanationMatch[1]) : "";

      // If we couldn't parse properly, try alternative patterns
      if (!classification || !confidence || !explanation) {
        // Try to find the pattern without "Review X:" prefix
        const altClassificationMatch = block.match(/(Genuine-Positive|Genuine-Negative|Fake-Malicious|Fake-Promotional)/i);
        const altConfidenceMatch = block.match(/\b(\d{1,3})\b/);
        const altExplanationMatch = block.match(/Explanation:\s*([\s\S]*?)$/i);
        
        classification = classification || (altClassificationMatch ? altClassificationMatch[1] : "");
        confidence = confidence || (altConfidenceMatch ? altConfidenceMatch[1] : "50");
        explanation = explanation || (altExplanationMatch ? cleanExplanation(altExplanationMatch[1]) : "");
      }

      // Final fallback if still no classification
      if (!classification) {
        const lowerBlock = block.toLowerCase();
        if (lowerBlock.includes("genuine-positive") || lowerBlock.includes("positive")) classification = "Genuine-Positive";
        else if (lowerBlock.includes("genuine-negative") || lowerBlock.includes("negative")) classification = "Genuine-Negative";
        else if (lowerBlock.includes("fake-malicious") || lowerBlock.includes("malicious")) classification = "Fake-Malicious";
        else if (lowerBlock.includes("fake-promotional") || lowerBlock.includes("promotional")) classification = "Fake-Promotional";
        else classification = "Unknown";
      }

      if (!confidence) {
        const anyNumberMatch = block.match(/\b(\d{1,3})\b/);
        confidence = anyNumberMatch ? anyNumberMatch[1] : "50";
      }

      if (!explanation) {
        explanation = "AI analysis completed but format unexpected";
      }

      results.push({
        ...review,
        classification,
        confidence,
        explanation,
        raw: block
      });
    }

    return results;

  } catch (error) {
    // Handle rate limiting
    if (error.message.includes("Too many requests") || error.message.includes("rate") || error.message.includes("throttl")) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return analyzeReviewBatch(reviewsBatch);
    }
    
    throw new Error(`Batch analysis failed: ${error.message}`);
  }
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

app.post("/analyze-all", async (req, res) => {
  let reviews = req.body.reviews;

  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    const reviewsPath = path.join(__dirname, "reviews.json");
    try {
      reviews = JSON.parse(fs.readFileSync(reviewsPath, "utf-8"));
    } catch {
      return res.status(500).json({ error: "Failed to read reviews file" });
    }
  }

  const results = [];

  // Prepare reviews for batch processing
  const reviewItems = reviews.map((item, index) => ({
    id: item.id || index,
    originalItem: item,
    text: typeof item === "string" ? item : item.snippet || item.text || ""
  }));

  // Filter out short reviews
  const validReviews = reviewItems.filter(item => item.text.trim().length >= 3);
  const shortReviews = reviewItems.filter(item => item.text.trim().length < 3);

  // Add short reviews to results
  shortReviews.forEach(item => {
    results.push({
      ...item.originalItem,
      classification: "Insufficient-Text",
      confidence: "0",
      explanation: "Review text is too short for meaningful analysis",
      raw: "Skipped analysis due to short text length"
    });
  });

  // Process in batches
  for (let i = 0; i < validReviews.length; i += BATCH_SIZE) {
    const batch = validReviews.slice(i, i + BATCH_SIZE);
    
    try {
      const batchResults = await analyzeReviewBatch(batch);
      
      // Map batch results back to original items
      batchResults.forEach((result, index) => {
        const originalItem = batch[index].originalItem;
        results.push({
          ...originalItem,
          classification: result.classification,
          confidence: result.confidence,
          explanation: result.explanation,
          raw: result.raw
        });
      });

      console.log(`Processed batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(validReviews.length/BATCH_SIZE)}`);
      
      // Add delay between batches
      if (i + BATCH_SIZE < validReviews.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay for Llama
      }

    } catch (err) {
      console.error(`Failed to process batch starting at index ${i}:`, err.message);
      
      // Add error results for failed batch
      batch.forEach(item => {
        results.push({
          ...item.originalItem,
          classification: "Error",
          confidence: "0",
          explanation: `Batch analysis failed: ${err.message}`,
          raw: ""
        });
      });
    }
  }

  // Sort results by original order
  results.sort((a, b) => (a.id || 0) - (b.id || 0));

  // Save results
  const reviewsPath = path.join(__dirname, "reviews.json");
  fs.writeFileSync(reviewsPath, JSON.stringify(results, null, 2), "utf-8");

  res.json(results);
});

// Fetch reviews (SSE)
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

// Test endpoint
app.get("/", (req, res) => res.send("Backend is running!"));

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));