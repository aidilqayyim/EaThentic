import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Instagram, X } from 'lucide-react';
import Navbar from './navbar';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [showInstagram, setShowInstagram] = useState(false);

  const instagramAccounts = [
    { name: '@kayrhzm', url: 'https://instagram.com/kayrhzm' },
    { name: '@aidilqayyim', url: 'https://instagram.com/aidilqayyim' },
    { name: '@sabreenalya', url: 'https://instagram.com/sabreenalya' },
    { name: '@ysmn_ayn', url: 'https://instagram.com/ysmn_ayn' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-orange-100 via-white to-sage-100 animate-[gradientShift_12s_ease-in-out_infinite]">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="grid lg:grid-cols-2 gap-12 ">
          {/* Left Side - Get in Touch */}
          <div className="h-full flex flex-col justify-center items-center text-center ">
            <h1 className="text-4xl lg:text-5xl font-bold text-black mb-4">
              Get in <span className="text-[#435e56]">Touch</span>
            </h1>
            <p className="text-lg text-black leading-relaxed mb-8">
              Have questions about our fake review detection system? 
              We'd love to hear from you. Send us a message and we'll 
              respond as soon as possible.
            </p>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowInstagram(true)}
                className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 rounded-full hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
              >
                <Instagram className="w-6 h-6 text-white" />
              </button>
              <div>
                <h3 className="font-semibold text-sage-900">Follow Us</h3>
                <p className="text-sage-700">Connect on Instagram</p>
              </div>
            </div>
          </div>

          {/* Right Side - Contact Form */}
          <div className="animate-fadeInUp">
            <div className="bg-gradient-to-br from-orange-50/90 to-white/90 backdrop-blur-sm rounded-2xl border border-orange-200/50 shadow-lg p-8">
              <h2 className="text-2xl font-bold text-sage-900 mb-6">Drop us your feedback</h2>
              
              <form action="https://formspree.io/f/xandrlld" method="POST" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-sage-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-sage-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-sage-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
                    placeholder="What's this about?"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-sage-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send Feedback
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Instagram Modal */}
      {showInstagram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative">
            <button
              onClick={() => setShowInstagram(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Follow Us on Instagram</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {instagramAccounts.map((account, index) => (
                <a
                  key={index}
                  href={account.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all duration-300 transform hover:scale-105"
                >
                  <Instagram className="w-8 h-8 text-pink-500" />
                  <span className="text-sm font-medium text-gray-700">{account.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;