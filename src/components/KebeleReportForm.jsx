import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  FaHome, FaTree, FaBell, FaUserCircle, FaSignOutAlt,
  FaInbox, FaPaperPlane, FaHospital, FaChartBar,
  FaPlus, FaChevronLeft, FaChevronRight, FaEnvelope, FaEnvelopeOpen,
  FaTimes, FaSpinner, FaUserMd, FaPhone, FaEnvelope as FaEnvelopeIcon,
  FaHeartbeat, FaEdit, FaSave, FaKey, FaReply, FaEye,
  FaSearch, FaArrowLeft, FaComment, FaClock, FaExclamationTriangle,
  FaBuilding, FaCalendarAlt, FaChevronDown, FaChevronUp, 
  FaUserNurse, FaFlask, FaXRay, FaBaby, FaPills, FaUserTie,
  FaBed, FaCreditCard, FaVenusMars, FaMars, FaVenus, FaUsers, FaClipboardList,
  FaSync, FaPaperclip, FaFile, FaFileImage, FaFilePdf, FaFileAlt, FaDownload, FaTrash,
  FaUniversity, FaLandmark
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const KebeleDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [woredas, setWoredas] = useState([]);
  const [allHospitalReports, setAllHospitalReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [showHospitalDetailModal, setShowHospitalDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [expandedHospital, setExpandedHospital] = useState(null);
  const [activeStaffDept, setActiveStaffDept] = useState('all');
  const [hospitalStaffDetails, setHospitalStaffDetails] = useState({});
  const [loadingStaff, setLoadingStaff] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [socketConnectionStatus, setSocketConnectionStatus] = useState('connecting');
  const [realTimeNotification, setRealTimeNotification] = useState(null);
  const socketRef = useRef(null);
  
  // Chat-like conversation states
  const [showConversationView, setShowConversationView] = useState(false);
  const [conversationThread, setConversationThread] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationReplyText, setConversationReplyText] = useState('');
  const [conversationAttachments, setConversationAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef(null);
  const replyFileInputRef = useRef(null);
  
  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '', middle_name: '', last_name: '', gender: '', age: '', phone: '',
    email: '', kebele_name: '', woreda_name: '', address: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  
  // Hospital form data
  const [hospitalFormData, setHospitalFormData] = useState({
    hospital_name: '', first_name: '', middle_name: '', last_name: '', gender: 'Male', 
    age: '', email: '', password: '', phone: ''
  });
  
  // Report form data with attachments
  const [reportFormData, setReportFormData] = useState({
    title: '', body: '', priority: 'medium', recipient_type: '', recipient_id: '', attachments: []
  });
  const [recipients, setRecipients] = useState({ hospitals: [], woredas: [] });

  const navigate = useNavigate();
  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';

  // Get file icon based on mime type
  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return <FaFileImage className="text-blue-500 text-xl" />;
    if (mimeType === 'application/pdf') return <FaFilePdf className="text-red-500 text-xl" />;
    return <FaFileAlt className="text-gray-500 text-xl" />;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get department icon
  const getDepartmentIcon = (department) => {
    const icons = {
      Doctor: <FaUserMd className="text-teal-500 text-lg" />,
      Nurse: <FaUserNurse className="text-emerald-500 text-lg" />,
      Midwife: <FaBaby className="text-pink-500 text-lg" />,
      Pharma: <FaPills className="text-purple-500 text-lg" />,
      Lab: <FaFlask className="text-yellow-500 text-lg" />,
      Radio: <FaXRay className="text-indigo-500 text-lg" />,
      Triage: <FaHeartbeat className="text-orange-500 text-lg" />,
      Card_Office: <FaCreditCard className="text-red-500 text-lg" />,
      Bed_Management: <FaBed className="text-cyan-500 text-lg" />,
      Human_Resource: <FaUserTie className="text-gray-500 text-lg" />
    };
    return icons[department] || <FaUserCircle className="text-gray-400 text-lg" />;
  };

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
    });

    socketRef.current.on('connect_error', () => setSocketConnectionStatus('disconnected'));
    socketRef.current.on('disconnect', () => setSocketConnectionStatus('disconnected'));

    socketRef.current.on('new_report_from_hospital', (data) => {
      setRealTimeNotification({ id: Date.now(), type: 'report', title: 'New Report', message: `${data.sender_name} sent: "${data.title}"`, priority: data.priority, timestamp: new Date() });
      setTimeout(() => setRealTimeNotification(null), 6000);
      fetchDashboardData();
      fetchAllHospitalReports();
    });

    socketRef.current.on('report_reply_from_hospital', (data) => {
      setRealTimeNotification({ id: Date.now(), type: 'reply', title: 'New Reply', message: `${data.sender_name} replied to: "${data.title}"`, priority: data.priority, timestamp: new Date() });
      setTimeout(() => setRealTimeNotification(null), 6000);
      if (currentConversationId) fetchConversationThread(currentConversationId);
      fetchDashboardData();
    });

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  // ==================== DATA FETCHING ====================
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [statsRes, inboxRes, outboxRes, hospitalsRes, notifRes] = await Promise.all([
        axios.get(`${API_URL}/api/kebele/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/kebele/reports/inbox?page=${currentPage}&search=${searchTerm}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/kebele/reports/outbox?page=${currentPage}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/kebele/hospitals`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/kebele/notifications?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (inboxRes.data.success) { 
        setInbox(inboxRes.data.reports || []); 
        setTotalPages(inboxRes.data.totalPages || 1);
        setUnreadCount(inboxRes.data.unreadCount || 0);
        setUrgentCount(inboxRes.data.urgentUnreadCount || 0);
      }
      if (outboxRes.data.success) setOutbox(outboxRes.data.reports || []);
      if (hospitalsRes.data.success) setHospitals(hospitalsRes.data.hospitals || []);
      if (notifRes.data.success) setNotifications(notifRes.data.notifications || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      if (error.response?.status === 401) { localStorage.removeItem('token'); navigate('/login'); }
    } finally { setLoading(false); }
  };

  const fetchAllHospitalReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/kebele/reports/inbox?limit=200`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const reports = res.data.reports || [];
        setAllHospitalReports(reports);
      }
    } catch (error) {
      console.error('Error fetching hospital reports:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/kebele/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        const kebele = res.data.kebele;
        setProfileData({
          first_name: kebele.first_name || '', middle_name: kebele.middle_name || '', last_name: kebele.last_name || '',
          gender: kebele.gender || '', age: kebele.age || '', phone: kebele.phone || '', email: kebele.email || '',
          kebele_name: kebele.kebele_name || '', woreda_name: kebele.woreda_name || '', address: kebele.address || ''
        });
      }
    } catch (error) { console.error('Error fetching profile:', error); }
  };

  // Fetch recipients (Hospitals AND Woredas)
  const fetchRecipients = async () => {
    try {
      const token = localStorage.getItem('token');
      const [hospitalsRes, woredasRes] = await Promise.all([
        axios.get(`${API_URL}/api/kebele/hospitals/all`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/kebele/woredas/all`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { success: true, woredas: [] } }))
      ]);
      setRecipients({ 
        hospitals: hospitalsRes.data.hospitals || [],
        woredas: woredasRes.data.woredas || []
      });
    } catch (error) { 
      console.error('Error fetching recipients:', error);
      setRecipients({ hospitals: [], woredas: [] });
    }
  };

  // ==================== FETCH HOSPITAL STAFF - CORRECTED ====================
  const fetchHospitalStaffDetails = async (hospitalId) => {
    // If already loaded and expanded, just collapse
    if (hospitalStaffDetails[hospitalId]) {
      setExpandedHospital(expandedHospital === hospitalId ? null : hospitalId);
      setActiveStaffDept('all');
      return;
    }
    
    setLoadingStaff(prev => ({ ...prev, [hospitalId]: true }));
    try {
      const token = localStorage.getItem('token');
      // CORRECTED API ENDPOINT - Using kebele route
      const staffRes = await axios.get(`${API_URL}/api/kebele/hospitals/${hospitalId}/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const staffList = staffRes.data.staff || [];
      
      // Organize staff by department
      const staffByDepartment = {
        Doctor: [],
        Nurse: [],
        Midwife: [],
        Pharma: [],
        Lab: [],
        Radio: [],
        Triage: [],
        Card_Office: [],
        Bed_Management: [],
        Human_Resource: []
      };
      
      staffList.forEach(staff => {
        const dept = staff.department;
        if (staffByDepartment[dept]) {
          staffByDepartment[dept].push(staff);
        } else if (dept) {
          staffByDepartment[dept] = [staff];
        }
      });
      
      setHospitalStaffDetails(prev => ({
        ...prev,
        [hospitalId]: {
          allStaff: staffList,
          staffByDepartment,
          totalStaff: staffList.length
        }
      }));
      setExpandedHospital(hospitalId);
      setActiveStaffDept('all');
    } catch (error) {
      console.error('Error fetching staff details:', error);
      // Show empty state with message
      setHospitalStaffDetails(prev => ({
        ...prev,
        [hospitalId]: {
          allStaff: [],
          staffByDepartment: {},
          totalStaff: 0,
          error: error.response?.data?.message || 'No staff members found'
        }
      }));
      setExpandedHospital(hospitalId);
    } finally {
      setLoadingStaff(prev => ({ ...prev, [hospitalId]: false }));
    }
  };

  // ==================== ATTACHMENT HANDLING ====================
  const handleAttachmentSelect = async (e, isReply = false) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (isReply) {
      setUploadingAttachment(true);
      const uploadedFiles = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const token = localStorage.getItem('token');
          const res = await axios.post(`${API_URL}/api/upload`, formData, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
          });
          if (res.data.success) {
            uploadedFiles.push({
              filename: res.data.file.filename,
              originalName: file.name,
              mimeType: file.type,
              size: file.size,
              path: res.data.file.path
            });
          }
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }
      setConversationAttachments(prev => [...prev, ...uploadedFiles]);
      setUploadingAttachment(false);
    } else {
      const uploadedFiles = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const token = localStorage.getItem('token');
          const res = await axios.post(`${API_URL}/api/upload`, formData, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
          });
          if (res.data.success) {
            uploadedFiles.push({
              filename: res.data.file.filename,
              originalName: file.name,
              mimeType: file.type,
              size: file.size,
              path: res.data.file.path
            });
          }
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }
      setReportFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedFiles]
      }));
    }
  };

  const removeAttachment = (index, isReply = false) => {
    if (isReply) {
      setConversationAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setReportFormData(prev => ({
        ...prev,
        attachments: prev.attachments.filter((_, i) => i !== index)
      }));
    }
  };

  const downloadAttachment = async (attachment) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/download/${attachment.filename}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  // ==================== CONVERSATION THREAD ====================
  const fetchConversationThread = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/kebele/reports/thread/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setConversationThread(res.data.thread);
        setCurrentConversationId(reportId);
        setShowConversationView(true);
        setShowReportDetailModal(false);
        setConversationAttachments([]);
        setConversationReplyText('');
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
      alert('Could not load conversation');
    }
  };

  const sendConversationReply = async () => {
    if (!conversationReplyText.trim() && conversationAttachments.length === 0) {
      alert('Please enter a reply message or attach a file');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('body', conversationReplyText);
      
      conversationAttachments.forEach(attachment => {
        formData.append('attachments', JSON.stringify(attachment));
      });
      
      const res = await axios.post(`${API_URL}/api/kebele/reports/${currentConversationId}/reply`, 
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setConversationReplyText('');
        setConversationAttachments([]);
        await fetchConversationThread(currentConversationId);
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert(error.response?.data?.message || 'Error sending reply');
    }
  };

  // ==================== HOSPITAL MANAGEMENT ====================
  const handleCreateHospital = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/kebele/hospitals`, hospitalFormData, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setHospitalFormData({ hospital_name: '', first_name: '', middle_name: '', last_name: '', gender: 'Male', age: '', email: '', password: '', phone: '' });
        setShowHospitalModal(false);
        fetchDashboardData();
        alert('Hospital admin created successfully!');
      }
    } catch (error) { alert(error.response?.data?.message || 'Error creating hospital'); }
  };

  const viewHospitalDetails = (hospital) => {
    setSelectedHospital(hospital);
    setShowHospitalDetailModal(true);
  };

  // ==================== REPORT MANAGEMENT ====================
  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!reportFormData.recipient_id) {
      alert('Please select a recipient');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', reportFormData.title);
      formData.append('body', reportFormData.body);
      formData.append('priority', reportFormData.priority);
      formData.append('recipient_type', reportFormData.recipient_type);
      formData.append('recipient_id', reportFormData.recipient_id);
      
      reportFormData.attachments.forEach(attachment => {
        formData.append('attachments', JSON.stringify(attachment));
      });
      
      const res = await axios.post(`${API_URL}/api/kebele/reports/send`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setShowReportModal(false);
        setReportFormData({ title: '', body: '', priority: 'medium', recipient_type: '', recipient_id: '', attachments: [] });
        alert('Report sent successfully!');
        fetchDashboardData();
      }
    } catch (error) { 
      console.error('Send report error:', error);
      alert(error.response?.data?.message || 'Error sending report'); 
    }
  };

  // ==================== PROFILE MANAGEMENT ====================
  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/kebele/profile`, profileData, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) { setIsEditingProfile(false); alert('Profile updated successfully!'); fetchProfile(); }
    } catch (error) { alert(error.response?.data?.message || 'Error updating profile'); }
  };

  const changePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) { alert('Passwords do not match'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/kebele/change-password`, { current_password: passwordData.current_password, new_password: passwordData.new_password }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) { setShowPasswordModal(false); setPasswordData({ current_password: '', new_password: '', confirm_password: '' }); alert('Password changed successfully!'); }
    } catch (error) { alert(error.response?.data?.message || 'Error changing password'); }
  };

  // ==================== NOTIFICATIONS ====================
  const markNotificationAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/kebele/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchDashboardData();
    } catch (error) { console.error('Error marking notification:', error); }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/kebele/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchDashboardData();
    } catch (error) { console.error('Error marking all as read:', error); }
  };

  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/kebele/reports/${reportId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
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

  const viewReportDetails = (report) => { 
    setSelectedReport(report); 
    setShowReportDetailModal(true); 
    if (!report.is_opened) markReportAsRead(report.id); 
  };

  const getPriorityBadge = (priority) => {
    const colors = { low: 'bg-teal-100 text-teal-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-orange-100 text-orange-800', urgent: 'bg-red-100 text-red-800 animate-pulse' };
    return colors[priority] || colors.medium;
  };

  useEffect(() => { 
    fetchDashboardData(); 
    fetchProfile(); 
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (hospitals.length > 0 && activeTab === 'reports') {
      fetchAllHospitalReports();
    }
  }, [hospitals, activeTab]);

  const RealTimeNotification = () => {
    if (!realTimeNotification) return null;
    const priorityColors = { low: 'border-teal-500', medium: 'border-yellow-500', high: 'border-orange-500', urgent: 'border-red-500' };
    return (
      <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
        className={`fixed bottom-6 right-6 z-[10000] max-w-md bg-white rounded-2xl shadow-2xl border-l-4 ${priorityColors[realTimeNotification.priority]} overflow-hidden`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-green-100">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center"><FaSpinner className="animate-spin text-3xl text-green-600 mx-auto mb-3" /><p className="text-gray-600">Loading Dashboard...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex">
      <RealTimeNotification />

      {/* Sidebar */}
      <div className={`bg-gradient-to-b from-green-900 to-green-800 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} shadow-2xl`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center"><FaTree className="text-white text-sm" /></div>
                <span className="font-bold text-base">Kebele Admin</span>
              </div>
            )}
            {sidebarCollapsed && <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto"><FaTree className="text-white text-sm" /></div>}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-green-700 rounded-lg">{sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}</button>
          </div>
          <nav className="space-y-1">
            <button onClick={() => { setActiveTab('dashboard'); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg' : 'hover:bg-green-700'}`}>
              <FaHome className="text-lg" /> {!sidebarCollapsed && <span>Dashboard</span>}
            </button>
            <button onClick={() => { setActiveTab('hospitals'); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'hospitals' ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg' : 'hover:bg-green-700'}`}>
              <FaHospital className="text-lg" /> {!sidebarCollapsed && <span>Hospitals</span>}
            </button>
            <button onClick={() => { setActiveTab('reports'); setShowConversationView(false); fetchAllHospitalReports(); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'reports' ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg' : 'hover:bg-green-700'}`}>
              <FaChartBar className="text-lg" /> {!sidebarCollapsed && <span>Reports</span>}
            </button>
            <button onClick={() => { setActiveTab('inbox'); fetchDashboardData(); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition relative ${activeTab === 'inbox' ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg' : 'hover:bg-green-700'}`}>
              <FaInbox className="text-lg" /> {!sidebarCollapsed && <span>Inbox</span>}
              {unreadCount > 0 && <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{unreadCount}</span>}
            </button>
            <button onClick={() => { setActiveTab('outbox'); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'outbox' ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg' : 'hover:bg-green-700'}`}>
              <FaPaperPlane className="text-lg" /> {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>
            <button onClick={() => { setActiveTab('profile'); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'profile' ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg' : 'hover:bg-green-700'}`}>
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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {showConversationView ? 'Conversation Thread' : (
                    activeTab === 'dashboard' ? 'Kebele Dashboard' :
                    activeTab === 'hospitals' ? 'Hospitals Management' :
                    activeTab === 'reports' ? 'Hospital Reports' :
                    activeTab === 'inbox' ? 'Inbox' :
                    activeTab === 'outbox' ? 'Sent Reports' :
                    activeTab === 'profile' ? 'My Profile' : 'Kebele Dashboard'
                  )}
                </h1>
                <p className="text-xs text-gray-500">Welcome back, {profileData.first_name || user?.full_name || 'Admin'} | {profileData.kebele_name} Kebele</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${socketConnectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                  <span className="text-xs text-gray-600">{socketConnectionStatus === 'connected' ? 'Live' : 'Offline'}</span>
                </div>
                <button onClick={() => setShowNotificationPanel(!showNotificationPanel)} className="relative p-2 hover:bg-gray-100 rounded-full">
                  <FaBell className="text-lg text-gray-600" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse">{unreadCount}</span>}
                  {urgentCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-ping">{urgentCount}</span>}
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
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <button onClick={markAllAsRead} className="text-xs text-green-600 hover:text-green-800">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notif.is_read ? 'bg-green-50' : ''} ${notif.priority === 'urgent' ? 'border-l-4 border-red-500' : ''}`} onClick={() => markNotificationAsRead(notif.id)}>
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
          {/* Conversation Thread View with Attachments */}
          {showConversationView && (
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex justify-between items-center">
                <button onClick={() => { setShowConversationView(false); setConversationThread([]); setCurrentConversationId(null); }} className="text-white hover:text-green-200 flex items-center gap-2">
                  <FaArrowLeft /> Back
                </button>
                <h2 className="text-white font-semibold">Conversation</h2>
                <div className="w-20"></div>
              </div>
              <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50">
                {conversationThread.length === 0 && (
                  <div className="text-center py-12 text-gray-400">No messages yet</div>
                )}
                {conversationThread.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'kebele' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${msg.sender_type === 'kebele' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-white border'} rounded-2xl p-4 shadow-sm`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium">{msg.sender_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${msg.priority === 'urgent' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {msg.priority}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      
                      {/* Display attachments in message */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium mb-2">Attachments:</p>
                          <div className="space-y-1">
                            {msg.attachments.map((att, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                {getFileIcon(att.mimeType)}
                                <span className="text-xs flex-1 truncate">{att.originalName}</span>
                                <span className="text-xs text-gray-400">{formatFileSize(att.size)}</span>
                                <button onClick={() => downloadAttachment(att)} className="text-blue-500 hover:text-blue-700">
                                  <FaDownload className="text-sm" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs mt-2 opacity-70">{new Date(msg.sent_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white border-t">
                {/* Attachments Preview */}
                {conversationAttachments.length > 0 && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium">Attachments ({conversationAttachments.length})</span>
                      <button onClick={() => setConversationAttachments([])} className="text-xs text-red-500">Clear all</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {conversationAttachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm">
                          {getFileIcon(att.mimeType)}
                          <span className="text-xs truncate max-w-[150px]">{att.originalName}</span>
                          <button onClick={() => removeAttachment(idx, true)} className="text-red-400 hover:text-red-600">
                            <FaTimes className="text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <textarea
                    value={conversationReplyText}
                    onChange={(e) => setConversationReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 resize-none"
                    rows="2"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => replyFileInputRef.current?.click()}
                      className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200"
                      title="Attach file"
                    >
                      <FaPaperclip />
                    </button>
                    <button
                      onClick={sendConversationReply}
                      disabled={uploadingAttachment}
                      className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50"
                    >
                      {uploadingAttachment ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                    </button>
                  </div>
                </div>
                <input
                  type="file"
                  ref={replyFileInputRef}
                  onChange={(e) => handleAttachmentSelect(e, true)}
                  className="hidden"
                  multiple
                />
                {uploadingAttachment && (
                  <p className="text-xs text-gray-500 mt-2 text-center">Uploading attachments...</p>
                )}
              </div>
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && !showConversationView && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                <div className="bg-white rounded-2xl p-5 shadow-md">
                  <div className="flex justify-between">
                    <div><p className="text-sm text-gray-500">Inbox</p><p className="text-3xl font-bold text-green-600">{stats?.inbox || 0}</p></div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><FaInbox className="text-xl text-green-600" /></div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-md">
                  <div className="flex justify-between">
                    <div><p className="text-sm text-gray-500">Outbox</p><p className="text-3xl font-bold text-emerald-600">{stats?.outbox || 0}</p></div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center"><FaPaperPlane className="text-xl text-emerald-600" /></div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-md">
                  <div className="flex justify-between">
                    <div><p className="text-sm text-gray-500">Hospitals</p><p className="text-3xl font-bold text-purple-600">{stats?.hospitals || 0}</p></div>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><FaHospital className="text-xl text-purple-600" /></div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-md">
                  <div className="flex justify-between">
                    <div><p className="text-sm text-gray-500">Reports</p><p className="text-3xl font-bold text-blue-600">{allHospitalReports.length}</p></div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><FaChartBar className="text-xl text-blue-600" /></div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-md">
                  <div className="flex justify-between">
                    <div><p className="text-sm text-gray-500">Unread</p><p className="text-3xl font-bold text-amber-600">{unreadCount}</p></div>
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center"><FaEnvelope className="text-xl text-amber-600" /></div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <button onClick={() => { setShowReportModal(true); fetchRecipients(); }} className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaPaperPlane /> New Report</button>
                  <button onClick={() => setShowHospitalModal(true)} className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaPlus /> Add Hospital</button>
                  <button onClick={() => setActiveTab('reports')} className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaChartBar /> View Reports</button>
                  <button onClick={() => setActiveTab('inbox')} className="p-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaInbox /> View Inbox</button>
                </div>
              </div>
            </div>
          )}

          {/* REPORTS TAB - All hospital reports */}
          {activeTab === 'reports' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">📋 All Hospital Reports</h2>
                <button onClick={() => fetchAllHospitalReports()} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium flex items-center gap-2"><FaSync /> Refresh</button>
              </div>
              
              {allHospitalReports.length > 0 ? (
                <div className="space-y-4">
                  {allHospitalReports.map((report) => (
                    <div key={report.id} className="border rounded-xl p-4 cursor-pointer hover:shadow-md transition bg-white" onClick={() => viewReportDetails(report)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">{report.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">From: {report.sender_full_name}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>
                          {report.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.body}</p>
                      {report.attachments && report.attachments.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                          <FaPaperclip /> {report.attachments.length} attachment(s)
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">{new Date(report.sent_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaChartBar className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No reports found from hospitals</p>
                </div>
              )}
            </div>
          )}

          {/* HOSPITALS TAB - Each hospital with their own staff */}
          {activeTab === 'hospitals' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">🏥 Hospitals Management</h2>
                <div className="flex gap-3">
                  <div className="relative">
                    <input type="text" placeholder="Search hospitals..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 w-64" />
                    <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />
                  </div>
                  <button onClick={() => setShowHospitalModal(true)} className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center gap-2"><FaPlus /> Add Hospital</button>
                </div>
              </div>
              
              <div className="space-y-4">
                {hospitals.length === 0 && (
                  <div className="text-center py-12">
                    <FaHospital className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hospitals found</p>
                    <button onClick={() => setShowHospitalModal(true)} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Add Your First Hospital
                    </button>
                  </div>
                )}
                
                {hospitals.map((hospital) => (
                  <div key={hospital.id} className="border rounded-xl overflow-hidden">
                    {/* Hospital Header - Click to expand and see staff details */}
                    <div 
                      className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 cursor-pointer hover:from-green-100 hover:to-emerald-100 transition flex justify-between items-center"
                      onClick={() => fetchHospitalStaffDetails(hospital.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md">
                          <FaHospital className="text-green-600 text-2xl" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{hospital.name}</h3>
                          <p className="text-sm text-gray-500">Admin: {hospital.admin_name}</p>
                          <p className="text-xs text-gray-500">{hospital.admin_email}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${hospital.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              {hospital.status}
                            </span>
                            <span className="text-xs text-gray-500">{hospital.hospital_type || 'General'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {hospitalStaffDetails[hospital.id] && (
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">{hospitalStaffDetails[hospital.id].totalStaff} Total Staff</p>
                          </div>
                        )}
                        {loadingStaff[hospital.id] ? (
                          <FaSpinner className="animate-spin text-green-600 text-xl" />
                        ) : (
                          expandedHospital === hospital.id ? <FaChevronUp className="text-gray-500 text-xl" /> : <FaChevronDown className="text-gray-500 text-xl" />
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Content - Full Staff Details per Hospital */}
                    {expandedHospital === hospital.id && hospitalStaffDetails[hospital.id] && (
                      <div className="p-5 bg-gray-50 border-t">
                        {/* Department Filter Tabs */}
                        <div className="flex flex-wrap gap-2 mb-4 pb-2 border-b">
                          <button 
                            onClick={() => setActiveStaffDept('all')}
                            className={`px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-1 ${activeStaffDept === 'all' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            <FaUsers className="text-sm" /> All ({hospitalStaffDetails[hospital.id].totalStaff})
                          </button>
                          {Object.entries(hospitalStaffDetails[hospital.id].staffByDepartment).map(([dept, staffList]) => (
                            staffList.length > 0 && (
                              <button 
                                key={dept}
                                onClick={() => setActiveStaffDept(dept)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-1 ${activeStaffDept === dept ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                              >
                                {getDepartmentIcon(dept)} {dept.replace(/_/g, ' ')} ({staffList.length})
                              </button>
                            )
                          ))}
                        </div>
                        
                        {/* Staff Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                          {hospitalStaffDetails[hospital.id]?.error && (
                            <div className="col-span-full text-center py-8">
                              <div className="text-yellow-500 text-4xl mb-3">⚠️</div>
                              <p className="text-gray-500">{hospitalStaffDetails[hospital.id].error}</p>
                            </div>
                          )}
                          
                          {!hospitalStaffDetails[hospital.id]?.error && hospitalStaffDetails[hospital.id]?.staffByDepartment[activeStaffDept]?.length === 0 && activeStaffDept !== 'all' && (
                            <div className="col-span-full text-center py-8 text-gray-400">
                              No staff found in this department
                            </div>
                          )}
                          
                          {!hospitalStaffDetails[hospital.id]?.error && activeStaffDept === 'all' && hospitalStaffDetails[hospital.id]?.allStaff.length === 0 && (
                            <div className="col-span-full text-center py-8">
                              <FaUsers className="text-5xl text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">No staff members found in this hospital</p>
                              <p className="text-xs text-gray-400 mt-2">Staff will appear here once the hospital admin adds them</p>
                            </div>
                          )}
                          
                          {(activeStaffDept === 'all' ? hospitalStaffDetails[hospital.id]?.allStaff : hospitalStaffDetails[hospital.id]?.staffByDepartment[activeStaffDept] || []).map((staff) => (
                            <div key={staff.id} className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center">
                                  {staff.gender === 'Male' ? <FaMars className="text-blue-500 text-xl" /> : staff.gender === 'Female' ? <FaVenus className="text-pink-500 text-xl" /> : <FaUserCircle className="text-gray-400 text-xl" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-800 truncate">
                                    {staff.first_name} {staff.middle_name || ''} {staff.last_name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                                      {staff.department?.replace(/_/g, ' ') || 'Staff'}
                                    </span>
                                    {staff.position && (
                                      <span className="text-xs text-gray-500">{staff.position}</span>
                                    )}
                                    {staff.ward && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                        Ward: {staff.ward}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                                    {staff.email && <p className="truncate">📧 {staff.email}</p>}
                                    {staff.phone && <p>📞 {staff.phone}</p>}
                                    {staff.specialization && <p className="truncate">🔬 {staff.specialization}</p>}
                                    {staff.qualifications?.length > 0 && (
                                      <p className="truncate">🎓 {staff.qualifications.slice(0, 2).join(', ')}</p>
                                    )}
                                    {staff.years_of_experience > 0 && (
                                      <p>⭐ {staff.years_of_experience} years exp.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* View Details Button */}
                        <div className="flex justify-end mt-4 pt-4 border-t">
                          <button 
                            onClick={(e) => { e.stopPropagation(); viewHospitalDetails(hospital); }}
                            className="px-4 py-2 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-md flex items-center gap-2"
                          >
                            <FaEye /> View Hospital Details
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Loading State */}
                    {expandedHospital === hospital.id && loadingStaff[hospital.id] && (
                      <div className="p-8 text-center bg-gray-50">
                        <FaSpinner className="animate-spin text-2xl text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Loading staff details...</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Inbox</h2>
                <button onClick={() => { setShowReportModal(true); fetchRecipients(); }} className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center gap-2"><FaPlus /> New Report</button>
              </div>
              <div className="space-y-4">
                {inbox.length === 0 && (
                  <div className="text-center py-12 text-gray-400">No messages in inbox</div>
                )}
                {inbox.map((report) => (
                  <div key={report.id} className={`border rounded-xl p-4 cursor-pointer hover:shadow-md transition ${!report.is_opened ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`} onClick={() => viewReportDetails(report)}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {!report.is_opened ? <FaEnvelope className="text-green-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
                        <h3 className="font-semibold text-gray-800">{report.title}</h3>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>{report.priority}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.body}</p>
                    {report.attachments && report.attachments.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <FaPaperclip /> {report.attachments.length} attachment(s)
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">From: {report.sender_full_name}</p>
                      <p className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleString()}</p>
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
                {outbox.length === 0 && (
                  <div className="text-center py-12 text-gray-400">No sent reports</div>
                )}
                {outbox.map((report) => (
                  <div key={report.id} className="border rounded-xl p-4 hover:shadow-md transition bg-white cursor-pointer" onClick={() => viewReportDetails(report)}>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-800">{report.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>{report.priority}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.body}</p>
                    {report.attachments && report.attachments.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <FaPaperclip /> {report.attachments.length} attachment(s)
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">To: {report.display_recipient}</p>
                      <p className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-10">
                <div className="flex items-center gap-6">
                  <div className="relative"><div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl"><FaUserCircle className="text-green-600 text-6xl" /></div></div>
                  <div className="text-white"><h2 className="text-2xl font-bold">{profileData.first_name} {profileData.last_name}</h2><p className="text-green-100">{profileData.kebele_name} Kebele</p></div>
                </div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-gray-800">Administrator Information</h3>{!isEditingProfile ? <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"><FaEdit /> Edit Profile</button> : <div className="flex gap-2"><button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 border rounded-xl">Cancel</button><button onClick={updateProfile} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl"><FaSave /> Save</button></div>}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-5"><h4 className="font-semibold text-green-600 mb-3">Personal Info</h4><div className="space-y-2"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-500">First Name</label>{isEditingProfile ? <input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="font-medium">{profileData.first_name || 'Not set'}</p>}</div><div><label className="text-xs text-gray-500">Last Name</label>{isEditingProfile ? <input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="font-medium">{profileData.last_name || 'Not set'}</p>}</div></div><div><label className="text-xs text-gray-500">Phone</label>{isEditingProfile ? <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p>{profileData.phone || 'Not set'}</p>}</div></div></div>
                  <div className="bg-gray-50 rounded-xl p-5"><h4 className="font-semibold text-green-600 mb-3">Account</h4><button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-xl hover:bg-green-50"><FaKey /> Change Password</button></div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Add Hospital Modal */}
      {showHospitalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">Add Hospital Admin</h2><button onClick={() => setShowHospitalModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <form onSubmit={handleCreateHospital} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><input type="text" placeholder="Hospital Name" value={hospitalFormData.hospital_name} onChange={(e) => setHospitalFormData({...hospitalFormData, hospital_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required /></div>
                <input type="text" placeholder="First Name" value={hospitalFormData.first_name} onChange={(e) => setHospitalFormData({...hospitalFormData, first_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required />
                <input type="text" placeholder="Middle Name" value={hospitalFormData.middle_name} onChange={(e) => setHospitalFormData({...hospitalFormData, middle_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" />
                <input type="text" placeholder="Last Name" value={hospitalFormData.last_name} onChange={(e) => setHospitalFormData({...hospitalFormData, last_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required />
                <select value={hospitalFormData.gender} onChange={(e) => setHospitalFormData({...hospitalFormData, gender: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm"><option>Male</option><option>Female</option><option>Other</option></select>
                <input type="number" placeholder="Age" value={hospitalFormData.age} onChange={(e) => setHospitalFormData({...hospitalFormData, age: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required />
                <input type="email" placeholder="Email" value={hospitalFormData.email} onChange={(e) => setHospitalFormData({...hospitalFormData, email: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required />
                <input type="tel" placeholder="Phone" value={hospitalFormData.phone} onChange={(e) => setHospitalFormData({...hospitalFormData, phone: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" />
                <input type="password" placeholder="Password" value={hospitalFormData.password} onChange={(e) => setHospitalFormData({...hospitalFormData, password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required minLength="6" />
              </div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowHospitalModal(false)} className="px-5 py-2.5 border rounded-xl">Cancel</button><button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl">Create Hospital</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Send Report Modal with Attachments and Recipients (Hospitals + Woredas) */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800"><FaPaperPlane className="inline mr-2 text-green-500" /> Send New Report</h2><button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <form onSubmit={handleSendReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" value="hospital" checked={reportFormData.recipient_type === 'hospital'} onChange={(e) => setReportFormData({...reportFormData, recipient_type: e.target.value, recipient_id: ''})} />
                    <FaHospital className="text-purple-500" /> Hospital Admin
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" value="woreda" checked={reportFormData.recipient_type === 'woreda'} onChange={(e) => setReportFormData({...reportFormData, recipient_type: e.target.value, recipient_id: ''})} />
                    <FaLandmark className="text-blue-500" /> Woreda Admin
                  </label>
                </div>
              </div>
              
              {reportFormData.recipient_type === 'hospital' && (
                <select value={reportFormData.recipient_id} onChange={(e) => setReportFormData({...reportFormData, recipient_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required>
                  <option value="">Select Hospital</option>
                  {recipients.hospitals.map(h => <option key={h.id} value={h.id}>{h.name} - {h.admin_name}</option>)}
                </select>
              )}
              
              {reportFormData.recipient_type === 'woreda' && (
                <select value={reportFormData.recipient_id} onChange={(e) => setReportFormData({...reportFormData, recipient_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required>
                  <option value="">Select Woreda</option>
                  {recipients.woredas.map(w => <option key={w.id} value={w.id}>{w.name} - {w.admin_name}</option>)}
                </select>
              )}
              
              <select value={reportFormData.priority} onChange={(e) => setReportFormData({...reportFormData, priority: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm">
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
              
              <input type="text" placeholder="Title" value={reportFormData.title} onChange={(e) => setReportFormData({...reportFormData, title: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required />
              
              <textarea placeholder="Message" value={reportFormData.body} onChange={(e) => setReportFormData({...reportFormData, body: e.target.value})} rows="5" className="w-full px-4 py-3 border rounded-xl text-sm resize-none" required />
              
              {/* Attachments Section */}
              <div className="border rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">Attachments</label>
                  <button
                    type="button"
                    onClick={() => document.getElementById('reportFileInput').click()}
                    className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1"
                  >
                    <FaPaperclip /> Add Files
                  </button>
                </div>
                <input
                  id="reportFileInput"
                  type="file"
                  multiple
                  onChange={(e) => handleAttachmentSelect(e, false)}
                  className="hidden"
                />
                {reportFormData.attachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {reportFormData.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getFileIcon(att.mimeType)}
                          <span className="text-sm truncate max-w-[200px]">{att.originalName}</span>
                          <span className="text-xs text-gray-400">{formatFileSize(att.size)}</span>
                        </div>
                        <button type="button" onClick={() => removeAttachment(idx, false)} className="text-red-400 hover:text-red-600">
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowReportModal(false)} className="px-5 py-2.5 border rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl">Send Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hospital Details Modal */}
      {showHospitalDetailModal && selectedHospital && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Hospital Details</h2><button onClick={() => { setShowHospitalDetailModal(false); setSelectedHospital(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <div className="flex items-center gap-4 mb-6"><div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-2xl"><FaHospital className="text-green-600 text-2xl" /></div><div><h3 className="text-lg font-bold text-gray-800">{selectedHospital.name}</h3><p className="text-green-600 text-sm">{selectedHospital.service_type || 'Public'} Hospital</p></div></div>
            <div className="bg-gray-50 rounded-xl p-4"><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500 text-xs">Admin Name</p><p className="font-medium">{selectedHospital.admin_name}</p></div><div><p className="text-gray-500 text-xs">Email</p><p className="font-medium">{selectedHospital.admin_email}</p></div><div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium">{selectedHospital.admin_phone || 'Not provided'}</p></div><div><p className="text-gray-500 text-xs">Status</p><p className={`font-medium ${selectedHospital.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>{selectedHospital.status}</p></div></div></div>
          </div>
        </div>
      )}

      {/* Report Details Modal with Attachments */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Report Details</h2><button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <div className="flex items-center justify-between mb-4"><span className={`px-3 py-1 rounded-full text-sm ${getPriorityBadge(selectedReport.priority)}`}>{selectedReport.priority.toUpperCase()}</span><span className="text-xs text-gray-500">{new Date(selectedReport.sent_at).toLocaleString()}</span></div>
            <h3 className="text-lg font-semibold mb-2">{selectedReport.title}</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4"><p className="text-sm text-gray-700 whitespace-pre-line">{selectedReport.body}</p></div>
            
            {/* Display Attachments */}
            {selectedReport.attachments && selectedReport.attachments.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Attachments ({selectedReport.attachments.length})</h4>
                <div className="space-y-2">
                  {selectedReport.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getFileIcon(att.mimeType)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{att.originalName}</p>
                          <p className="text-xs text-gray-400">{formatFileSize(att.size)}</p>
                        </div>
                      </div>
                      <button onClick={() => downloadAttachment(att)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 flex items-center gap-1">
                        <FaDownload /> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="border-t pt-4"><p className="text-sm text-gray-600"><span className="font-medium">From:</span> {selectedReport.sender_full_name}</p><p className="text-sm text-gray-600"><span className="font-medium">Status:</span> {selectedReport.status}</p></div>
            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button onClick={() => fetchConversationThread(selectedReport.id)} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl flex items-center justify-center gap-2"><FaComment /> Open Chat</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Change Password</h2><button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <div className="space-y-4"><input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" /><input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" /><input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" /><div className="flex justify-end gap-3 pt-4"><button onClick={() => setShowPasswordModal(false)} className="px-5 py-2.5 border rounded-xl">Cancel</button><button onClick={changePassword} className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl">Change Password</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KebeleDashboard;