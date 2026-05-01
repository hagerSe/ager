import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaHospitalUser, FaShieldAlt } from 'react-icons/fa';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      console.log("Attempting login with:", email);
      
      // ✅ Use the unified /api/auth/login endpoint
      const res = await axios.post("http://localhost:5001/api/auth/login", { 
        email, 
        password 
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000
      });
      
      console.log("Login response:", res.data);
      
      if (res.data.success && res.data.token) {
        const userData = {
          ...res.data.user,
          role: res.data.user.role,
          userType: res.data.user.userType || res.data.user.role,
          level: res.data.user.userType || res.data.user.role
        };
        
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(userData));
        
        console.log("User role:", userData.role);
        console.log("User type:", userData.userType);
        
        // Hierarchical role-based redirect
        const userRole = userData.userType || userData.role;
        
        // Federal Level
        if (userRole === 'federal' || userRole === 'Federal_Admin') {
          console.log("✅ Federal Admin - Redirecting to Federal Dashboard");
          window.location.href = '/federal-dashboard';
        }
        // Regional Level
        else if (userRole === 'regional' || userRole === 'Regional_Admin') {
          console.log("✅ Regional Admin - Redirecting to Regional Dashboard");
          window.location.href = '/regional-dashboard';
        }
        // Zone Level
        else if (userRole === 'zone' || userRole === 'Zone_Admin') {
          console.log("✅ Zone Admin - Redirecting to Zone Dashboard");
          window.location.href = '/zone-dashboard';
        }
        // Woreda Level
        else if (userRole === 'woreda' || userRole === 'Woreda_Admin') {
          console.log("✅ Woreda Admin - Redirecting to Woreda Dashboard");
          window.location.href = '/woreda-dashboard';
        }
        // Kebele Level
        else if (userRole === 'kebele' || userRole === 'Kebele_Admin') {
          console.log("✅ Kebele Admin - Redirecting to Kebele Dashboard");
          window.location.href = '/kebele-dashboard';
        }
        // Hospital Level
        else if (userRole === 'hospital' || userRole === 'Hospital_Admin') {
          console.log("✅ Hospital Admin - Redirecting to Hospital Dashboard");
          window.location.href = '/hospital-dashboard';
        }
        // Staff Level - Check department
        else if (userRole === 'staff') {
          const department = userData.department;
          console.log("✅ Staff - Department:", department);
          
          // ✅ FIXED: Department-based redirects with correct naming
          const departmentRoutes = {
            'Doctor': '/doctor-dashboard',
            'Nurse': '/nurse-dashboard',
            'Pharma': '/pharma-dashboard',
            'Lab': '/lab-dashboard',
            'Radio': '/radio-dashboard',
            'Midwife': '/midwife-dashboard',
            'Triage': '/triage-dashboard',
            'Card_Office': '/card-office-dashboard',      // ✅ Fixed from 'cardofffice' to 'Card_Office'
            'Bed_Management': '/bed-management-dashboard',
            'Human_Resource': '/hr-dashboard'
          };
          
          const redirectPath = departmentRoutes[department];
          if (redirectPath) {
            console.log(`✅ Redirecting ${department} to ${redirectPath}`);
            window.location.href = redirectPath;
          } else {
            console.log(`⚠️ No specific dashboard for ${department}, going to staff-dashboard`);
            window.location.href = '/staff-dashboard';
          }
        }
        else {
          console.log("Unknown role, going to home");
          window.location.href = '/';
        }
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      
      if (err.code === 'ECONNABORTED') {
        setError("Connection timeout. Make sure backend is running on port 5001");
      } else if (err.response) {
        if (err.response.status === 401) {
          setError("❌ Invalid email or password. Please check your credentials.");
        } else if (err.response.status === 404) {
          setError("❌ Server endpoint not found. Please use /api/auth/login");
        } else {
          setError(err.response.data?.message || "Login failed");
        }
      } else if (err.request) {
        setError("❌ Cannot connect to server. Please make sure backend is running on http://localhost:5001");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Main Login Card */}
      <div className="relative w-full max-w-md mx-4">
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
        
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
              <FaHospitalUser className="text-white text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-white">NHMS Portal</h2>
            <p className="text-blue-100 text-sm mt-1">National Health Management System</p>
          </div>

          {/* Form Section */}
          <div className="px-8 py-6">
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

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    placeholder="admin@nhms.gov.et"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <FaEyeSlash className="text-gray-400 hover:text-gray-600 transition" />
                    ) : (
                      <FaEye className="text-gray-400 hover:text-gray-600 transition" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                © 2024 National Health Management System. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
      </div>
    </div>
  );
};

export default Login;