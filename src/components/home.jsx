import React from 'react';
import { Search } from 'lucide-react';
import Navbar from '../components/navbar';
import Logo from '../components/logo';

const Home = () => {
  return (
    <div className="relative bg-gradient-to-br from-sage-50 via-white to-sage-100 w-full min-h-screen flex flex-col justify-center items-center text-sage-900 p-5 font-sans overflow-hidden">
      {/* Blurred bg */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-brand-orange/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-sage-300/30 rounded-full blur-3xl"></div>

      {/* Navbar */}
      <Navbar />

      <div className="flex flex-col items-center text-center relative z-10">
        {/* Logo */}
        <Logo variant="gradient" className="text-5xl md:text-7xl" />

        {/* Subtitle */}
        <p className="mt-4 text-xl text-sage-700/90 italic font-serif-display tracking-wide">
          Authentic dining, guaranteed.
        </p>

        {/* Description */}
        <p className="text-lg md:text-xl mt-8 max-w-xl leading-relaxed text-sage-800/90 font-medium font-sans">
          Don&apos;t fall for fake reviews. Enter a restaurant or location and let our AI find the hidden gems and expose the frauds.
        </p>

        {/* Integrated Search Bar */}
        <form className="relative mt-10 w-full max-w-lg">
          <input
            className="w-full h-16 pl-14 pr-5 rounded-xl bg-white border border-orange-300
               text-lg text-sage-900 placeholder-gray-500 
               focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-300
               transition-all duration-300"
            placeholder="Find reviews in ..."
            type="text"
          />
          <button
            type="submit"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center 
               text-orange-500 hover:text-orange-600 transition-all duration-300"
          >
            <Search size={22} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default Home;
