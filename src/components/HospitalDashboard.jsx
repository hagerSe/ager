import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  FaHome, FaHospital, FaBell, FaUserCircle, FaSignOutAlt,
  FaInbox, FaPaperPlane, FaUsers, FaChartBar,
  FaPlus, FaChevronLeft, FaChevronRight,
  FaEnvelope, FaEnvelopeOpen, FaTimes, FaSpinner,
  FaUserMd, FaUserNurse, FaFlask, FaXRay, FaBaby,
  FaBed, FaUserTie, FaCreditCard,
  FaPhone, FaEnvelope as FaEnvelopeIcon,
  FaHeartbeat, FaPills, FaHospitalAlt,
  FaChartLine, FaEdit, FaSave, FaKey, FaCamera,
  FaReply, FaEye, FaPaperclip, FaTrash, FaDownload,
  FaFileAlt, FaFilter, FaSearch, FaArrowLeft, FaComment
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const HospitalDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [staff, setStaff] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showStaffDetailModal, setShowStaffDetailModal] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [kebeleAdmin, setKebeleAdmin] = useState(null);
  const [socketConnectionStatus, setSocketConnectionStatus] = useState('connecting');
  const [realTimeNotification, setRealTimeNotification] = useState(null);
  const socketRef = useRef(null);
  
  // Chat-like conversation states
  const [showConversationView, setShowConversationView] = useState(false);
  const [conversationThread, setConversationThread] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationReplyText, setConversationReplyText] = useState('');
  
  // Report Analytics States
  const [showReportAnalytics, setShowReportAnalytics] = useState(false);
  const [reportTypes, setReportTypes] = useState(null);
  const [selectedReportType, setSelectedReportType] = useState('general');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '', middle_name: '', last_name: '', gender: '', age: '', phone: '',
    email: '', hospital_name: '', service_type: '', hospital_type: '', kebele_name: '', address: '', website: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  
  // Staff form data
  const [staffFormData, setStaffFormData] = useState({
    first_name: '', middle_name: '', last_name: '', gender: 'Male', age: '', email: '', password: '', phone: '', department: 'Doctor', ward: ''
  });
  
  // Report form data
  const [reportFormData, setReportFormData] = useState({
    title: '', body: '', priority: 'medium', recipient_type: '', recipient_id: ''
  });

  const requireWardDepartments = ['Doctor', 'Nurse', 'Midwife', 'Pharma', 'Lab', 'Radio'];
  const needsWardSelection = requireWardDepartments.includes(staffFormData.department);
  const wards = ['OPD', 'EME', 'ANC'];
  const departments = ['Doctor', 'Nurse', 'Pharma', 'Lab', 'Radio', 'Midwife', 'Triage', 'Card_Office', 'Bed_Management', 'Human_Resource'];

  const navigate = useNavigate();
  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected');
      setSocketConnectionStatus('connected');
      const hospitalId = user?.hospital_id || profileData?.hospital_id;
      if (hospitalId) {
        socketRef.current.emit('join', `hospital_${hospitalId}_admin`);
      }
    });

    socketRef.current.on('connect_error', () => setSocketConnectionStatus('disconnected'));
    socketRef.current.on('disconnect', () => setSocketConnectionStatus('disconnected'));

    socketRef.current.on('new_report_from_doctor', (data) => {
      setRealTimeNotification({ id: Date.now(), type: 'report', title: 'New Report', message: `${data.sender_name} sent: "${data.title}"`, priority: data.priority, timestamp: new Date() });
      setTimeout(() => setRealTimeNotification(null), 6000);
      fetchDashboardData();
    });

    socketRef.current.on('report_reply_from_doctor', (data) => {
      setRealTimeNotification({ id: Date.now(), type: 'reply', title: 'New Reply', message: `Dr. ${data.sender_name} replied to your report`, priority: data.priority, timestamp: new Date() });
      setTimeout(() => setRealTimeNotification(null), 6000);
      fetchDashboardData();
    });

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [user?.hospital_id, profileData?.hospital_id]);

  // ==================== DATA FETCHING ====================
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [statsRes, inboxRes, outboxRes, staffRes, notifRes] = await Promise.all([
        axios.get(`${API_URL}/api/hospital/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/hospital/reports/inbox`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/hospital/reports/outbox`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/hospital/staff`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/hospital/notifications?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (inboxRes.data.success) { setInbox(inboxRes.data.reports); setUnreadCount(inboxRes.data.unreadCount); }
      if (outboxRes.data.success) setOutbox(outboxRes.data.reports);
      if (staffRes.data.success) setStaff(staffRes.data.staff);
      if (notifRes.data.success) setNotifications(notifRes.data.notifications);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      if (error.response?.status === 401) { localStorage.removeItem('token'); navigate('/login'); }
    } finally { setLoading(false); }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hospital/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        const hospital = res.data.hospital;
        setProfileData({
          first_name: hospital.first_name || '', middle_name: hospital.middle_name || '', last_name: hospital.last_name || '',
          gender: hospital.gender || '', age: hospital.age || '', phone: hospital.phone || '', email: hospital.email || '',
          hospital_name: hospital.hospital_name || '', service_type: hospital.service_type || '', hospital_type: hospital.hospital_type || '',
          kebele_name: hospital.kebele_admin?.kebele_name || '', address: hospital.address || '', website: hospital.website || ''
        });
      }
    } catch (error) { console.error('Error fetching profile:', error); }
  };

  const fetchRecipients = async () => {
    try {
      const token = localStorage.getItem('token');
      const [staffRes, kebeleRes] = await Promise.all([
        axios.get(`${API_URL}/api/hospital/staff/all`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/hospital/kebele-admin`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (staffRes.data.success) setRecipients(staffRes.data.staff);
      if (kebeleRes.data.success) setKebeleAdmin(kebeleRes.data.kebele_admin);
    } catch (error) { console.error('Error fetching recipients:', error); }
  };

  // ==================== CONVERSATION THREAD (CHAT-LIKE) ====================
  const fetchConversationThread = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hospital/reports/thread/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setConversationThread(res.data.thread);
        setCurrentConversationId(reportId);
        setShowConversationView(true);
        setShowReportDetailModal(false);
        setShowReportAnalytics(false);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
      alert('Could not load conversation');
    }
  };

  const sendConversationReply = async () => {
    if (!conversationReplyText.trim()) {
      alert('Please enter a reply message');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/hospital/reports/${currentConversationId}/reply`, 
        { body: conversationReplyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setConversationReplyText('');
        await fetchConversationThread(currentConversationId);
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert(error.response?.data?.message || 'Error sending reply');
    }
  };

  // ==================== REPORT ANALYTICS ====================
  const fetchReportTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hospital/reports/types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setReportTypes(res.data.reportTypes);
      }
    } catch (error) {
      console.error('Error fetching report types:', error);
    }
  };

  const fetchStaffListForReport = async (department) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/hospital/reports/staff-list?department=${department || 'all'}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStaffList(res.data.staff);
      }
    } catch (error) {
      console.error('Error fetching staff list:', error);
    }
  };

  const fetchReportSummary = async () => {
    setLoadingReport(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/api/hospital/reports/summary?type=${selectedReportType}`;
      
      if (selectedReportType === 'by_department' && selectedDepartment) {
        url += `&department=${selectedDepartment}`;
        if (selectedWard) url += `&ward=${selectedWard}`;
      } else if (selectedReportType === 'by_staff' && selectedStaffId) {
        const selectedStaffMember = staffList.find(s => s.id.toString() === selectedStaffId);
        if (selectedStaffMember) {
          url += `&department=${selectedStaffMember.department}`;
          if (selectedWard) url += `&ward=${selectedWard}`;
        }
      } else if (selectedReportType === 'by_ward' && selectedWard) {
        url += `&ward=${selectedWard}`;
      }
      
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Error loading report data');
    } finally {
      setLoadingReport(false);
    }
  };

  const openReportAnalytics = async () => {
    setShowReportAnalytics(true);
    setShowConversationView(false);
    await fetchReportTypes();
  };

  // ==================== STAFF MANAGEMENT ====================
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const submitData = { ...staffFormData };
      if (!needsWardSelection) delete submitData.ward;
      
      const res = await axios.post(`${API_URL}/api/hospital/staff`, submitData, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setStaffFormData({ first_name: '', middle_name: '', last_name: '', gender: 'Male', age: '', email: '', password: '', phone: '', department: 'Doctor', ward: '' });
        setShowStaffModal(false);
        fetchDashboardData();
        alert('Staff member created successfully!');
      }
    } catch (error) { alert(error.response?.data?.message || 'Error creating staff'); }
  };

  // ==================== REPORT MANAGEMENT ====================
  const handleSendReport = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/hospital/reports/send`, reportFormData, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setShowReportModal(false);
        setReportFormData({ title: '', body: '', priority: 'medium', recipient_type: '', recipient_id: '' });
        alert('Report sent successfully!');
        fetchDashboardData();
      }
    } catch (error) { alert(error.response?.data?.message || 'Error sending report'); }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) { alert('Please enter a reply message'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/hospital/reports/${selectedReport.id}/reply`, { body: replyText }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setShowReplyModal(false);
        setReplyText('');
        alert('Reply sent successfully!');
        fetchDashboardData();
      }
    } catch (error) { alert(error.response?.data?.message || 'Error sending reply'); }
  };

  // ==================== PROFILE MANAGEMENT ====================
  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/hospital/profile`, profileData, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) { setIsEditingProfile(false); alert('Profile updated successfully!'); fetchProfile(); }
    } catch (error) { alert(error.response?.data?.message || 'Error updating profile'); }
  };

  const changePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) { alert('Passwords do not match'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/hospital/change-password`, { current_password: passwordData.current_password, new_password: passwordData.new_password }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) { setShowPasswordModal(false); setPasswordData({ current_password: '', new_password: '', confirm_password: '' }); alert('Password changed successfully!'); }
    } catch (error) { alert(error.response?.data?.message || 'Error changing password'); }
  };

  // ==================== NOTIFICATIONS ====================
  const markNotificationAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/hospital/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchDashboardData();
    } catch (error) { console.error('Error marking notification:', error); }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/hospital/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchDashboardData();
    } catch (error) { console.error('Error marking all as read:', error); }
  };

  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/hospital/reports/${reportId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchDashboardData();
    } catch (error) { console.error('Error marking report as read:', error); }
  };

  // ==================== UTILITIES ====================
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const viewStaffDetails = (staffMember) => { setSelectedStaff(staffMember); setShowStaffDetailModal(true); };
  
  const viewReportDetails = (report) => { 
    setSelectedReport(report); 
    setShowReportDetailModal(true); 
    if (!report.is_opened) markReportAsRead(report.id); 
  };

  const getPriorityBadge = (priority) => {
    const colors = { low: 'bg-teal-100 text-teal-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-orange-100 text-orange-800', urgent: 'bg-red-100 text-red-800 animate-pulse' };
    return colors[priority] || colors.medium;
  };

  const getPriorityIcon = (priority) => {
    const icons = { low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' };
    return icons[priority] || '🟡';
  };

  const getDepartmentIcon = (department) => {
    const icons = {
      Doctor: <FaUserMd className="text-teal-500" />, Nurse: <FaUserNurse className="text-emerald-500" />,
      Pharma: <FaPills className="text-purple-500" />, Lab: <FaFlask className="text-yellow-500" />,
      Radio: <FaXRay className="text-indigo-500" />, Midwife: <FaBaby className="text-pink-500" />,
      Triage: <FaHeartbeat className="text-orange-500" />, Card_Office: <FaCreditCard className="text-red-500" />,
      Bed_Management: <FaBed className="text-teal-500" />, Human_Resource: <FaUserTie className="text-gray-500" />
    };
    return icons[department] || <FaUserCircle className="text-gray-500" />;
  };

  useEffect(() => { fetchDashboardData(); fetchProfile(); }, []);

  const RealTimeNotification = () => {
    if (!realTimeNotification) return null;
    const priorityColors = { low: 'border-teal-500', medium: 'border-yellow-500', high: 'border-orange-500', urgent: 'border-red-500' };
    return (
      <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
        className={`fixed bottom-6 right-6 z-[10000] max-w-md bg-white rounded-2xl shadow-2xl border-l-4 ${priorityColors[realTimeNotification.priority]} overflow-hidden`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-teal-100">
                {realTimeNotification.type === 'reply' ? '💬' : '📬'}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{realTimeNotification.title}</p>
              <p className="text-sm text-gray-600">{realTimeNotification.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(realTimeNotification.timestamp).toLocaleTimeString()}</p>
            </div>
            <button onClick={() => setRealTimeNotification(null)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="text-center"><FaSpinner className="animate-spin text-3xl text-teal-600 mx-auto mb-3" /><p className="text-gray-600">Loading Dashboard...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex">
      <RealTimeNotification />

      {/* Sidebar */}
      <div className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} shadow-2xl`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center"><FaHospital className="text-white text-sm" /></div>
                <span className="font-bold text-base">Hospital Admin</span>
              </div>
            )}
            {sidebarCollapsed && <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto"><FaHospital className="text-white text-sm" /></div>}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-slate-700 rounded-lg">{sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}</button>
          </div>
          <nav className="space-y-1">
            <button onClick={() => { setActiveTab('dashboard'); setShowReportAnalytics(false); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'dashboard' && !showReportAnalytics && !showConversationView ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'}`}>
              <FaHome className="text-lg" /> {!sidebarCollapsed && <span>Dashboard</span>}
            </button>
            <button onClick={() => { setActiveTab('staff'); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'staff' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'}`}>
              <FaUsers className="text-lg" /> {!sidebarCollapsed && <span>Staff Management</span>}
            </button>
            <button onClick={() => { setActiveTab('reports'); openReportAnalytics(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'reports' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'}`}>
              <FaChartBar className="text-lg" /> {!sidebarCollapsed && <span>Reports & Analytics</span>}
            </button>
            <button onClick={() => { setActiveTab('inbox'); fetchDashboardData(); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition relative ${activeTab === 'inbox' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'}`}>
              <FaInbox className="text-lg" /> {!sidebarCollapsed && <span>Inbox</span>}
              {unreadCount > 0 && <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{unreadCount}</span>}
            </button>
            <button onClick={() => { setActiveTab('outbox'); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'outbox' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'}`}>
              <FaPaperPlane className="text-lg" /> {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>
            <button onClick={() => { setActiveTab('profile'); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'profile' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'}`}>
              <FaUserCircle className="text-lg" /> {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b border-gray-100">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  {showConversationView ? 'Conversation Thread' : (
                    activeTab === 'dashboard' && !showReportAnalytics ? 'Hospital Dashboard' :
                    activeTab === 'dashboard' && showReportAnalytics ? 'Reports & Analytics' :
                    activeTab === 'staff' ? 'Staff Management' :
                    activeTab === 'reports' ? 'Reports & Analytics' :
                    activeTab === 'inbox' ? 'Inbox' :
                    activeTab === 'outbox' ? 'Sent Reports' :
                    activeTab === 'profile' ? 'My Profile' : 'Hospital Dashboard'
                  )}
                </h1>
                <p className="text-xs text-gray-500">Welcome back, {profileData.first_name || user?.full_name || 'Admin'}</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${socketConnectionStatus === 'connected' ? 'bg-teal-500' : 'bg-red-500'} animate-pulse`} />
                  <span className="text-xs text-gray-600">{socketConnectionStatus === 'connected' ? 'Live' : 'Offline'}</span>
                </div>
                <button onClick={() => setShowNotificationPanel(!showNotificationPanel)} className="relative p-2 hover:bg-gray-100 rounded-full">
                  <FaBell className="text-lg text-gray-600" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse">{unreadCount}</span>}
                </button>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:shadow-lg text-sm font-medium">
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {showNotificationPanel && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="absolute right-6 top-20 w-80 bg-white rounded-xl shadow-2xl z-50 border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-teal-50 to-emerald-50">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <button onClick={markAllAsRead} className="text-xs text-teal-600 hover:text-teal-800">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notif.is_read ? 'bg-teal-50' : ''}`} onClick={() => markNotificationAsRead(notif.id)}>
                    <p className="text-xs font-medium text-gray-800">{notif.title}</p>
                    <p className="text-xs text-gray-500">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                  </div>
                )) : (
                  <div className="p-8 text-center text-gray-500"><FaBell className="text-3xl mx-auto mb-2 text-gray-300" /><p className="text-xs">No notifications</p></div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Conversation Thread View (Chat-like) */}
          {showConversationView && (
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 flex justify-between items-center">
                <button onClick={() => { setShowConversationView(false); setConversationThread([]); setCurrentConversationId(null); }} className="text-white hover:text-teal-200 flex items-center gap-2">
                  <FaArrowLeft /> Back to Inbox
                </button>
                <h2 className="text-white font-semibold">Conversation Thread</h2>
                <div className="w-20"></div>
              </div>
              <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50">
                {conversationThread.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'hospital' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${msg.sender_type === 'hospital' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white' : 'bg-white border'} rounded-2xl p-4 shadow-sm`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium">{msg.sender_name}</span>
                        <span className="text-xs opacity-70">{msg.sender_department}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${msg.priority === 'urgent' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {msg.priority}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <p className="text-xs mt-2 opacity-70">{new Date(msg.sent_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white border-t">
                <div className="flex gap-3">
                  <textarea
                    value={conversationReplyText}
                    onChange={(e) => setConversationReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    className="flex-1 px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-teal-500 resize-none"
                    rows="2"
                  />
                  <button onClick={sendConversationReply} className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg font-medium">
                    <FaPaperPlane />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reports & Analytics View */}
          {activeTab === 'reports' && !showConversationView && (
            <div className="space-y-6">
              {/* Report Type Dropdown */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><FaChartLine className="text-teal-600" /> Generate Report</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                    <select 
                      value={selectedReportType} 
                      onChange={(e) => { setSelectedReportType(e.target.value); setReportData(null); setSelectedDepartment(''); setSelectedStaffId(''); setSelectedWard(''); }}
                      className="w-full px-4 py-2 border rounded-xl text-sm"
                    >
                      <option value="general">📊 General Overview</option>
                      <option value="by_department">🏥 By Department</option>
                      <option value="by_staff">👨‍⚕️ By Staff Member</option>
                      <option value="by_ward">📍 By Ward</option>
                    </select>
                  </div>
                  
                  {selectedReportType === 'by_department' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                        <select 
                          value={selectedDepartment} 
                          onChange={(e) => { setSelectedDepartment(e.target.value); setReportData(null); fetchStaffListForReport(e.target.value); }}
                          className="w-full px-4 py-2 border rounded-xl text-sm"
                        >
                          <option value="">Select Department</option>
                          {reportTypes?.by_department?.departments?.map(dept => (
                            <option key={dept} value={dept}>{dept === 'Card_Office' ? 'Card Office' : dept}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ward (Optional)</label>
                        <select value={selectedWard} onChange={(e) => { setSelectedWard(e.target.value); setReportData(null); }} className="w-full px-4 py-2 border rounded-xl text-sm">
                          <option value="">All Wards</option>
                          <option value="OPD">OPD</option>
                          <option value="EME">EME</option>
                          <option value="ANC">ANC</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {selectedReportType === 'by_staff' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                        <select 
                          onChange={(e) => { fetchStaffListForReport(e.target.value); setSelectedStaffId(''); setReportData(null); }}
                          className="w-full px-4 py-2 border rounded-xl text-sm"
                        >
                          <option value="">Select Department</option>
                          {reportTypes?.by_staff?.departments?.map(dept => (
                            <option key={dept} value={dept}>{dept === 'Card_Office' ? 'Card Office' : dept}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
                        <select value={selectedStaffId} onChange={(e) => { setSelectedStaffId(e.target.value); setReportData(null); }} className="w-full px-4 py-2 border rounded-xl text-sm">
                          <option value="">Select Staff</option>
                          {staffList.map(s => (
                            <option key={s.id} value={s.id}>{s.name} - {s.department}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  
                  {selectedReportType === 'by_ward' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ward</label>
                      <select value={selectedWard} onChange={(e) => { setSelectedWard(e.target.value); setReportData(null); }} className="w-full px-4 py-2 border rounded-xl text-sm">
                        <option value="">Select Ward</option>
                        <option value="OPD">OPD</option>
                        <option value="EME">EME</option>
                        <option value="ANC">ANC</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="flex items-end">
                    <button onClick={fetchReportSummary} className="w-full px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg font-medium flex items-center justify-center gap-2">
                      <FaSearch /> Generate
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Report Results Display */}
              {loadingReport ? (
                <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                  <FaSpinner className="animate-spin text-3xl text-teal-600 mx-auto mb-3" />
                  <p className="text-gray-600">Loading report data...</p>
                </div>
              ) : reportData && (
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {selectedReportType === 'general' && 'General Hospital Overview'}
                    {selectedReportType === 'by_department' && `Department Report: ${selectedDepartment}`}
                    {selectedReportType === 'by_staff' && 'Staff Performance Report'}
                    {selectedReportType === 'by_ward' && `Ward Report: ${selectedWard}`}
                  </h3>
                  
                  {selectedReportType === 'general' && reportData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-teal-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-teal-600">{reportData.totalPatients || 0}</p>
                          <p className="text-sm text-gray-600">Total Patients</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-emerald-600">{reportData.activeStaff || 0}</p>
                          <p className="text-sm text-gray-600">Active Staff</p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-purple-600">{reportData.totalReports || 0}</p>
                          <p className="text-sm text-gray-600">Total Reports</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border rounded-xl p-4">
                          <h4 className="font-semibold text-gray-800 mb-3">Patients by Gender</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between"><span>Male:</span><span className="font-bold">{reportData.patientsByGender?.male || 0}</span></div>
                            <div className="flex justify-between"><span>Female:</span><span className="font-bold">{reportData.patientsByGender?.female || 0}</span></div>
                          </div>
                        </div>
                        <div className="border rounded-xl p-4">
                          <h4 className="font-semibold text-gray-800 mb-3">Patients by Age Group</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between"><span>Pediatric (&lt;18):</span><span className="font-bold">{reportData.patientsByAgeGroup?.pediatric || 0}</span></div>
                            <div className="flex justify-between"><span>Adult (18-64):</span><span className="font-bold">{reportData.patientsByAgeGroup?.adult || 0}</span></div>
                            <div className="flex justify-between"><span>Geriatric (65+):</span><span className="font-bold">{reportData.patientsByAgeGroup?.geriatric || 0}</span></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border rounded-xl p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Staff by Department</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(reportData.staffByDepartment || {}).map(([dept, count]) => (
                            <div key={dept} className="flex justify-between bg-gray-50 rounded-lg p-2">
                              <span className="text-sm">{dept === 'Card_Office' ? 'Card Office' : dept}:</span>
                              <span className="font-bold text-teal-600">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(selectedReportType === 'by_department' || selectedReportType === 'by_staff') && reportData && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p><strong>Total Staff:</strong> {reportData.totalStaff || 0}</p>
                        {reportData.ward && <p><strong>Ward:</strong> {reportData.ward}</p>}
                      </div>
                      
                      {reportData.staffList && reportData.staffList.length > 0 && (
                        <div className="border rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-3 text-left">Name</th>
                                <th className="p-3 text-left">Email</th>
                                <th className="p-3 text-left">Ward</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.staffList.map(staffMember => (
                                <tr key={staffMember.id} className="border-t">
                                  <td className="p-3">{staffMember.name}</td>
                                  <td className="p-3">{staffMember.email}</td>
                                  <td className="p-3">{staffMember.ward || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {reportData.metrics && Object.keys(reportData.metrics).length > 0 && (
                        <div className="border rounded-xl p-4">
                          <h4 className="font-semibold text-gray-800 mb-3">Department Metrics</h4>
                          <pre className="text-sm bg-gray-50 p-3 rounded-lg overflow-x-auto">
                            {JSON.stringify(reportData.metrics, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && !showReportAnalytics && !showConversationView && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                <div className="bg-white rounded-2xl p-5 shadow-md"><div className="flex justify-between"><div><p className="text-sm text-gray-500">Inbox</p><p className="text-3xl font-bold text-teal-600">{stats?.inbox || 0}</p></div><div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center"><FaInbox className="text-xl text-teal-600" /></div></div><div className="mt-2"><span className="text-xs text-amber-600">{stats?.unread || 0} unread</span></div></div>
                <div className="bg-white rounded-2xl p-5 shadow-md"><div className="flex justify-between"><div><p className="text-sm text-gray-500">Outbox</p><p className="text-3xl font-bold text-emerald-600">{stats?.outbox || 0}</p></div><div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center"><FaPaperPlane className="text-xl text-emerald-600" /></div></div></div>
                <div className="bg-white rounded-2xl p-5 shadow-md"><div className="flex justify-between"><div><p className="text-sm text-gray-500">Total Staff</p><p className="text-3xl font-bold text-purple-600">{stats?.totalStaff || 0}</p></div><div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><FaUsers className="text-xl text-purple-600" /></div></div></div>
                <div className="bg-white rounded-2xl p-5 shadow-md"><div className="flex justify-between"><div><p className="text-sm text-gray-500">Doctors</p><p className="text-3xl font-bold text-blue-600">{stats?.doctorCount || 0}</p></div><div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><FaUserMd className="text-xl text-blue-600" /></div></div></div>
                <div className="bg-white rounded-2xl p-5 shadow-md"><div className="flex justify-between"><div><p className="text-sm text-gray-500">Nurses</p><p className="text-3xl font-bold text-pink-600">{stats?.nurseCount || 0}</p></div><div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center"><FaUserNurse className="text-xl text-pink-600" /></div></div></div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <button onClick={() => { setShowReportModal(true); fetchRecipients(); }} className="p-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaPaperPlane /> New Report</button>
                  <button onClick={() => setShowStaffModal(true)} className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaPlus /> Add Staff</button>
                  <button onClick={() => { setActiveTab('reports'); openReportAnalytics(); }} className="p-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaChartBar /> View Reports</button>
                  <button onClick={() => { const firstUnread = inbox.find(r => !r.is_opened); if(firstUnread) fetchConversationThread(firstUnread.id); else if(inbox[0]) fetchConversationThread(inbox[0].id); else alert('No messages in inbox'); }} className="p-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaReply /> Open Chat</button>
                </div>
              </div>
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">Staff Management</h2><button onClick={() => setShowStaffModal(true)} className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center gap-2"><FaPlus /> Add Staff</button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.map((member) => (
                  <div key={member.id} className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-4 cursor-pointer hover:shadow-lg transition" onClick={() => viewStaffDetails(member)}>
                    <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm">{getDepartmentIcon(member.department)}</div><div><h3 className="font-bold text-gray-800 text-sm">{member.full_name}</h3><p className="text-xs text-teal-600">{member.department}</p></div></div>
                    <div className="mt-2 text-xs text-gray-500 truncate">{member.email}</div>
                    <div className="mt-2 flex justify-between text-xs"><span>{member.gender}, {member.age} yrs</span><span className={`px-2 py-0.5 rounded-full text-xs ${member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{member.status}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">Inbox</h2><button onClick={() => { setShowReportModal(true); fetchRecipients(); }} className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center gap-2"><FaPlus /> New Report</button></div>
              <div className="space-y-4">
                {inbox.map((report) => (
                  <div key={report.id} className={`border rounded-xl p-5 cursor-pointer hover:shadow-md transition ${!report.is_opened ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex justify-between items-start"><div className="flex items-center gap-3">{!report.is_opened ? <FaEnvelope className="text-teal-500" /> : <FaEnvelopeOpen className="text-gray-400" />}<h3 className="font-semibold text-gray-800">{report.title}</h3></div><span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${getPriorityBadge(report.priority)}`}>{getPriorityIcon(report.priority)} {report.priority}</span></div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.body}</p>
                    <div className="flex justify-between items-center mt-3"><div className="flex items-center gap-2"><div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-xs text-teal-700">{report.sender_full_name?.charAt(0) || 'D'}</div><p className="text-xs text-gray-600">{report.sender_full_name}</p></div><p className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleString()}</p></div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); fetchConversationThread(report.id); }} className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs hover:bg-teal-600 flex items-center gap-1"><FaComment /> Open Chat</button>
                      {report.sender_type === 'staff' && <button onClick={(e) => { e.stopPropagation(); fetchConversationThread(report.id); }} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs hover:bg-emerald-600 flex items-center gap-1"><FaReply /> Reply</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outbox Tab */}
          {activeTab === 'outbox' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Sent Reports</h2>
              <div className="space-y-4">
                {outbox.map((report) => (
                  <div key={report.id} className="border rounded-xl p-5 cursor-pointer hover:shadow-md transition bg-white">
                    <div className="flex justify-between items-start"><div className="flex items-center gap-3"><FaPaperPlane className="text-gray-400" /><h3 className="font-semibold text-gray-800">{report.is_reply ? `Reply to: ${report.title}` : report.title}</h3></div><span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${getPriorityBadge(report.priority)}`}>{getPriorityIcon(report.priority)} {report.priority}</span></div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.body}</p>
                    <div className="flex justify-between items-center mt-3"><p className="text-xs text-gray-600">To: {report.display_recipient}</p><p className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleString()}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-8 py-10">
                <div className="flex items-center gap-6"><div className="relative"><div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl"><FaUserCircle className="text-teal-600 text-6xl" /></div></div><div className="text-white"><h2 className="text-2xl font-bold">{profileData.first_name} {profileData.last_name}</h2><p className="text-teal-100 flex items-center gap-2"><FaHospital /> {profileData.hospital_name}<span className="bg-white/20 px-2 py-0.5 rounded-full text-xs ml-2">{profileData.service_type}</span></p></div></div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-gray-800">Administrator Information</h3>{!isEditingProfile ? <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-sm font-medium"><FaEdit /> Edit Profile</button> : <div className="flex gap-2"><button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 border rounded-xl">Cancel</button><button onClick={updateProfile} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl"><FaSave /> Save</button></div>}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-5"><h4 className="font-semibold text-teal-600 mb-4"><FaUserCircle className="inline mr-2" /> Personal Info</h4><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-500">First Name</label>{isEditingProfile ? <input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="font-medium">{profileData.first_name || 'Not set'}</p>}</div><div><label className="text-xs text-gray-500">Last Name</label>{isEditingProfile ? <input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="font-medium">{profileData.last_name || 'Not set'}</p>}</div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-500">Gender</label>{isEditingProfile ? <select value={profileData.gender} onChange={(e) => setProfileData({...profileData, gender: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option>Male</option><option>Female</option><option>Other</option></select> : <p>{profileData.gender || 'Not set'}</p>}</div><div><label className="text-xs text-gray-500">Age</label>{isEditingProfile ? <input type="number" value={profileData.age} onChange={(e) => setProfileData({...profileData, age: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p>{profileData.age || 'Not set'} years</p>}</div></div><div><label className="text-xs text-gray-500">Phone</label>{isEditingProfile ? <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p>{profileData.phone || 'Not set'}</p>}</div></div></div>
                  <div className="bg-gray-50 rounded-xl p-5"><h4 className="font-semibold text-teal-600 mb-4"><FaHospital className="inline mr-2" /> Hospital Info</h4><div className="space-y-3"><div><label className="text-xs text-gray-500">Hospital Name</label>{isEditingProfile ? <input type="text" value={profileData.hospital_name} onChange={(e) => setProfileData({...profileData, hospital_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="font-medium">{profileData.hospital_name || 'Not set'}</p>}</div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-500">Service Type</label>{isEditingProfile ? <select value={profileData.service_type} onChange={(e) => setProfileData({...profileData, service_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option>Private</option><option>Public</option></select> : <p>{profileData.service_type || 'Not set'}</p>}</div><div><label className="text-xs text-gray-500">Hospital Type</label>{isEditingProfile ? <select value={profileData.hospital_type} onChange={(e) => setProfileData({...profileData, hospital_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option>General</option><option>Specialized</option><option>Primary</option></select> : <p>{profileData.hospital_type || 'Not set'}</p>}</div></div><div><label className="text-xs text-gray-500">Kebele</label><p>{profileData.kebele_name || 'Not set'}</p></div></div></div>
                  <div className="bg-gray-50 rounded-xl p-5"><h4 className="font-semibold text-teal-600 mb-4"><FaKey className="inline mr-2" /> Account Settings</h4><button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-600 rounded-xl hover:bg-teal-50 text-sm font-medium"><FaKey /> Change Password</button></div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Add Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">Add Hospital Staff</h2><button onClick={() => setShowStaffModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="First Name" value={staffFormData.first_name} onChange={(e) => setStaffFormData({...staffFormData, first_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-teal-500" required />
                <input type="text" placeholder="Middle Name" value={staffFormData.middle_name} onChange={(e) => setStaffFormData({...staffFormData, middle_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" />
                <input type="text" placeholder="Last Name" value={staffFormData.last_name} onChange={(e) => setStaffFormData({...staffFormData, last_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required />
                <select value={staffFormData.gender} onChange={(e) => setStaffFormData({...staffFormData, gender: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm"><option>Male</option><option>Female</option><option>Other</option></select>
                <input type="number" placeholder="Age" value={staffFormData.age} onChange={(e) => setStaffFormData({...staffFormData, age: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required />
                <input type="email" placeholder="Email" value={staffFormData.email} onChange={(e) => setStaffFormData({...staffFormData, email: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required />
                <input type="tel" placeholder="Phone" value={staffFormData.phone} onChange={(e) => setStaffFormData({...staffFormData, phone: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" />
                <select value={staffFormData.department} onChange={(e) => setStaffFormData({...staffFormData, department: e.target.value, ward: ''})} className="w-full px-4 py-3 border rounded-xl text-sm">{departments.map(dept => <option key={dept} value={dept}>{dept === 'Card_Office' ? 'Card Office' : dept}</option>)}</select>
                {needsWardSelection && (<select value={staffFormData.ward} onChange={(e) => setStaffFormData({...staffFormData, ward: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required><option value="">Select Ward (Required)</option>{wards.map(ward => <option key={ward} value={ward}>{ward}</option>)}</select>)}
                <input type="password" placeholder="Password" value={staffFormData.password} onChange={(e) => setStaffFormData({...staffFormData, password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required minLength="6" />
              </div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowStaffModal(false)} className="px-5 py-2.5 border rounded-xl hover:bg-gray-50">Cancel</button><button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg font-medium">Create Staff</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Send Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800"><FaPaperPlane className="inline mr-2 text-teal-500" /> Send New Report</h2><button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <form onSubmit={handleSendReport} className="space-y-4">
              <div><label className="block text-sm font-medium mb-2">Recipient Type</label><div className="flex gap-4">{kebeleAdmin && (<label className="flex items-center gap-2"><input type="radio" value="kebele" checked={reportFormData.recipient_type === 'kebele'} onChange={(e) => setReportFormData({...reportFormData, recipient_type: e.target.value, recipient_id: kebeleAdmin.id})} /><span>Kebele Admin ({kebeleAdmin?.kebele_name})</span></label>)}<label className="flex items-center gap-2"><input type="radio" value="staff" checked={reportFormData.recipient_type === 'staff'} onChange={(e) => setReportFormData({...reportFormData, recipient_type: e.target.value, recipient_id: ''})} /><span>Hospital Staff</span></label></div></div>
              {reportFormData.recipient_type === 'staff' && (<select value={reportFormData.recipient_id} onChange={(e) => setReportFormData({...reportFormData, recipient_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required><option value="">Select Staff Member</option>{recipients.map(s => <option key={s.id} value={s.id}>{s.full_name} - {s.department}</option>)}</select>)}
              <select value={reportFormData.priority} onChange={(e) => setReportFormData({...reportFormData, priority: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm"><option value="low">🟢 Low</option><option value="medium">🟡 Medium</option><option value="high">🟠 High</option><option value="urgent">🔴 Urgent</option></select>
              <input type="text" placeholder="Title" value={reportFormData.title} onChange={(e) => setReportFormData({...reportFormData, title: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required />
              <textarea placeholder="Message" value={reportFormData.body} onChange={(e) => setReportFormData({...reportFormData, body: e.target.value})} rows="5" className="w-full px-4 py-3 border rounded-xl text-sm resize-none" required />
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowReportModal(false)} className="px-5 py-2.5 border rounded-xl hover:bg-gray-50">Cancel</button><button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg font-medium">Send Report</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {showStaffDetailModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Staff Details</h2><button onClick={() => { setShowStaffDetailModal(false); setSelectedStaff(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <div className="flex items-center gap-4 mb-6"><div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center text-2xl">{getDepartmentIcon(selectedStaff.department)}</div><div><h3 className="text-lg font-bold text-gray-800">{selectedStaff.full_name}</h3><p className="text-teal-600 text-sm">{selectedStaff.department}</p>{selectedStaff.ward && <p className="text-xs text-gray-500">Ward: {selectedStaff.ward}</p>}</div></div>
            <div className="bg-gray-50 rounded-xl p-4"><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500 text-xs">First Name</p><p className="font-medium">{selectedStaff.first_name}</p></div><div><p className="text-gray-500 text-xs">Last Name</p><p className="font-medium">{selectedStaff.last_name}</p></div><div><p className="text-gray-500 text-xs">Gender</p><p className="font-medium">{selectedStaff.gender}</p></div><div><p className="text-gray-500 text-xs">Age</p><p className="font-medium">{selectedStaff.age} years</p></div></div></div>
            <div className="mt-4"><h4 className="font-semibold text-sm mb-2">Contact</h4><div className="flex items-center gap-2 text-sm text-gray-600"><FaEnvelopeIcon className="text-gray-400 text-xs" /> {selectedStaff.email}</div>{selectedStaff.phone && <div className="flex items-center gap-2 mt-2 text-sm text-gray-600"><FaPhone className="text-gray-400 text-xs" /> {selectedStaff.phone}</div>}</div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Change Password</h2><button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <div className="space-y-4"><input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" /><input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" /><input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" /><div className="flex justify-end gap-3 pt-4"><button onClick={() => setShowPasswordModal(false)} className="px-5 py-2.5 border rounded-xl hover:bg-gray-50">Cancel</button><button onClick={changePassword} className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg font-medium">Change Password</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;