import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FaPlus, FaFacebook, FaTelegram, FaInstagram, 
  FaPhoneAlt, FaEnvelope, FaSearch,
  FaAmbulance, FaUserMd, FaBaby, FaHeartbeat,
  FaShieldAlt, FaClock, FaHospitalUser, FaArrowRight
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDept, setActiveDept] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      window.open(url, "_blank");
    }
  };

  const handleAdminLogin = () => {
    navigate('/login');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const services = [
    {
      id: "emergency",
      icon: FaAmbulance,
      title: "Emergency Department",
      description: "24/7 critical care with rapid response teams",
      color: "from-red-500 to-red-700",
      bgGlow: "rgba(239, 68, 68, 0.1)",
      fullDesc: "The Emergency Department provides 24/7 critical care for life-threatening conditions with rapid response teams, advanced life support equipment, and board-certified emergency physicians."
    },
    {
      id: "opd",
      icon: FaUserMd,
      title: "OPD Department",
      description: "Outpatient consultations & follow-up care",
      color: "from-blue-500 to-blue-700",
      bgGlow: "rgba(59, 130, 246, 0.1)",
      fullDesc: "The OPD Department delivers outpatient consultations, diagnosis, follow-up medical services, preventive care, and specialist referrals with minimal waiting times."
    },
    {
      id: "anc",
      icon: FaBaby,
      title: "ANC Department",
      description: "Maternal & fetal health monitoring",
      color: "from-pink-500 to-pink-700",
      bgGlow: "rgba(236, 72, 153, 0.1)",
      fullDesc: "The ANC Department ensures maternal and fetal health through comprehensive prenatal care, regular monitoring, nutritional guidance, and birth preparation programs."
    }
  ];

  const stats = [
    { value: "500+", label: "Daily Patients", icon: FaHospitalUser },
    { value: "98%", label: "Satisfaction Rate", icon: FaHeartbeat },
    { value: "24/7", label: "Emergency Service", icon: FaClock },
    { value: "100%", label: "Secure Data", icon: FaShieldAlt }
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      
      {/* MAIN HEADER - Sticky with shadow */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-md shadow-lg" : "bg-white shadow-md"
        }`}
      >
        <div className="w-full px-6 sm:px-8 md:px-10">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-5 py-4">
            <motion.h1 
              whileHover={{ scale: 1.02 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent text-center lg:text-left"
            >
              National Health <span className="text-blue-600">Management System</span>
            </motion.h1>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center border border-gray-200 rounded-full overflow-hidden bg-gray-50 focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition-all">
                <input
                  type="text"
                  placeholder="Search health topics..."
                  className="px-5 py-2.5 text-base w-60 sm:w-72 focus:outline-none bg-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSearch}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all"
                >
                  <FaSearch size={16} />
                </motion.button>
              </div>
              
              <ul className="flex gap-5 text-gray-700 font-medium">
                {["Home", "About", "Contact"].map((item) => (
                  <li key={item}>
                    <Link 
                      to={item === "Home" ? "/" : `/${item.toLowerCase()}`}
                      className="hover:text-blue-600 transition-colors relative group whitespace-nowrap text-base sm:text-lg"
                    >
                      {item}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>

      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="w-full px-6 sm:px-8 md:px-10">
          <div className="py-12 lg:py-20">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              
              {/* LEFT CONTENT */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="lg:w-1/2 z-10 text-center lg:text-left"
              >
                <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full mb-6 mx-auto lg:mx-0 w-fit">
                  <FaHeartbeat className="text-blue-600 animate-pulse text-base" />
                  <span className="text-base font-semibold text-blue-700">Your Health, Our Priority</span>
                </div>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight mb-5">
                  Welcome To The National{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Health System
                  </span>
                </h2>
                <p className="text-gray-600 text-lg sm:text-xl mb-8 leading-relaxed">
                  Health is the foundation of a strong and productive society. 
                  A well-organized health management system ensures citizens receive 
                  timely, affordable, and quality healthcare services through integrated 
                  modern technology.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto lg:mx-0 text-lg"
                >
                  Explore Services
                  <FaArrowRight className="group-hover:translate-x-1 transition-transform text-base" />
                </motion.button>
              </motion.div>

              {/* RIGHT IMAGE */}
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="lg:w-1/2 relative"
              >
                <div className="relative w-80 h-80 sm:w-96 sm:h-96 lg:w-[450px] lg:h-[450px] mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                  <div 
                    className="relative w-full h-full rounded-full shadow-2xl overflow-hidden border-4 border-white"
                    style={{
                      backgroundImage: "url('/images/2.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {[
                      { position: "top-4 right-4", delay: 0 },
                      { position: "bottom-4 left-4", delay: 0.2 },
                      { position: "bottom-4 right-4", delay: 0.4 }
                    ].map((btn, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: btn.delay + 0.5, type: "spring" }}
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        className={`absolute ${btn.position} w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-600 group transition-all`}
                      >
                        <FaPlus className="text-blue-600 group-hover:text-white text-xl transition" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-200 rounded-full blur-3xl opacity-30"></div>
      </div>

      {/* STATS SECTION */}
      <div className="bg-white py-12 border-y border-gray-100">
        <div className="w-full px-6 sm:px-8 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex p-4 bg-blue-50 rounded-full mb-4">
                  <stat.icon className="text-blue-600 text-3xl" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-gray-800">{stat.value}</div>
                <div className="text-gray-500 text-base sm:text-lg">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* SERVICES SECTION */}
      <div className="py-16 lg:py-24">
        <div className="w-full px-6 sm:px-8 md:px-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 lg:mb-16"
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 mb-5">
              Our Healthcare Services
            </h2>
            <p className="text-gray-600 text-lg sm:text-xl max-w-3xl mx-auto">
              Comprehensive medical care delivered with compassion, expertise, and 
              cutting-edge technology to ensure the best outcomes for our patients.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-10">
            {services.map((service, idx) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
                onClick={() => setActiveDept(activeDept === service.id ? null : service.id)}
                className={`group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 ${
                  activeDept === service.id 
                    ? "ring-2 ring-blue-500 shadow-2xl" 
                    : "hover:shadow-xl"
                }`}
                style={{ background: service.bgGlow }}
              >
                <div className="bg-white p-8 lg:p-10 h-full">
                  <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-r ${service.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <service.icon className="text-white text-3xl lg:text-4xl" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-gray-800 mb-3">{service.title}</h3>
                  <p className="text-gray-600 text-base lg:text-lg mb-4">{service.description}</p>
                  <div className="flex items-center text-blue-600 font-semibold text-base lg:text-lg group-hover:gap-2 transition-all gap-1">
                    Learn More <FaArrowRight className="text-sm" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* DETAILS PANEL */}
          <AnimatePresence>
            {activeDept && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-10 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 lg:p-10 border border-blue-100">
                  <p className="text-gray-700 text-lg lg:text-xl text-center lg:text-left">
                    {services.find(s => s.id === activeDept)?.fullDesc}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CTA SECTION */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 lg:py-24">
        <div className="w-full px-6 sm:px-8 md:px-10 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5"
          >
            Ready to Access Healthcare Services?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            className="text-blue-100 mb-8 max-w-2xl mx-auto text-lg sm:text-xl"
          >
            Login to manage appointments, access medical records, and receive personalized health recommendations.
          </motion.p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAdminLogin}
            className="px-10 py-4 lg:px-12 lg:py-5 bg-white text-blue-600 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all hover:bg-gray-50 text-lg lg:text-xl"
          >
            Admin Login →
          </motion.button>
        </div>
      </div>
    </div>
  );
}