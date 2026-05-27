// frontend/src/pages/cardoffice/CardOfficeDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserPlus, Activity, ClipboardList, TrendingUp, Calendar,
  Search, Clock, ArrowRight, RefreshCw, FileText, Bell, UserCheck,
  Hospital, Loader, ChevronRight, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';

const CardOfficeDashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    today: 0,
    inTriage: 0,
    active: 0,
    total: 0
  });
  const [recentPatients, setRecentPatients] = useState([]);
  const [inTriagePatients, setInTriagePatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnPatientId, setReturnPatientId] = useState(null);
  const [registerModal, setRegisterModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    age: '',
    gender: 'Male',
    phone: ''
  });
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const hospitalId = user?.hospital_id;

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!hospitalId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch stats
      const statsRes = await fetch(`${API_URL}/card-office/stats?hospital_id=${hospitalId}`, { headers });
      const statsData = await statsRes.json();

      // Fetch recent patients
      const recentRes = await fetch(`${API_URL}/card-office/recent?hospital_id=${hospitalId}&limit=10`, { headers });
      const recentData = await recentRes.json();

      // Fetch patients in triage
      const triageRes = await fetch(`${API_URL}/card-office/patients/triage?hospital_id=${hospitalId}&limit=10&page=1`, { headers });
      const triageData = await triageRes.json();

      // Fetch notifications
      const notifRes = await fetch(`${API_URL}/card-office/notifications`, { headers });
      const notifData = await notifRes.json();

      // Fetch today's schedule
      const scheduleRes = await fetch(`${API_URL}/card-office/today-schedule`, { headers });
      const scheduleData = await scheduleRes.json();

      if (statsData.success) setStats(statsData.stats);
      if (recentData.success) setRecentPatients(recentData.patients || []);
      if (triageData.success) setInTriagePatients(triageData.patients || []);
      if (notifData.success) {
        setNotifications(notifData.notifications || []);
        setUnreadCount(notifData.unreadCount || 0);
      }
      if (scheduleData.success) setTodaySchedule(scheduleData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [hospitalId, API_URL]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      showToast('Please enter at least 2 characters', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/card-office/patients/search?hospital_id=${hospitalId}&query=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setSearchResults(data.patients || []);
        setShowSearch(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      showToast('Search failed', 'error');
    }
  };

  // Register new patient
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    
    if (!newPatient.first_name || !newPatient.last_name || !newPatient.age || !newPatient.gender) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/card-office/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newPatient,
          age: parseInt(newPatient.age),
          hospital_id: hospitalId
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast('Patient registered successfully!');
        setRegisterModal(false);
        setNewPatient({
          first_name: '',
          middle_name: '',
          last_name: '',
          age: '',
          gender: 'Male',
          phone: ''
        });
        fetchDashboardData();
      } else {
        showToast(data.message || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showToast('Registration failed', 'error');
    }
  };

  // Send returning patient to triage
  const handleSendToTriage = async () => {
    if (!returnPatientId) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/card-office/send-to-triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: returnPatientId,
          hospital_id: hospitalId,
          reason: returnReason || 'Follow-up visit'
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast('Patient sent to triage successfully');
        setShowReturnModal(false);
        setReturnReason('');
        setReturnPatientId(null);
        fetchDashboardData();
      } else {
        showToast(data.message || 'Failed to send to triage', 'error');
      }
    } catch (error) {
      console.error('Error sending to triage:', error);
      showToast('Failed to send to triage', 'error');
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/card-office/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  // View patient details
  const viewPatientDetails = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/card-office/patients/${patientId}?hospital_id=${hospitalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setSelectedPatient(data.patient);
        setShowPatientModal(true);
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
      showToast('Failed to fetch patient details', 'error');
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    // Socket.IO listeners
    if (window.io) {
      const socket = window.io();
      socket.on('patient_registered', () => {
        fetchDashboardData();
        showToast('New patient registered');
      });
      
      socket.on('new_notification', () => {
        fetchDashboardData();
      });
    }
    
    return () => {
      clearInterval(timer);
    };
  }, [fetchDashboardData]);

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  const PatientRow = ({ patient, index, showActions = false }) => (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group">
      <div className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer" onClick={() => viewPatientDetails(patient.id)}>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="text-blue-600 font-medium text-sm">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 truncate">
            {patient.first_name} {patient.middle_name ? patient.middle_name + ' ' : ''}{patient.last_name}
          </p>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span className="font-mono">#{patient.card_number}</span>
            <span>•</span>
            <span>Age: {patient.age}</span>
            <span>•</span>
            <span>{patient.gender}</span>
            {patient.is_return && (
              <>
                <span>•</span>
                <span className="text-orange-500">Returning</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
          patient.status === 'in_triage' ? 'bg-yellow-100 text-yellow-700' :
          patient.status === 'in_opd' ? 'bg-blue-100 text-blue-700' :
          patient.status === 'in_emergency' ? 'bg-red-100 text-red-700' :
          patient.status === 'in_anc' ? 'bg-pink-100 text-pink-700' :
          patient.status === 'admitted' ? 'bg-purple-100 text-purple-700' :
          patient.status === 'discharged' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {patient.status?.replace(/_/g, ' ') || 'Registered'}
        </span>
        {showActions && patient.status !== 'in_triage' && (
          <button
            onClick={(e) => { e.stopPropagation(); setReturnPatientId(patient.id); setShowReturnModal(true); }}
            className="text-blue-500 hover:text-blue-700 text-sm hidden group-hover:inline-block"
          >
            Send to Triage
          </button>
        )}
        <ChevronRight size={16} className="text-gray-400" />
      </div>
    </div>
  );

  const NotificationItem = ({ notification }) => (
    <div 
      className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-blue-50' : ''}`}
      onClick={() => markNotificationRead(notification.id)}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-1 rounded-full ${notification.priority === 'high' ? 'bg-red-100' : 'bg-blue-100'}`}>
          <Bell size={14} className={notification.priority === 'high' ? 'text-red-500' : 'text-blue-500'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">{notification.title}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
        {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-500" size={48} />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Card Office Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">
                Welcome back, {user?.full_name || 'Staff'}! 
                <span className="mx-2">•</span>
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
                <span className="mx-2">•</span>
                {format(currentTime, 'h:mm a')}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-30">
                    <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-medium text-gray-800">Notifications</h3>
                      <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <NotificationItem key={notification.id} notification={notification} />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={fetchDashboardData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <RefreshCw size={20} />
              </button>
              <button onClick={() => setRegisterModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2">
                <UserPlus size={18} />
                <span>New Patient</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by card number, name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button onClick={handleSearch} className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2">
              <Search size={16} />
              <span>Search</span>
            </button>
          </div>

          {showSearch && (
            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-700">Search Results ({searchResults.length})</h3>
                <button onClick={() => setShowSearch(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No patients found</p>
                ) : (
                  searchResults.map((patient, idx) => (
                    <PatientRow key={patient.id} patient={patient} index={idx} showActions={true} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard title="Today's Registrations" value={stats.today} icon={UserPlus} color="bg-blue-500" subtitle="New patients today" />
          <StatCard title="Waiting for Triage" value={stats.inTriage} icon={Clock} color="bg-yellow-500" subtitle="Need assessment" />
          <StatCard title="Active Patients" value={stats.active} icon={Activity} color="bg-green-500" subtitle="In consultation" />
          <StatCard title="Total Patients" value={stats.total} icon={Users} color="bg-purple-500" subtitle="All time registered" />
        </div>

        {/* Today's Schedule */}
        {todaySchedule && todaySchedule.has_schedule && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm p-4 mb-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <Calendar size={24} />
                <div>
                  <p className="text-sm opacity-90">Today's Schedule</p>
                  <p className="font-medium">
                    {todaySchedule.current_shift ? (
                      <>Current: {todaySchedule.current_shift.shift_name} Shift ({todaySchedule.current_shift.start_time} - {todaySchedule.current_shift.end_time})</>
                    ) : todaySchedule.upcoming_shift ? (
                      <>Upcoming: {todaySchedule.upcoming_shift.shift_name} Shift at {todaySchedule.upcoming_shift.start_time}</>
                    ) : (
                      <>No shift scheduled for today</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patients in Triage */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ClipboardList size={20} className="text-yellow-500" />
                  <h2 className="font-semibold text-gray-800">Patients in Triage</h2>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {inTriagePatients.length} waiting
                </span>
              </div>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {inTriagePatients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users size={48} className="mx-auto mb-3 text-gray-300" />
                  <p>No patients waiting for triage</p>
                </div>
              ) : (
                inTriagePatients.map((patient, idx) => <PatientRow key={patient.id} patient={patient} index={idx} />)
              )}
            </div>
          </div>

          {/* Recent Registrations */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Calendar size={20} className="text-blue-500" />
                <h2 className="font-semibold text-gray-800">Recent Registrations</h2>
              </div>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {recentPatients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserPlus size={48} className="mx-auto mb-3 text-gray-300" />
                  <p>No recent registrations</p>
                </div>
              ) : (
                recentPatients.map((patient, idx) => <PatientRow key={patient.id} patient={patient} index={idx} showActions={true} />)
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button onClick={() => setRegisterModal(true)} className="bg-blue-500 text-white rounded-xl p-4 hover:bg-blue-600 transition-colors flex flex-col items-center text-center">
            <UserPlus size={28} className="mb-2" />
            <p className="font-medium text-sm">Register New</p>
          </button>
          
          <button onClick={handleSearch} className="bg-green-500 text-white rounded-xl p-4 hover:bg-green-600 transition-colors flex flex-col items-center text-center">
            <Search size={28} className="mb-2" />
            <p className="font-medium text-sm">Search</p>
          </button>
          
          <Link to="/card-office/reports" className="bg-purple-500 text-white rounded-xl p-4 hover:bg-purple-600 transition-colors flex flex-col items-center text-center">
            <FileText size={28} className="mb-2" />
            <p className="font-medium text-sm">Reports</p>
          </Link>
          
          <Link to="/card-office/profile" className="bg-gray-700 text-white rounded-xl p-4 hover:bg-gray-800 transition-colors flex flex-col items-center text-center">
            <UserCheck size={28} className="mb-2" />
            <p className="font-medium text-sm">Profile</p>
          </Link>
        </div>
      </div>

      {/* Register Modal */}
      {registerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">Register New Patient</h2>
              <button onClick={() => setRegisterModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleRegisterPatient} className="p-4 space-y-4">
              <input type="text" placeholder="First Name *" value={newPatient.first_name} onChange={(e) => setNewPatient({...newPatient, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              <input type="text" placeholder="Middle Name" value={newPatient.middle_name} onChange={(e) => setNewPatient({...newPatient, middle_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Last Name *" value={newPatient.last_name} onChange={(e) => setNewPatient({...newPatient, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              <input type="number" placeholder="Age *" value={newPatient.age} onChange={(e) => setNewPatient({...newPatient, age: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              <select value={newPatient.gender} onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input type="tel" placeholder="Phone" value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setRegisterModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send to Triage Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Send to Triage</h2>
              <button onClick={() => setShowReturnModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} rows="3" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Reason for visit..." />
              <div className="flex space-x-3">
                <button onClick={() => setShowReturnModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSendToTriage} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Send to Triage</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Details Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Patient Details</h2>
              <button onClick={() => setShowPatientModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-semibold text-lg">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                <p className="text-gray-600 text-sm">Card: {selectedPatient.card_number}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-gray-500 text-xs">Age</p><p className="font-medium">{selectedPatient.age} years</p></div>
                <div><p className="text-gray-500 text-xs">Gender</p><p className="font-medium">{selectedPatient.gender}</p></div>
                <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium">{selectedPatient.phone || 'N/A'}</p></div>
                <div><p className="text-gray-500 text-xs">Status</p><p className="font-medium capitalize">{selectedPatient.status?.replace(/_/g, ' ')}</p></div>
                <div className="col-span-2"><p className="text-gray-500 text-xs">Registered At</p><p className="font-medium">{format(new Date(selectedPatient.registered_at), 'PPP p')}</p></div>
              </div>
              <div className="flex space-x-3 pt-3">
                <button onClick={() => setShowPatientModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Close</button>
                {selectedPatient.status !== 'in_triage' && (
                  <button onClick={() => { setShowPatientModal(false); setReturnPatientId(selectedPatient.id); setShowReturnModal(true); }} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Send to Triage</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardOfficeDashboard;