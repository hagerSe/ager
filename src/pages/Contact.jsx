import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, 
  FaHome, FaInfoCircle, FaPaperPlane, FaCheckCircle, 
  FaTimesCircle, FaSpinner, FaHospital
} from 'react-icons/fa';

const Contact = () => {
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const navigate = useNavigate();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle form submission - sends to Formspree
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.message) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus(null), 3000);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus(null), 3000);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // YOUR ACTUAL FORMSPREE ENDPOINT
      const response = await fetch('https://formspree.io/f/mvzyplza', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          _subject: `NHMS Contact: Message from ${formData.name}`,
          _replyto: formData.email,
        }),
      });
      
      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', message: '' });
        setTimeout(() => setSubmitStatus(null), 3000);
      } else {
        setSubmitStatus('error');
        setTimeout(() => setSubmitStatus(null), 3000);
      }
    } catch (error) {
      console.error('Error:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Navigation Bar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-lg py-3' : 'bg-white/90 backdrop-blur-md py-5'
      }`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <FaHospital className="text-blue-600 text-2xl" />
            <span className="font-bold text-xl text-gray-800">NHMS</span>
          </div>
          
          <div className="hidden md:flex gap-8">
            <Link to="/" className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2">
              <FaHome /> Home
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2">
              <FaInfoCircle /> About
            </Link>
            <Link to="/contact" className="text-blue-600 font-semibold flex items-center gap-2">
              <FaEnvelope /> Contact
            </Link>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/login')}
              className="px-5 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
            >
              Login
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Register
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-24 pb-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-blue-100">Get in touch with our team. We're here to help!</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          
          {/* Contact Information */}
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Get in Touch</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow hover:shadow-md transition group">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition">
                  <FaPhone className="text-blue-600 text-xl group-hover:text-white transition" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Phone</div>
                  <div className="text-gray-600">+2519 84 93 56 77</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow hover:shadow-md transition group">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition">
                  <FaEnvelope className="text-blue-600 text-xl group-hover:text-white transition" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Email</div>
                  <div className="text-gray-600">agerneshdereje8@gmail.com</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow hover:shadow-md transition group">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition">
                  <FaMapMarkerAlt className="text-blue-600 text-xl group-hover:text-white transition" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Address</div>
                  <div className="text-gray-600">Bahir Dar, Ethiopia</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow hover:shadow-md transition group">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition">
                  <FaClock className="text-blue-600 text-xl group-hover:text-white transition" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Working Hours</div>
                  <div className="text-gray-600">Monday - Friday: 8:00 AM - 5:00 PM</div>
                  <div className="text-gray-500 text-sm">Emergency Services: 24/7</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Send us a Message</h2>
            
            {/* Success Message */}
            {submitStatus === 'success' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-500 rounded-lg flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <span className="text-green-700">Message sent successfully! We'll get back to you soon.</span>
              </div>
            )}
            
            {/* Error Message */}
            {submitStatus === 'error' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-500 rounded-lg flex items-center gap-2">
                <FaTimesCircle className="text-red-500" />
                <span className="text-red-700">Failed to send message. Please try again.</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Your Name *</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Your Email *</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Your Message *</label>
                <textarea 
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Write your message here..." 
                  rows="5" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                  required
                />
              </div>
              
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    Send Message
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center text-gray-500 text-sm">
              <p>We'll respond to your message within 24 hours</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-gray-100 py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">Our Location</h2>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="h-96 bg-gray-300 flex items-center justify-center">
              <div className="text-center">
                <FaMapMarkerAlt className="text-blue-600 text-5xl mx-auto mb-2" />
                <p className="text-gray-600">Bahir Dar, Ethiopia</p>
                <p className="text-gray-500 text-sm">Near the Regional Health Bureau</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <div className="flex justify-center gap-6 mb-4">
            <Link to="/" className="text-gray-400 hover:text-white transition">Home</Link>
            <Link to="/about" className="text-gray-400 hover:text-white transition">About</Link>
            <Link to="/contact" className="text-gray-400 hover:text-white transition">Contact</Link>
          </div>
          <p className="text-gray-400">© 2024 National Health Management System. All rights reserved.</p>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Contact;