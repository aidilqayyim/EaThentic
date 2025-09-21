import React from 'react';
import Home from './components/home';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Results from './components/Results';
import Reviews from './components/reviews';
import FAQ from './components/faq';
import Contact from './components/contact';
import Comparison from './components/comparison';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/results/review" element={<Reviews />} />
        <Route path="/comparison" element={<Comparison />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
