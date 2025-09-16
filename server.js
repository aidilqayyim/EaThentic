require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
const placesApi = require('./api/places');
app.use('/api/places', placesApi);

// Home route
app.get('/', (req, res) => {
  res.send('Welcome to the Home Page');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});