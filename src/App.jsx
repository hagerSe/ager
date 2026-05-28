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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user from API using token
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        // Set authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Fetch user from backend
        const response = await axios.get(`${API_URL}/api/auth/me`);
        
        if (response.data.success) {
          const userData = response.data.user;
          console.log('✅ User fetched from API:', userData);
          console.log('✅ Hospital ID:', userData.hospital_id);
          setUser(userData);
        } else {
          // Token invalid
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

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
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        
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

        {/* ✅ TRIAGE ROUTE */}
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
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export default App;