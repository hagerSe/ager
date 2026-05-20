import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHospital, FaShieldAlt, FaUsers, FaHeartbeat, FaAmbulance, FaStethoscope, FaGlobe, FaBuilding, FaCity, FaMapMarkerAlt, FaHome, FaPhone, FaEnvelope, FaInfoCircle } from 'react-icons/fa';

const About = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const hierarchy = [
    { level: 'Federal', icon: <FaGlobe />, description: 'National policy & coordination' },
    { level: 'Regional', icon: <FaCity />, description: 'Regional health administration' },
    { level: 'Zone', icon: <FaBuilding />, description: 'Zonal health management' },
    { level: 'Woreda', icon: <FaMapMarkerAlt />, description: 'District health services' },
    { level: 'Kebele', icon: <FaHeartbeat />, description: 'Community health posts' },
    { level: 'Hospital', icon: <FaHospital />, description: 'Medical service delivery' }
  ];

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
            <Link to="/about" className="text-blue-600 font-semibold flex items-center gap-2">
              <FaInfoCircle /> About
            </Link>
            <Link to="/contact" className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2">
              <FaPhone /> Contact
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
      <div className="relative pt-24 pb-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-6 text-center">
          <div className="animate-bounce mb-4">
            <FaHospital className="text-6xl mx-auto" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fadeIn">
            National Health Management System
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto animate-slideUp">
            "Your Health, Our Priority" - Transforming healthcare delivery through integrated modern technology
          </p>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <FaHeartbeat className="text-blue-600 text-2xl" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Our Mission</h3>
            <p className="text-gray-600 leading-relaxed">
              To provide accessible, affordable, and quality healthcare services to all citizens 
              through an integrated, technology-driven health management system.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FaShieldAlt className="text-green-600 text-2xl" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Our Vision</h3>
            <p className="text-gray-600 leading-relaxed">
              To be a model for digital health transformation, ensuring every citizen receives 
              timely, efficient, and compassionate healthcare services.
            </p>
          </div>
        </div>
      </div>

      {/* Hierarchical Structure */}
      <div className="bg-gray-100 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Healthcare Hierarchy</h2>
            <p className="text-gray-600">Integrated healthcare delivery system from national to community level</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hierarchy.map((item, index) => (
              <div 
                key={index}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all hover:scale-105 animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">{item.level}</h3>
                </div>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Our Impact</h2>
          <p className="text-gray-600">Making healthcare accessible across the nation</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { number: '500+', label: 'Hospitals', icon: <FaHospital /> },
            { number: '98%', label: 'Satisfaction Rate', icon: <FaUsers /> },
            { number: '24/7', label: 'Emergency Service', icon: <FaAmbulance /> },
            { number: '100%', label: 'Secure Data', icon: <FaShieldAlt /> }
          ].map((stat, index) => (
            <div key={index} className="text-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600 text-2xl">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-blue-600">{stat.number}</div>
              <div className="text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Key Features</h2>
            <p className="text-gray-600">Comprehensive healthcare management solutions</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Emergency Department', desc: '24/7 critical care with rapid response teams', icon: <FaAmbulance /> },
              { title: 'OPD Services', desc: 'Outpatient consultations & follow-up care', icon: <FaStethoscope /> },
              { title: 'ANC Department', desc: 'Maternal & fetal health monitoring', icon: <FaHeartbeat /> }
            ].map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition group">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600 text-xl group-hover:bg-blue-600 group-hover:text-white transition">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FaHospital className="text-blue-400 text-2xl" />
                <span className="font-bold text-xl">NHMS</span>
              </div>
              <p className="text-gray-400">Transforming healthcare delivery through technology and compassion.</p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/" className="hover:text-white transition">Home</Link></li>
                <li><Link to="/about" className="hover:text-white transition">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Contact Info</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2"><FaPhone /> +251-11-123-4567</li>
                <li className="flex items-center gap-2"><FaEnvelope /> info@nhms.gov.et</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Working Hours</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Monday - Friday: 8:00 - 17:00</li>
                <li>Emergency: 24/7</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 National Health Management System. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Animations CSS */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default About;