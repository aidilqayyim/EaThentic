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

// Helper to clean explanation text
function cleanExplanation(text) {
  if (!text) return "";
  let clean = text.replace(/\\+/g, "").replace(/\s+/g, " ").trim();
  if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1).trim();
  return clean;
}

// --- Updated analyzeReview function with rate limiting and short text handling ---
async function analyzeReview(review) {
  // Handle very short reviews that don't need AI analysis
  if (!review || review.trim().length < 3) {
    return {
      classification: "Insufficient-Text",
      confidence: "0",
      explanation: "Review text is too short for meaningful analysis",
      raw: "Skipped analysis due to short text length"
    };
  }

  if (USE_MOCK_ANALYSIS) {
    const conf = Math.min(95, Math.max(50, Math.floor(review.length)));
    const types = ["Genuine-Positive", "Genuine-Negative", "Fake-Malicious", "Fake-Promotional"];
    const classification = types[Math.floor(Math.random() * types.length)];
    return {
      classification,
      confidence: conf.toString(),
      explanation: "Mocked analysis based on length",
      raw: `Classification: ${classification}\nConfidence: ${conf}\nExplanation: Mocked`,
    };
  }

  const prompt = `
Classify the following food review as [Genuine-Positive/Genuine-Negative/Fake-Malicious/Fake-Promotional].
Also provide a confidence percentage (0-100) and a brief explanation.

Review: "${review}"

Format your response as:
Classification: [Genuine-Positive/Genuine-Negative/Fake-Malicious/Fake-Promotional]
Confidence: [0-100]
Explanation: [brief explanation]
`;

  console.log("Review text:", review);
  console.log("Prompt sent to Bedrock:", prompt);

  try {
    // Add delay to avoid rate limiting (100ms between requests)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Correct format for DeepSeek models in Bedrock
    const command = new InvokeModelCommand({
      modelId: "us.deepseek.r1-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    const response = await bedrock.send(command);
    const bodyStr = new TextDecoder().decode(response.body);
    
    console.log("Raw response from Bedrock:", bodyStr);

    let completion = "";
    try {
      const parsed = JSON.parse(bodyStr);
      // DeepSeek typically returns text in 'completions' array
      completion = parsed.completions?.[0]?.data?.text || 
                   parsed.completions?.[0]?.text ||
                   parsed.text ||
                   parsed.outputText ||
                   bodyStr; // Fallback to raw response
    } catch (err) {
      console.error("Failed to parse Bedrock response:", err);
      completion = bodyStr;
    }

    console.log("Completion text:", completion);

    // Extract classification, confidence, and explanation
    const classificationMatch = completion.match(/Classification:\s*(Genuine-Positive|Genuine-Negative|Fake-Malicious|Fake-Promotional)/i);
    const confidenceMatch = completion.match(/Confidence:\s*(\d+)/i);
    const explanationMatch = completion.match(/Explanation:\s*([\s\S]*?)(?=\n\w+:|$)/i);

    let classification = classificationMatch ? classificationMatch[1] : "";
    let confidence = confidenceMatch ? confidenceMatch[1] : "";
    let explanation = explanationMatch ? cleanExplanation(explanationMatch[1]) : "";

    // Fallback: if standard parsing fails, try to infer from the text
    if (!classification) {
      const lowerCompletion = completion.toLowerCase();
      if (lowerCompletion.includes("genuine-positive") || lowerCompletion.includes("positive")) classification = "Genuine-Positive";
      else if (lowerCompletion.includes("genuine-negative") || lowerCompletion.includes("negative")) classification = "Genuine-Negative";
      else if (lowerCompletion.includes("fake-malicious") || lowerCompletion.includes("malicious")) classification = "Fake-Malicious";
      else if (lowerCompletion.includes("fake-promotional") || lowerCompletion.includes("promotional")) classification = "Fake-Promotional";
      else classification = "Unknown";
    }

    if (!confidence) {
      // Try to extract any number that might be confidence
      const anyNumberMatch = completion.match(/\b(\d{1,3})\b/);
      confidence = anyNumberMatch ? anyNumberMatch[1] : "50";
    }

    if (!explanation) {
      explanation = "AI analysis completed but format unexpected";
    }

    console.log({ classification, confidence, explanation });

    return { 
      classification, 
      confidence, 
      explanation, 
      raw: completion 
    };

  } catch (error) {
    console.error("Bedrock API error:", error);
    
    // Handle rate limiting specifically
    if (error.message.includes("Too many requests") || error.message.includes("rate") || error.message.includes("throttl")) {
      // Wait longer and retry once
      console.log("Rate limit detected, waiting 2 seconds before retry...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const retryResult = await analyzeReview(review);
        return retryResult;
      } catch (retryError) {
        throw new Error(`Bedrock API call failed after retry: ${retryError.message}`);
      }
    }
    
    throw new Error(`Bedrock API call failed: ${error.message}`);
  }
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
  const BATCH_DELAY = 500; // 500ms between reviews to avoid rate limiting

  for (const [idx, item] of reviews.entries()) {
    const reviewText = typeof item === "string" ? item : item.snippet || item.text || "";
    
    // Add delay between processing each review
    if (idx > 0) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }

    try {
      const result = await analyzeReview(reviewText);
      results.push({ ...item, snippet: reviewText, ...result });
      console.log(`Processed review ${idx + 1}/${reviews.length}`);
    } catch (err) {
      results.push({ ...item, snippet: reviewText, classification: "Error", confidence: "0", explanation: `Analysis failed: ${err.message}`, raw: "" });
      console.error(`Failed to process review ${idx + 1}:`, err.message);
    }
  }

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
