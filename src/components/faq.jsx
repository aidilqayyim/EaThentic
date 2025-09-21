import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from './navbar';

const FAQ = () => {
  const [openQuestion, setOpenQuestion] = useState(null);

  const faqs = [
    {
      id: 1,
      question: "How does the fake review detection work?",
      answer: "Our AI system analyzes multiple factors including review patterns, language usage, timing, and user behavior to identify potentially fake reviews with high accuracy."
    },
    {
      id: 2,
      question: "Is the review analysis free to use?",
      answer: "Yes, our basic review analysis is completely free. You can analyze reviews for any restaurant without any cost or registration required."
    },
    {
      id: 3,
      question: "Can I analyze reviews from any platform?",
      answer: "Currently, we only support Google Reviews analysis."
    },
    {
      id: 4,
      question: "How long does the analysis take?",
      answer: "Most analyses complete within 30-60 seconds, depending on the number of reviews. Our system processes reviews in real-time for quick results."
    },
    {
      id: 5,
      question: "What information do you provide about fake reviews?",
      answer: "We provide a confidence score, classification (genuine/fake/unknown/insufficient/suspicious), and detailed explanations about why a review was flagged, including specific patterns detected."
    },
    {
      id: 6,
      question: "Do you store the review data?",
      answer: "We only temporarily process review data for analysis purposes and do not permanently store personal information or review content on our servers."
    },
    {
      id: 7,
      question: "Can businesses use this to improve their reputation?",
      answer: "Yes, businesses can use our tool to identify fake reviews affecting their ratings and take appropriate action to maintain authentic customer feedback."
    }
  ];

  const toggleQuestion = (id) => {
    setOpenQuestion(openQuestion === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-orange-100 via-white to-sage-100 animate-[gradientShift_12s_ease-in-out_infinite]">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12 ">
        <div className="grid lg:grid-cols-2 gap-12 items-center justify-center text-center ">
          {/* Left Side - Title and Description */}
          <div className="lg:sticky lg:top-1/2 lg:-translate-y-1/2 h-fit flex flex-col items-start justify-center text-left pl-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-sage-900 mb-6">
              Frequently Asked <br />
              <h1 className="text-4xl lg:text-5xl font-bold text-orange-500 text-left">Questions</h1>
            </h1>
            <p className="text-lg text-sage-700 leading-relaxed text-left">
              Find answers to common questions about our fake review detection system. 
              Our AI-powered tool helps you identify suspicious reviews and maintain 
              trust in restaurant online ratings.
            </p>
          </div>

          {/* Right Side - FAQ Cards */}
          <div className="space-y-6 animate-fadeInUp">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="group relative bg-gradient-to-br from-orange-50/90 to-white/90 backdrop-blur-sm rounded-2xl border border-orange-200/50 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1"
              >
                <button
                  onClick={() => toggleQuestion(faq.id)}
                  className="w-full p-6 text-left flex justify-between items-center hover:bg-gradient-to-r hover:from-orange-100/30 hover:to-transparent rounded-2xl transition-all duration-300 transform active:scale-[0.98]"
                >
                  <h3 className="text-lg font-semibold text-sage-900 pr-4 group-hover:text-orange-700 transition-colors duration-300">
                    {faq.question}
                  </h3>
                  <div className="flex-shrink-0 p-1 rounded-full bg-orange-100/50 group-hover:bg-orange-200/70 transition-all duration-300">
                    {openQuestion === faq.id ? (
                      <ChevronUp className="w-5 h-5 text-orange-600 transition-transform duration-300" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-orange-600 transition-transform duration-300" />
                    )}
                  </div>
                </button>
                
                {openQuestion === faq.id && (
                  <div className="px-6 pb-6">
                    <div className="border-t border-orange-200/50 pt-4 bg-gradient-to-r from-orange-50/30 to-transparent rounded-lg p-4 mt-2">
                      <p className="text-sage-700 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;