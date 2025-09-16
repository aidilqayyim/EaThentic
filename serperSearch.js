const https = require('follow-redirects').https;

const API_KEY = '7651777abb2a5c57bc954b33cee11d7481fee1af';

// Step 1: Search for the business and extract placeId only
function searchBusiness(query, callback) {
  const options = {
    method: 'POST',
    hostname: 'google.serper.dev',
    path: '/search',
    headers: {
      'X-API-KEY': API_KEY,
      'Content-Type': 'application/json'
    },
    maxRedirects: 20
  };

  const req = https.request(options, (res) => {
    let chunks = [];
    res.on("data", (chunk) => {
      chunks.push(chunk);
    });
    res.on("end", () => {
      let body = Buffer.concat(chunks).toString();
      try {
        const data = JSON.parse(body);
        // Extract placeId from the first local result
        let placeId = null;
        if (data.local && data.local.length > 0) {
          placeId = data.local[0].placeId;
        }
        console.log('Extracted placeId:', placeId);
        if (callback) callback(placeId);
      } catch (e) {
        console.error('Error parsing response:', e);
      }
    });
    res.on("error", (error) => {
      console.error(error);
    });
  });

  let postData = JSON.stringify({
    "q": query,
    "gl": "my"
  });

  req.write(postData);
  req.end();
}

// Step 2: Get reviews using placeId
function getReviews(placeId) {
  if (!placeId) {
    console.error('No placeId found for this business.');
    return;
  }

  const options = {
    method: 'POST',
    hostname: 'google.serper.dev',
    path: '/reviews',
    headers: {
      'X-API-KEY': API_KEY,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      console.log('Reviews:', body);
    });
    res.on('error', error => console.error(error));
  });

  req.write(JSON.stringify({ placeId, gl: 'my' }));
  req.end();
}

// Run both steps
searchBusiness('pks maju restauran', getReviews);