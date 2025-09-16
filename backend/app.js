import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import AWS from "aws-sdk";

// Configure AWS (make sure you already ran `aws configure` in terminal)
AWS.config.update({ region: "ap-southeast-1" }); // change if needed
const bedrock = new AWS.BedrockRuntime();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Function to call Bedrock
async function analyzeReview(review) {
  const prompt = `
  Classify the following food review as 'Authentic' or 'Fake'.
  Also provide a confidence percentage (0-100) and a brief explanation.

  Review: "${review}"
  `;

  const params = {
    modelId: "anthropic.claude-v2", // or another model available to you
    accept: "application/json",
    contentType: "application/json",
    body: JSON.stringify({
      prompt: prompt,
      max_tokens_to_sample: 200,
    }),
  };

  try {
    const response = await bedrock.invokeModel(params).promise();
    const result = JSON.parse(response.body.toString("utf-8"));
    return result;
  } catch (err) {
    console.error("Error calling Bedrock:", err);
    return { error: "Failed to analyze review" };
  }
}

// API endpoint
app.post("/analyze", async (req, res) => {
  const { review } = req.body;
  if (!review) {
    return res.status(400).json({ error: "Review text is required" });
  }

  const result = await analyzeReview(review);
  res.json(result);
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
