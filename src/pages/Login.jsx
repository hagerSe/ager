import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaEnvelope, FaLock, FaEye, FaEyeSlash, 
  FaHospitalUser, FaShieldAlt, FaKey, 
  FaPaperPlane, FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';

const Login = () => {
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  // Resend Verification States
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  
  const navigate = useNavigate();

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await axios.post("http://localhost:5001/api/auth/login", { 
        email, 
        password 
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000
      });
      
      if (res.data.success && res.data.token) {
        const userData = {
          ...res.data.user,
          role: res.data.user.role,
          userType: res.data.user.userType || res.data.user.role,
          level: res.data.user.userType || res.data.user.role,
          isVerified: res.data.user.is_verified
        };
        
        if (!userData.isVerified) {
          setError("⚠️ Please verify your email address first.");
          setLoading(false);
          return;
        }
        
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(userData));
        
        const userRole = userData.userType || userData.role;
        
        const roleRoutes = {
          'federal': '/federal-dashboard',
          'Federal_Admin': '/federal-dashboard',
          'regional': '/regional-dashboard',
          'Regional_Admin': '/regional-dashboard',
          'zone': '/zone-dashboard',
          'Zone_Admin': '/zone-dashboard',
          'woreda': '/woreda-dashboard',
          'Woreda_Admin': '/woreda-dashboard',
          'kebele': '/kebele-dashboard',
          'Kebele_Admin': '/kebele-dashboard',
          'hospital': '/hospital-dashboard',
          'Hospital_Admin': '/hospital-dashboard',
          'staff': '/staff-dashboard'
        };
        
        const departmentRoutes = {
          'Doctor': '/doctor-dashboard',
          'Nurse': '/nurse-dashboard',
          'Pharma': '/pharma-dashboard',
          'Lab': '/lab-dashboard',
          'Radio': '/radio-dashboard',
          'Midwife': '/midwife-dashboard',
          'Triage': '/triage-dashboard',
          'Card_Office': '/card-office-dashboard',
          'Bed_Management': '/bed-management-dashboard',
          'Human_Resource': '/hr-dashboard'
        };
        
        if (userRole === 'staff' && userData.department) {
          const redirectPath = departmentRoutes[userData.department];
          window.location.href = redirectPath || '/staff-dashboard';
        } else if (roleRoutes[userRole]) {
          window.location.href = roleRoutes[userRole];
        } else {
          window.location.href = '/';
        }
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError("Connection timeout. Make sure backend is running");
      } else if (err.response) {
        if (err.response.status === 401) {
          setError("❌ Invalid email or password");
        } else if (err.response.status === 403) {
          setError("❌ Email not verified. Please check your inbox.");
        } else {
          setError(err.response.data?.message || "Login failed");
        }
      } else if (err.request) {
        setError("❌ Cannot connect to server.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);
    
    try {
      const response = await axios.post("http://localhost:5001/api/auth/forgot-password", {
        email: resetEmail
      });
      
      if (response.data.success) {
        setResetMessage("✅ Password reset link sent to your email!");
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetEmail('');
          setResetMessage('');
        }, 3000);
      } else {
        setResetError(response.data.message || "Failed to send reset link");
      }
    } catch (err) {
      setResetError("❌ Failed to send reset link. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

const handleResendVerification = async (e) => {
  e.preventDefault();
  setVerifyError('');
  setVerifyMessage('');
  setVerifyLoading(true);
  
  try {
    const response = await axios.post("http://localhost:5001/api/auth/resend-verification", {
      email: verifyEmail
    });
    
    console.log('Response:', response.data); // Check console
    
    if (response.data.success) {
      setVerifyMessage("✅ Verification email sent! Please check your inbox.");
      setTimeout(() => {
        setShowResendVerification(false);
        setVerifyEmail('');
        setVerifyMessage('');
      }, 3000);
    } else {
      setVerifyError(response.data.message || "Failed to send verification email");
    }
  } catch (err) {
    console.error('Error:', err);
    setVerifyError(err.response?.data?.message || "❌ Failed to send verification email.");
  } finally {
    setVerifyLoading(false);
  }
};
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 relative overflow-hidden">
      
      {/* ========== NAVBAR - ONLY NHMS ========== */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg' 
          : 'bg-white/80 backdrop-blur-sm'
      }`}>
        <div className="px-6 py-4">
          <div 
            onClick={() => navigate('/')}
            className="cursor-pointer w-fit"
          >
            <h1 className={`font-bold text-2xl transition-all duration-300 ${
              scrolled ? 'text-blue-600' : 'text-blue-600'
            }`}>
              NHMS
            </h1>
          </div>
        </div>
      </nav>

      {/* Login Form Centered */}
      <div className="min-h-screen flex items-center justify-center px-4">
        
        {/* Animated Background Particles - Gray & Blue only */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-gray-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Login Card - Centered */}
        <div className="relative w-full max-w-lg mx-auto">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            
            {/* Header - Water Blue Gradient */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 px-8 py-8 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-full mb-4">
                <FaHospitalUser className="text-white text-5xl" />
              </div>
              <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
              <p className="text-blue-100 text-sm mt-2">Sign in to your account</p>
            </div>

            {/* Form Section */}
            <div className="px-8 py-8">
              
              {showForgotPassword ? (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaKey className="text-blue-600" />
                    Reset Password
                  </h3>
                  
                  {resetMessage && (
                    <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded-lg">
                      <p className="text-green-700 text-sm flex items-center gap-2">
                        <FaCheckCircle /> {resetMessage}
                      </p>
                    </div>
                  )}
                  
                  {resetError && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
                      <p className="text-red-700 text-sm flex items-center gap-2">
                        <FaTimesCircle /> {resetError}
                      </p>
                    </div>
                  )}
                  
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaEnvelope className="text-gray-400" />
                        </div>
                        <input
                          type="email"
                          placeholder="Enter your registered email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                          required
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-800 transition-all"
                    >
                      {resetLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="w-full text-gray-500 py-2 text-sm hover:text-blue-600 transition"
                    >
                      ← Back to Login
                    </button>
                  </form>
                </div>
              ) : showResendVerification ? (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaPaperPlane className="text-blue-600" />
                    Resend Verification
                  </h3>
                  
                  {verifyMessage && (
                    <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded-lg">
                      <p className="text-green-700 text-sm">{verifyMessage}</p>
                    </div>
                  )}
                  
                  {verifyError && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
                      <p className="text-red-700 text-sm">{verifyError}</p>
                    </div>
                  )}
                  
                  <form onSubmit={handleResendVerification} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaEnvelope className="text-gray-400" />
                        </div>
                        <input
                          type="email"
                          placeholder="Enter your registered email"
                          value={verifyEmail}
                          onChange={(e) => setVerifyEmail(e.target.value)}
                          className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                          required
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={verifyLoading}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-800"
                    >
                      {verifyLoading ? "Sending..." : "Resend Verification"}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setShowResendVerification(false)}
                      className="w-full text-gray-500 py-2 text-sm hover:text-blue-600 transition"
                    >
                      ← Back to Login
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <FaShieldAlt className="text-green-500 text-sm" />
                    <span className="text-xs text-gray-500">Secure Encrypted Connection</span>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaEnvelope className="text-gray-400" />
                        </div>
                        <input
                          type="email"
                          placeholder="admin@nhms.gov.et"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock className="text-gray-400" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <FaEyeSlash className="text-gray-400 hover:text-gray-600" />
                          ) : (
                            <FaEye className="text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {loading ? "Authenticating..." : "Sign In"}
                    </button>
                  </form>

                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() => setShowResendVerification(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition"
                    >
                      Didn't receive verification email?
                    </button>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-400">
                      © 2024 National Health Management System
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;