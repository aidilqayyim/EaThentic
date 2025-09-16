import React from 'react';
import Home from './components/home';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Results from './components/Results';
import Reviews from './components/reviews';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/results/review" element={<Reviews />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
