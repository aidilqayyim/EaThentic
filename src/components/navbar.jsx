import React, { useState, useEffect } from 'react';
import Logo from './logo';
import { Menu, X } from 'lucide-react';

const useScroll = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrolled;
};

const Navbar = ({ aboutRef }) => {
  const scrolled = useScroll();
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollToAbout = (e) => {
    e.preventDefault();
    if (aboutRef?.current) {
      const offsetTop = aboutRef.current.offsetTop - 100; // Account for navbar height
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
    setMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full px-3 sm:px-4 md:px-5 py-3 sm:py-4 md:py-5 z-20 transition-blur duration-300
        ${scrolled ? 'bg-sage-50/80 backdrop-blur-lg shadow-md' : 'bg-transparent'}`}
    >
      <nav className="flex justify-between items-center max-w-7xl mx-auto">
        {/* Logo */}
        <a href="/" className="flex-shrink-0">
          <Logo variant="gradient" className="text-xl sm:text-2xl md:text-3xl" />
        </a>

        {/* Desktop Menu */}
        <ul className="text-sm lg:text-base xl:text-lg hidden lg:flex items-center gap-6 xl:gap-10 text-sage-700 font-semibold">
          <li>
            <a
              href="/"
              className="relative hover:text-brand-orange transition-colors duration-300
                after:content-[''] after:absolute after:left-1/2 after:-bottom-1 after:h-[2px] after:w-0
                after:bg-brand-orange after:transition-all after:duration-300 hover:after:w-full hover:after:left-0"
            >
              Home
            </a>
          </li>
          <li>
            <a
              href="/"
              className="relative hover:text-brand-orange transition-colors duration-300
                after:content-[''] after:absolute after:left-1/2 after:-bottom-1 after:h-[2px] after:w-0
                after:bg-brand-orange after:transition-all after:duration-300 hover:after:w-full hover:after:left-0"
            >
              Comparison
            </a>
          </li>
          <li>
            <button
              onClick={scrollToAbout}
              className="relative hover:text-brand-orange transition-colors duration-300
                after:content-[''] after:absolute after:left-1/2 after:-bottom-1 after:h-[2px] after:w-0
                after:bg-brand-orange after:transition-all after:duration-300 hover:after:w-full hover:after:left-0"
            >
              About
            </button>
          </li>
        </ul>

        {/* Desktop Contact Button */}
        <a
          href="/"
          className="hidden lg:inline-block bg-sage-700 text-white px-4 lg:px-6 py-2 lg:py-2.5 rounded-full
            font-semibold hover:bg-sage-900 transition-glow duration-300 text-sm lg:text-base
            transform hover:-translate-y-0.5 flex-shrink-0"
        >
          <span className="hidden xl:inline">Contact Us</span>
          <span className="xl:hidden">Contact</span>
        </a>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden text-sage-700 flex-shrink-0 p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle Menu"
        >
          {menuOpen ? <X className="w-6 h-6 sm:w-7 sm:h-7" /> : <Menu className="w-6 h-6 sm:w-7 sm:h-7" />}
        </button>
      </nav>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="lg:hidden mt-3 sm:mt-4 bg-sage-50/95 backdrop-blur-lg rounded-lg shadow-lg p-4 sm:p-5 text-sage-700 font-semibold mx-3 sm:mx-0">
          <ul className="flex flex-col gap-3 sm:gap-4">
            <li>
              <a href="/" className="hover:text-brand-orange text-base sm:text-lg block py-1" onClick={() => setMenuOpen(false)}>
                Home
              </a>
            </li>
            <li>
              <a href="/" className="hover:text-brand-orange text-base sm:text-lg block py-1" onClick={() => setMenuOpen(false)}>
                Comparison
              </a>
            </li>
            <li>
              <button onClick={scrollToAbout} className="hover:text-brand-orange text-base sm:text-lg block py-1 text-left">
                About
              </button>
            </li>
          </ul>
          <a
            href="/"
            className="block mt-4 bg-sage-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full
              font-semibold hover:bg-sage-900 hover:shadow-glow transition duration-300 text-center text-sm sm:text-base"
            onClick={() => setMenuOpen(false)}
          >
            Contact Us
          </a>
        </div>
      )}
    </header>
  );
};

export default Navbar;
