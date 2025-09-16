import React, { useState, useEffect } from 'react';
import Logo from './logo';

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


const Navbar = () => {
    const scrolled = useScroll();

    return (
        <header
            className={`fixed top-0 left-0 w-full p-5 z-20 transition-blur duration-300
                  ${scrolled ? 'bg-sage-50/80 backdrop-blur-lg shadow-md' : 'bg-transparent'}`}
        >
            <nav className="flex justify-between items-center max-w-7xl mx-auto">
                <a href="/">
                    <Logo variant="gradient" className="text-3xl" />
                </a>

                <ul className="text-lg hidden md:flex items-center gap-10 text-sage-700 font-semibold">
                    <li>
                        <a href="/" className="relative hover:text-brand-orange transition-colors duration-300
                                 after:content-[''] after:absolute after:left-1/2 after:-bottom-1 after:h-[2px] after:w-0
                                 after:bg-brand-orange after:transition-all after:duration-300 hover:after:w-full hover:after:left-0">
                            Home
                        </a>
                    </li>
                    <li>
                        <a href="/" className="relative hover:text-brand-orange transition-colors duration-300
                                 after:content-[''] after:absolute after:left-1/2 after:-bottom-1 after:h-[2px] after:w-0
                                 after:bg-brand-orange after:transition-all after:duration-300 hover:after:w-full hover:after:left-0">
                            Restaurants
                        </a>
                    </li>
                    <li>
                        <a href="/" className="relative hover:text-brand-orange transition-colors duration-300
                                 after:content-[''] after:absolute after:left-1/2 after:-bottom-1 after:h-[2px] after:w-0
                                 after:bg-brand-orange after:transition-all after:duration-300 hover:after:w-full hover:after:left-0">
                            About
                        </a>
                    </li>
                </ul>

                <a href="/" className="hidden md:inline-block bg-sage-700 text-white px-6 py-2.5 rounded-full
                               font-semibold hover:bg-sage-900 hover:shadow-glow transition-glow duration-300
                               transform hover:-translate-y-0.5">
                    Contact Us
                </a>
            </nav>
        </header>
    );
};

export default Navbar;