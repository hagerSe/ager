// frontend/src/components/StaffDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaUserMd, FaUserNurse, FaPills, FaFlask, FaXRay, 
  FaBaby, FaHeartbeat, FaCreditCard, FaBed, FaUserTie,
  FaHome, FaBell, FaUserCircle, FaSignOutAlt, FaSpinner,
  FaEnvelope, FaEnvelopeOpen, FaPaperPlane, FaInbox,
  FaReply, FaEye, FaTimes, FaChartLine, FaCalendarAlt,
  FaPhone, FaEnvelope as FaEnvelopeIcon, FaBuilding,
  FaCalendarWeek, FaClock, FaMoon, FaSun, FaCloudSun
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const StaffDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [weeklySchedule, setWeeklySchedule] = useState(null);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [reportFormData, setReportFormData] = useState({
    title: '',
    body: '',
    priority: 'medium',
    recipient_id: ''
  });
  const [hospitalAdmins, setHospitalAdmins] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigate = useNavigate();
  const API_URL = 'http://localhost:5001';

  // Department configuration
  const departmentConfig = {
    doctor: { icon: <FaUserMd />, color: 'teal', name: 'Doctor', wards: ['OPD', 'EME', 'ANC'], bgGradient: 'from-teal-500 to-emerald-500' },
    nurse: { icon: <FaUserNurse />, color: 'emerald', name: 'Nurse', wards: ['OPD', 'EME', 'ANC'], bgGradient: 'from-emerald-500 to-teal-500' },
    midwife: { icon: <FaBaby />, color: 'pink', name: 'Midwife', wards: ['ANC'], bgGradient: 'from-pink-500 to-rose-500' },
    pharma: { icon: <FaPills />, color: 'purple', name: 'Pharmacy', wards: [], bgGradient: 'from-purple-500 to-indigo-500' },
    lab: { icon: <FaFlask />, color: 'yellow', name: 'Lab', wards: [], bgGradient: 'from-yellow-500 to-amber-500' },
    radio: { icon: <FaXRay />, color: 'indigo', name: 'Radiology', wards: [], bgGradient: 'from-indigo-500 to-blue-500' },
    triage: { icon: <FaHeartbeat />, color: 'orange', name: 'Triage', wards: [], bgGradient: 'from-orange-500 to-red-500' },
    card_office: { icon: <FaCreditCard />, color: 'red', name: 'Card Office', wards: [], bgGradient: 'from-red-500 to-rose-500' },
    bed_management: { icon: <FaBed />, color: 'teal', name: 'Bed Management', wards: [], bgGradient: 'from-teal-500 to-cyan-500' },
    human_resource: { icon: <FaUserTie />, color: 'gray', name: 'HR', wards: [], bgGradient: 'from-gray-500 to-slate-500' }
  };

  const currentDepartment = user?.department?.toLowerCase() || 'doctor';
  const config = departmentConfig[currentDepartment] || departmentConfig.doctor;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchDashboardData();
    fetchSchedule();
    fetchTodaySchedule();
    fetchWeeklySchedule();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/staff/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setProfile(res.data.staff);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [inboxRes, outboxRes, notifRes] = await Promise.all([
        axios.get(`${API_URL}/api/staff/reports/inbox`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/staff/reports/outbox`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/staff/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (inboxRes.data.success) {
        setInbox(inboxRes.data.reports || []);
        setUnreadCount(inboxRes.data.unreadCount || 0);
      }
      if (outboxRes.data.success) setOutbox(outboxRes.data.reports || []);
      if (notifRes.data.success) setNotifications(notifRes.data.notifications || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchSchedule = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/staff/my-schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setSchedule(res.data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const fetchTodaySchedule = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/staff/today-schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setTodaySchedule(res.data);
    } catch (error) {
      console.error('Error fetching today schedule:', error);
    }
  };

  const fetchWeeklySchedule = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/staff/weekly-schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setWeeklySchedule(res.data);
    } catch (error) {
      console.error('Error fetching weekly schedule:', error);
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/staff/reports/send`, reportFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setShowReportModal(false);
        setReportFormData({ title: '', body: '', priority: 'medium', recipient_id: '' });
        alert('Report sent successfully!');
        fetchDashboardData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error sending report');
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      alert('Please enter a reply message');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/staff/reports/${selectedReport.id}/reply`, {
        body: replyText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setShowReplyModal(false);
        setReplyText('');
        alert('Reply sent successfully!');
        fetchDashboardData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error sending reply');
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/staff/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800 animate-pulse'
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <div className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} shadow-2xl`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 bg-gradient-to-r ${config.bgGradient} rounded-lg flex items-center justify-center shadow-lg`}>
                  {config.icon}
                </div>
                <span className="font-bold text-base tracking-tight">{config.name} Dashboard</span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className={`w-8 h-8 bg-gradient-to-r ${config.bgGradient} rounded-lg flex items-center justify-center shadow-lg mx-auto`}>
                {config.icon}
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              {sidebarCollapsed ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /> </svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /> </svg>}
            </button>
          </div>

          <nav className="space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${activeTab === 'dashboard' ? `bg-gradient-to-r ${config.bgGradient} shadow-lg` : 'hover:bg-slate-700'}`}>
              <FaHome className="text-lg" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </button>
            <button onClick={() => setActiveTab('schedule')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${activeTab === 'schedule' ? `bg-gradient-to-r ${config.bgGradient} shadow-lg` : 'hover:bg-slate-700'}`}>
              <FaCalendarAlt className="text-lg" />
              {!sidebarCollapsed && <span>My Schedule</span>}
            </button>
            <button onClick={() => setActiveTab('inbox')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 relative text-sm ${activeTab === 'inbox' ? `bg-gradient-to-r ${config.bgGradient} shadow-lg` : 'hover:bg-slate-700'}`}>
              <FaInbox className="text-lg" />
              {!sidebarCollapsed && <span>Inbox</span>}
              {unreadCount > 0 && <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{unreadCount}</span>}
            </button>
            <button onClick={() => setActiveTab('outbox')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${activeTab === 'outbox' ? `bg-gradient-to-r ${config.bgGradient} shadow-lg` : 'hover:bg-slate-700'}`}>
              <FaPaperPlane className="text-lg" />
              {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>
            <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${activeTab === 'profile' ? `bg-gradient-to-r ${config.bgGradient} shadow-lg` : 'hover:bg-slate-700'}`}>
              <FaUserCircle className="text-lg" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b border-gray-100">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  {activeTab === 'dashboard' && `${config.name} Dashboard`}
                  {activeTab === 'schedule' && 'My Schedule'}
                  {activeTab === 'inbox' && 'Inbox'}
                  {activeTab === 'outbox' && 'Sent Reports'}
                  {activeTab === 'profile' && 'My Profile'}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">Welcome back, {profile?.first_name || user?.first_name || 'Staff'}</p>
              </div>
              <div className="flex items-center space-x-3">
                <button onClick={() => setShowNotificationPanel(!showNotificationPanel)} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <FaBell className="text-lg text-gray-600" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse">{unreadCount}</span>}
                </button>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-medium">
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Notification Panel */}
        <AnimatePresence>
          {showNotificationPanel && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute right-6 top-20 w-80 bg-white rounded-xl shadow-2xl z-50 border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${!notif.is_read ? 'bg-teal-50' : ''}`} onClick={() => markNotificationAsRead(notif.id)}>
                    <p className="text-xs font-medium text-gray-800">{notif.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                  </div>
                )) : (
                  <div className="p-8 text-center text-gray-500"><FaBell className="text-3xl mx-auto mb-2 text-gray-300" /><p className="text-xs">No notifications</p></div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Today's Schedule Card */}
              {todaySchedule && (
                <div className={`bg-gradient-to-r ${config.bgGradient} rounded-2xl p-6 text-white shadow-xl`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm">Today's Schedule</p>
                      <p className="text-2xl font-bold mt-1">{todaySchedule.date}</p>
                      {todaySchedule.current_shift ? (
                        <div className="mt-3">
                          <p className="text-lg font-semibold">🟢 Current Shift: {todaySchedule.current_shift.shift_name}</p>
                          <p className="text-sm text-white/80">{todaySchedule.current_shift.start_time} - {todaySchedule.current_shift.end_time} | Ward: {todaySchedule.current_shift.ward || 'N/A'}</p>
                        </div>
                      ) : todaySchedule.upcoming_shift ? (
                        <div className="mt-3">
                          <p className="text-lg font-semibold">⏰ Upcoming: {todaySchedule.upcoming_shift.shift_name}</p>
                          <p className="text-sm text-white/80">Starts at {todaySchedule.upcoming_shift.start_time}</p>
                        </div>
                      ) : (
                        <p className="mt-3">No shifts scheduled for today</p>
                      )}
                    </div>
                    <div className="text-6xl opacity-20">{config.icon}</div>
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm text-gray-500 mb-1">Inbox</p><p className="text-3xl font-bold text-teal-600">{unreadCount}</p></div>
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center"><FaInbox className="text-xl text-teal-600" /></div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm text-gray-500 mb-1">Total Shifts</p><p className="text-3xl font-bold text-purple-600">{schedule?.summary?.total_shifts || 0}</p></div>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><FaCalendarAlt className="text-xl text-purple-600" /></div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm text-gray-500 mb-1">Total Hours</p><p className="text-3xl font-bold text-emerald-600">{schedule?.summary?.total_hours || 0}</p></div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center"><FaClock className="text-xl text-emerald-600" /></div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm text-gray-500 mb-1">Department</p><p className="text-3xl font-bold text-orange-600">{config.name}</p></div>
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">{config.icon}</div>
                  </div>
                </div>
              </div>

              {/* Recent Inbox */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Messages</h2>
                {inbox.slice(0, 5).map((report) => (
                  <div key={report.id} className="border-b border-gray-100 py-3 cursor-pointer hover:bg-gray-50 transition" onClick={() => { setSelectedReport(report); setShowReportDetailModal(true); }}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3"><span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>{report.priority}</span><span className="font-medium text-gray-800">{report.title}</span></div>
                      <span className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">{report.body}</p>
                  </div>
                ))}
                {inbox.length === 0 && <p className="text-gray-500 text-center py-4">No messages in inbox</p>}
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && weeklySchedule && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Weekly Schedule</h2>
                <p className="text-sm text-gray-500 mb-4">{weeklySchedule.week_range?.start_formatted} - {weeklySchedule.week_range?.end_formatted}</p>
                <div className="grid grid-cols-7 gap-2">
                  {weeklySchedule.weekly_view?.map((day, idx) => (
                    <div key={idx} className={`p-3 rounded-xl text-center ${day.is_today ? `bg-gradient-to-r ${config.bgGradient} text-white` : 'bg-gray-50'}`}>
                      <p className="text-xs font-semibold">{day.day?.substring(0, 3)}</p>
                      <p className="text-lg font-bold">{new Date(day.date).getDate()}</p>
                      {day.has_shifts ? <div className="mt-1 text-xs">{day.shifts.length} shift(s)</div> : <div className="mt-1 text-xs text-gray-400">Off</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Upcoming Shifts</h2>
                <div className="space-y-3">
                  {weeklySchedule.schedules?.map((shift, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3"><span className="text-2xl">{shift.shift_icon}</span><div><p className="font-medium text-gray-800">{shift.shift_name}</p><p className="text-xs text-gray-500">{new Date(shift.date).toLocaleDateString()}</p></div></div>
                      <div className="text-right"><p className="text-sm text-gray-600">{shift.start_time} - {shift.end_time}</p><p className="text-xs text-gray-400">{shift.hours} hours</p></div>
                    </div>
                  ))}
                  {(!weeklySchedule.schedules || weeklySchedule.schedules.length === 0) && <p className="text-gray-500 text-center py-4">No upcoming shifts</p>}
                </div>
              </div>
            </div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Inbox</h2>
              <div className="space-y-4">
                {inbox.map((report) => (
                  <div key={report.id} className={`border rounded-xl p-4 cursor-pointer hover:shadow-md transition ${!report.is_opened ? 'border-teal-300 bg-teal-50' : 'border-gray-200'}`} onClick={() => { setSelectedReport(report); setShowReportDetailModal(true); }}>
                    <div className="flex justify-between items-start">
                      <div><h3 className="font-semibold text-gray-800">{report.title}</h3><p className="text-xs text-gray-500 mt-1">From: {report.sender_full_name}</p></div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>{report.priority}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.body}</p>
                    <div className="flex justify-between items-center mt-3"><p className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleString()}</p><button className="text-teal-600 text-sm hover:underline">View Details</button></div>
                  </div>
                ))}
                {inbox.length === 0 && <div className="text-center py-16"><FaInbox className="text-5xl text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No reports in inbox</p></div>}
              </div>
            </div>
          )}

          {/* Outbox Tab */}
          {activeTab === 'outbox' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Sent Reports</h2>
              <div className="space-y-4">
                {outbox.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start"><h3 className="font-semibold text-gray-800">{report.title}</h3><span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>{report.priority}</span></div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.body}</p>
                    <p className="text-xs text-gray-400 mt-2">Sent: {new Date(report.sent_at).toLocaleString()}</p>
                  </div>
                ))}
                {outbox.length === 0 && <div className="text-center py-16"><FaPaperPlane className="text-5xl text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No sent reports</p></div>}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && profile && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className={`bg-gradient-to-r ${config.bgGradient} px-8 py-10`}>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl text-4xl">{config.icon}</div>
                  <div className="text-white"><h2 className="text-2xl font-bold mb-1">{profile.first_name} {profile.last_name}</h2><p className="text-white/80">{config.name}</p>{profile.ward && <p className="text-sm text-white/70 mt-1">Ward: {profile.ward}</p>}</div>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-5"><h4 className="font-semibold text-teal-600 mb-4">Personal Information</h4><div className="space-y-2"><p><span className="text-gray-500">Email:</span> {profile.email}</p><p><span className="text-gray-500">Phone:</span> {profile.phone || 'Not provided'}</p><p><span className="text-gray-500">Gender:</span> {profile.gender}</p><p><span className="text-gray-500">Age:</span> {profile.age} years</p></div></div>
                  <div className="bg-gray-50 rounded-xl p-5"><h4 className="font-semibold text-teal-600 mb-4">Work Information</h4><div className="space-y-2"><p><span className="text-gray-500">Department:</span> {profile.department}</p>{profile.ward && <p><span className="text-gray-500">Ward:</span> {profile.ward}</p>}<p><span className="text-gray-500">Role:</span> {profile.role}</p><p><span className="text-gray-500">Status:</span> <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">{profile.status}</span></p></div></div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Report Detail Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">{selectedReport.title}</h2><button onClick={() => setShowReportDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full">✕</button></div>
              <div className="space-y-4"><div><p className="text-sm text-gray-500">From</p><p className="font-semibold">{selectedReport.sender_full_name}</p></div><div className="bg-gray-50 p-4 rounded-xl"><p className="text-gray-800 whitespace-pre-wrap">{selectedReport.body}</p></div><div className="flex justify-end"><button onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} className={`px-4 py-2 bg-gradient-to-r ${config.bgGradient} text-white rounded-xl`}><FaReply className="inline mr-2" /> Reply</button></div></div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"><div className="p-6"><h2 className="text-xl font-bold mb-4">Reply to Report</h2><textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows="5" className="w-full p-3 border rounded-xl" placeholder="Type your reply..." /><div className="flex justify-end gap-3 mt-4"><button onClick={() => { setShowReplyModal(false); setReplyText(''); }} className="px-4 py-2 border rounded-xl">Cancel</button><button onClick={handleSendReply} className={`px-4 py-2 bg-gradient-to-r ${config.bgGradient} text-white rounded-xl`}>Send Reply</button></div></div></div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;