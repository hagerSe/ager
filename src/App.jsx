import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import Contact from './pages/Contact';
import Login from './pages/Login';
import About from './pages/About';
import VerifyEmail from './pages/VerifyEmail'
import FederalDashboard from './components/FederalDashboard';
import RegionalDashboard from './components/RegionalDashboard';
import ZoneDashboard from './components/ZoneDashboard';
import WoredaDashboard from './components/WoredaDashboard';
import KebeleDashboard from './components/KebeleDashboard';
import HospitalDashboard from './components/HospitalDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import NurseDashboard from './components/NurseDashboard';
import PharmaDashboard from './components/PharmaDashboard';
import LabDashboard from './components/LabDashboard';
import RadioDashboard from './components/RadioDashboard';
import MidwifeDashboard from './components/MidwifeDashboard';
import TriageDashboard from './components/TriageDashboard';
import CardOfficeStaffDashboard from './components/CardOfficeStaffDashboard';
import BedManagementDashboard from './components/BedManagementDashboard';
import HRDashboard from './components/HRDashboard';

// API URL configuration
import { API_URL } from './config/api.js';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify token with backend
  const verifyToken = async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // ✅ FIXED: Changed from /auth/me to /auth/profile
      const response = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const userData = response.data.user;
        console.log('✅ User verified:', userData);
        
        // Update stored user with fresh data
        localStorage.setItem('user', JSON.stringify(userData));
        if (userData.hospital_id) {
          localStorage.setItem('hospital_id', userData.hospital_id);
        }
        setUser(userData);
      } else {
        // Token invalid, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('hospital_id');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      
      // If verification fails but we have stored user, use it as fallback
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('⚠️ Using stored user as fallback');
          setUser(parsedUser);
        } catch (e) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('hospital_id');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyToken();
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('hospital_id');
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  };

  // Add axios interceptor to fix any double API calls
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(config => {
      if (config.url && config.url.includes('/api/api/')) {
        console.warn('⚠️ Fixing double API URL:', config.url);
        config.url = config.url.replace('/api/api/', '/api/');
      }
      return config;
    }, error => Promise.reject(error));

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <Routes>
        {/* Public Routes */}
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/about' element={<About />} />
        
        {/* Protected Routes - Admin Levels */}
        <Route 
          path='/federal-dashboard' 
          element={
            user?.userType === 'federal' ? 
            <FederalDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        <Route 
          path='/regional-dashboard' 
          element={
            user?.userType === 'regional' ? 
            <RegionalDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        <Route 
          path='/zone-dashboard' 
          element={
            user?.userType === 'zone' ? 
            <ZoneDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        <Route 
          path='/woreda-dashboard' 
          element={
            user?.userType === 'woreda' ? 
            <WoredaDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        <Route 
          path='/kebele-dashboard' 
          element={
            user?.userType === 'kebele' ? 
            <KebeleDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        <Route 
          path='/hospital-dashboard' 
          element={
            user?.userType === 'hospital' ? 
            <HospitalDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        {/* Staff Department Routes */}
        <Route 
          path='/doctor-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Doctor' ? 
            <DoctorDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/nurse-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Nurse' ? 
            <NurseDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/pharma-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Pharma' ? 
            <PharmaDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/lab-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Lab' ? 
            <LabDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/radio-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Radio' ? 
            <RadioDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/midwife-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Midwife' ? 
            <MidwifeDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/triage-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Triage' ? 
            <TriageDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/card-office-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Card_Office' ? 
            <CardOfficeStaffDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/bed-management-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Bed_Management' ? 
            <BedManagementDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />

        <Route 
          path='/hr-dashboard' 
          element={
            user?.userType === 'staff' && user?.department === 'Human_Resource' ? 
            <HRDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        
        {/* Fallback staff dashboard */}
        <Route 
          path='/staff-dashboard' 
          element={
            user?.userType === 'staff' ? 
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                <h1 className="text-2xl font-bold text-blue-600 mb-4">Staff Dashboard</h1>
                <p className="text-gray-600 mb-4">Welcome, {user?.full_name}</p>
                <p className="text-gray-500">Department: {user?.department}</p>
                <p className="text-gray-400 mt-4 text-sm">Department-specific dashboard coming soon...</p>
                <button
                  onClick={handleLogout}
                  className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </div> : 
            <Navigate to="/login" />
          } 
        />
        
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export default App;