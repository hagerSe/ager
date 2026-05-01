import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  FaHome, FaGlobe, FaBell, FaUserCircle, FaSignOutAlt,
  FaInbox, FaPaperPlane, FaHospital, FaChartBar,
  FaPlus, FaChevronLeft, FaChevronRight, FaEnvelope, FaEnvelopeOpen,
  FaTimes, FaSpinner, FaUserMd, FaPhone, FaEnvelope as FaEnvelopeIcon,
  FaHeartbeat, FaEdit, FaSave, FaKey, FaReply, FaEye,
  FaSearch, FaArrowLeft, FaComment, FaClock, FaExclamationTriangle,
  FaBuilding, FaCalendarAlt, FaChevronDown, FaChevronUp, 
  FaUserNurse, FaFlask, FaXRay, FaBaby, FaPills, FaUserTie,
  FaBed, FaCreditCard, FaVenusMars, FaMars, FaVenus, FaUsers, FaClipboardList,
  FaSync, FaPaperclip, FaFile, FaFileImage, FaFilePdf, FaFileAlt, FaDownload, FaTrash,
  FaUniversity, FaLandmark, FaCity, FaMapMarkerAlt, FaFilePowerpoint, FaFileExcel, FaFileWord
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const FederalDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [regions, setRegions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [showRegionDetailModal, setShowRegionDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [expandedRegion, setExpandedRegion] = useState(null);
  const [regionZones, setRegionZones] = useState({});
  const [loadingZones, setLoadingZones] = useState({});
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
    email: '', address: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  
  // Region form data
  const [regionFormData, setRegionFormData] = useState({
    region_name: '', first_name: '', middle_name: '', last_name: '', gender: 'Male', 
    age: '', email: '', password: '', phone: ''
  });
  
  // Report form data with attachments
  const [reportFormData, setReportFormData] = useState({
    title: '', body: '', priority: 'medium', recipient_type: 'regional', recipient_id: '', attachments: []
  });
  const [recipients, setRecipients] = useState({ regions: [] });

  const navigate = useNavigate();
  const API_URL = 'http://localhost:5001';
  const SOCKET_URL = 'http://localhost:5001';

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FaFileAlt className="text-gray-500 text-xl" />;
    if (mimeType.startsWith('image/')) return <FaFileImage className="text-blue-500 text-xl" />;
    if (mimeType === 'application/pdf') return <FaFilePdf className="text-red-500 text-xl" />;
    if (mimeType.includes('powerpoint')) return <FaFilePowerpoint className="text-orange-500 text-xl" />;
    if (mimeType.includes('excel')) return <FaFileExcel className="text-green-500 text-xl" />;
    if (mimeType.includes('word')) return <FaFileWord className="text-blue-500 text-xl" />;
    return <FaFileAlt className="text-gray-500 text-xl" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    socketRef.current.on('new_report_from_regional', (data) => {
      setRealTimeNotification({ id: Date.now(), type: 'report', title: 'New Report', message: `${data.sender_name} sent: "${data.title}"`, priority: data.priority, timestamp: new Date() });
      setTimeout(() => setRealTimeNotification(null), 6000);
      fetchDashboardData();
    });

    socketRef.current.on('report_reply_from_regional', (data) => {
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
      const [statsRes, inboxRes, outboxRes, regionsRes, notifRes] = await Promise.all([
        axios.get(`${API_URL}/api/federal/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/federal/reports/inbox?page=${currentPage}&search=${searchTerm}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/federal/reports/outbox?page=${currentPage}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/federal/regions`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/federal/notifications?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (inboxRes.data.success) { 
        setInbox(inboxRes.data.reports || []); 
        setTotalPages(inboxRes.data.totalPages || 1);
        setUnreadCount(inboxRes.data.unreadCount || 0);
        setUrgentCount(inboxRes.data.urgentUnreadCount || 0);
      }
      if (outboxRes.data.success) setOutbox(outboxRes.data.reports || []);
      if (regionsRes.data.success) setRegions(regionsRes.data.regions || []);
      if (notifRes.data.success) setNotifications(notifRes.data.notifications || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      if (error.response?.status === 401) { localStorage.removeItem('token'); navigate('/login'); }
    } finally { setLoading(false); }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/federal/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        const federal = res.data.federal;
        setProfileData({
          first_name: federal.first_name || '', middle_name: federal.middle_name || '', last_name: federal.last_name || '',
          gender: federal.gender || '', age: federal.age || '', phone: federal.phone || '', email: federal.email || '',
          address: federal.address || ''
        });
      }
    } catch (error) { console.error('Error fetching profile:', error); }
  };

  // Fetch recipients (Regions list for dropdown)
  const fetchRecipients = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔄 Fetching regions list...');
      
      const regionsRes = await axios.get(`${API_URL}/api/federal/regions-list`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      console.log('📡 Regions response:', regionsRes.data);
      
      const regionsData = regionsRes.data.regions || [];
      
      setRecipients({ 
        regions: regionsData
      });
      
      console.log('✅ Regions loaded:', regionsData.length);
      
    } catch (error) { 
      console.error('❌ Error fetching recipients:', error);
      setRecipients({ regions: [] });
    }
  };

  // Fetch zones under a specific region
  const fetchRegionZones = async (regionId) => {
    if (regionZones[regionId]) {
      setExpandedRegion(expandedRegion === regionId ? null : regionId);
      return;
    }
    
    setLoadingZones(prev => ({ ...prev, [regionId]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/federal/regions/${regionId}/zones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const zones = res.data.zones || [];
      
      setRegionZones(prev => ({
        ...prev,
        [regionId]: {
          zones: zones,
          totalZones: zones.length,
          regionName: res.data.region_name
        }
      }));
      setExpandedRegion(regionId);
    } catch (error) {
      console.error('Error fetching region zones:', error);
      setRegionZones(prev => ({
        ...prev,
        [regionId]: {
          zones: [],
          totalZones: 0,
          error: error.response?.data?.message || 'No zones found'
        }
      }));
      setExpandedRegion(regionId);
    } finally {
      setLoadingZones(prev => ({ ...prev, [regionId]: false }));
    }
  };

  // ==================== ATTACHMENT HANDLING ====================
  const handleAttachmentSelect = async (e, isReply = false) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
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
            url: res.data.file.url,
            key: res.data.file.key,
            location: res.data.file.location,
            file: file
          });
          console.log('✅ File uploaded, key:', res.data.file.key);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
    
    if (isReply) {
      setConversationAttachments(prev => [...prev, ...uploadedFiles]);
    } else {
      setReportFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedFiles]
      }));
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
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
      console.log('Downloading attachment:', attachment);
      
      if (attachment.url && attachment.url.startsWith('http')) {
        console.log('Using direct URL:', attachment.url);
        window.open(attachment.url, '_blank');
        return;
      }
      
      let fileKey = attachment.key || attachment.fileKey;
      
      if (!fileKey && attachment.url && attachment.url.includes('attachments/')) {
        const urlParts = attachment.url.split('/');
        const attIndex = urlParts.findIndex(part => part === 'attachments');
        if (attIndex !== -1) {
          fileKey = urlParts.slice(attIndex).join('/').split('?')[0];
        }
      }
      
      if (!fileKey && attachment.filename) {
        console.warn('No key found, using filename (may not work):', attachment.filename);
        fileKey = attachment.filename;
      }
      
      if (!fileKey) {
        alert('Cannot download: file information missing');
        return;
      }
      
      const token = localStorage.getItem('token');
      console.log('Downloading with key:', fileKey);
      
      const response = await axios.get(`${API_URL}/api/download/${encodeURIComponent(fileKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.originalName || attachment.filename || 'download');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file: ' + (error.response?.data?.message || error.message));
    }
  };

  // ==================== CONVERSATION THREAD ====================
  const fetchConversationThread = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/federal/reports/thread/${reportId}`, {
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
      formData.append('body', conversationReplyText || '');
      
      conversationAttachments.forEach(attachment => {
        if (attachment.file) {
          formData.append('attachments', attachment.file);
        }
      });
      
      const res = await axios.post(`${API_URL}/api/federal/reports/${currentConversationId}/reply`, 
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      if (res.data.success) {
        setConversationReplyText('');
        setConversationAttachments([]);
        await fetchConversationThread(currentConversationId);
        fetchDashboardData();
        alert('Reply sent successfully!');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert(error.response?.data?.message || 'Error sending reply');
    }
  };

  // ==================== REGION MANAGEMENT ====================
  const handleCreateRegion = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/federal/regions`, regionFormData, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setRegionFormData({ region_name: '', first_name: '', middle_name: '', last_name: '', gender: 'Male', age: '', email: '', password: '', phone: '' });
        setShowRegionModal(false);
        fetchDashboardData();
        alert('Regional admin created successfully!');
      }
    } catch (error) { alert(error.response?.data?.message || 'Error creating region'); }
  };

  const viewRegionDetails = (region) => {
    setSelectedRegion(region);
    setShowRegionDetailModal(true);
  };

  // ==================== REPORT MANAGEMENT ====================
  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!reportFormData.recipient_id) {
      alert('Please select a region');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', reportFormData.title);
      formData.append('body', reportFormData.body);
      formData.append('priority', reportFormData.priority);
      formData.append('recipient_type', 'regional');
      formData.append('recipient_id', reportFormData.recipient_id);
      
      console.log('📤 Sending report with:', {
        title: reportFormData.title,
        body: reportFormData.body,
        priority: reportFormData.priority,
        recipient_type: 'regional',
        recipient_id: reportFormData.recipient_id,
        attachments: reportFormData.attachments.length
      });
      
      reportFormData.attachments.forEach(attachment => {
        if (attachment.file) {
          formData.append('attachments', attachment.file);
        }
      });
      
      const res = await axios.post(`${API_URL}/api/federal/reports/send`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (res.data.success) {
        setShowReportModal(false);
        setReportFormData({ title: '', body: '', priority: 'medium', recipient_type: 'regional', recipient_id: '', attachments: [] });
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
      const res = await axios.put(`${API_URL}/api/federal/profile`, profileData, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) { setIsEditingProfile(false); alert('Profile updated successfully!'); fetchProfile(); }
    } catch (error) { alert(error.response?.data?.message || 'Error updating profile'); }
  };

  const changePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) { alert('Passwords do not match'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/federal/change-password`, { current_password: passwordData.current_password, new_password: passwordData.new_password }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) { setShowPasswordModal(false); setPasswordData({ current_password: '', new_password: '', confirm_password: '' }); alert('Password changed successfully!'); }
    } catch (error) { alert(error.response?.data?.message || 'Error changing password'); }
  };

  // ==================== NOTIFICATIONS ====================
  const markNotificationAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/federal/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchDashboardData();
    } catch (error) { console.error('Error marking notification:', error); }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/federal/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchDashboardData();
    } catch (error) { console.error('Error marking all as read:', error); }
  };

  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/federal/reports/${reportId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
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

  const RealTimeNotification = () => {
    if (!realTimeNotification) return null;
    const priorityColors = { low: 'border-teal-500', medium: 'border-yellow-500', high: 'border-orange-500', urgent: 'border-red-500' };
    return (
      <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
        className={`fixed bottom-6 right-6 z-[10000] max-w-md bg-white rounded-2xl shadow-2xl border-l-4 ${priorityColors[realTimeNotification.priority]} overflow-hidden`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0"><div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-red-100">{realTimeNotification.type === 'reply' ? '💬' : '📬'}</div></div>
            <div className="flex-1"><p className="text-sm font-bold text-gray-900">{realTimeNotification.title}</p><p className="text-sm text-gray-600">{realTimeNotification.message}</p><p className="text-xs text-gray-400 mt-1">{new Date(realTimeNotification.timestamp).toLocaleTimeString()}</p></div>
            <button onClick={() => setRealTimeNotification(null)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center"><FaSpinner className="animate-spin text-3xl text-red-600 mx-auto mb-3" /><p className="text-gray-600">Loading Dashboard...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex">
      <RealTimeNotification />

      {/* Sidebar */}
      <div className={`bg-gradient-to-b from-red-900 to-red-800 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} shadow-2xl`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (<div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center"><FaGlobe className="text-white text-sm" /></div><span className="font-bold text-base">Federal Admin</span></div>)}
            {sidebarCollapsed && <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center mx-auto"><FaGlobe className="text-white text-sm" /></div>}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-red-700 rounded-lg">{sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}</button>
          </div>
          <nav className="space-y-1">
            <button onClick={() => { setActiveTab('dashboard'); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-red-600 to-orange-600 shadow-lg' : 'hover:bg-red-700'}`}><FaHome className="text-lg" /> {!sidebarCollapsed && <span>Dashboard</span>}</button>
            <button onClick={() => { setActiveTab('regions'); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'regions' ? 'bg-gradient-to-r from-red-600 to-orange-600 shadow-lg' : 'hover:bg-red-700'}`}><FaCity className="text-lg" /> {!sidebarCollapsed && <span>Regions</span>}</button>
            <button onClick={() => { setActiveTab('inbox'); fetchDashboardData(); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition relative ${activeTab === 'inbox' ? 'bg-gradient-to-r from-red-600 to-orange-600 shadow-lg' : 'hover:bg-red-700'}`}><FaInbox className="text-lg" /> {!sidebarCollapsed && <span>Inbox</span>}{unreadCount > 0 && <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{unreadCount}</span>}</button>
            <button onClick={() => { setActiveTab('outbox'); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'outbox' ? 'bg-gradient-to-r from-red-600 to-orange-600 shadow-lg' : 'hover:bg-red-700'}`}><FaPaperPlane className="text-lg" /> {!sidebarCollapsed && <span>Sent Reports</span>}</button>
            <button onClick={() => { setActiveTab('profile'); setShowConversationView(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'profile' ? 'bg-gradient-to-r from-red-600 to-orange-600 shadow-lg' : 'hover:bg-red-700'}`}><FaUserCircle className="text-lg" /> {!sidebarCollapsed && <span>Profile</span>}</button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b border-gray-100">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div><h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">{showConversationView ? 'Conversation Thread' : (activeTab === 'dashboard' ? 'Federal Dashboard' : activeTab === 'regions' ? 'Regional Administration' : activeTab === 'inbox' ? 'Inbox' : activeTab === 'outbox' ? 'Sent Reports' : activeTab === 'profile' ? 'My Profile' : 'Federal Dashboard')}</h1><p className="text-xs text-gray-500">Welcome back, {profileData.first_name || user?.full_name || 'Admin'} | Federal Government</p></div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full"><div className={`w-2 h-2 rounded-full ${socketConnectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} /><span className="text-xs text-gray-600">{socketConnectionStatus === 'connected' ? 'Live' : 'Offline'}</span></div>
                <button onClick={() => setShowNotificationPanel(!showNotificationPanel)} className="relative p-2 hover:bg-gray-100 rounded-full"><FaBell className="text-lg text-gray-600" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse">{unreadCount}</span>}{urgentCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-ping">{urgentCount}</span>}</button>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:shadow-lg text-sm font-medium"><FaSignOutAlt /> Logout</button>
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {showNotificationPanel && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute right-6 top-20 w-80 bg-white rounded-xl shadow-2xl z-50 border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50 to-orange-50"><h3 className="font-semibold text-gray-800">Notifications</h3><button onClick={markAllAsRead} className="text-xs text-red-600 hover:text-red-800">Mark all read</button></div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? notifications.map((notif) => (<div key={notif.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notif.is_read ? 'bg-red-50' : ''} ${notif.priority === 'urgent' ? 'border-l-4 border-red-500' : ''}`} onClick={() => markNotificationAsRead(notif.id)}><p className="text-xs font-medium text-gray-800">{notif.title}</p><p className="text-xs text-gray-500">{notif.message}</p><p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p></div>)) : (<div className="p-8 text-center text-gray-500"><FaBell className="text-3xl mx-auto mb-2 text-gray-300" /><p className="text-xs">No notifications</p></div>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Conversation Thread View with Attachments */}
          {showConversationView && (
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 flex justify-between items-center">
                <button onClick={() => { setShowConversationView(false); setConversationThread([]); setCurrentConversationId(null); }} className="text-white hover:text-red-200 flex items-center gap-2"><FaArrowLeft /> Back</button>
                <h2 className="text-white font-semibold">Conversation</h2><div className="w-20"></div>
              </div>
              <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50">
                {conversationThread.length === 0 && <div className="text-center py-12 text-gray-400">No messages yet</div>}
                {conversationThread.map((msg) => (<div key={msg.id} className={`flex ${msg.sender_type === 'federal' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[70%] ${msg.sender_type === 'federal' ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white' : 'bg-white border'} rounded-2xl p-4 shadow-sm`}><div className="flex items-center gap-2 mb-2"><span className="text-xs font-medium">{msg.sender_name}</span><span className={`text-xs px-2 py-0.5 rounded-full ${msg.priority === 'urgent' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{msg.priority}</span></div><p className="text-sm whitespace-pre-wrap">{msg.body}</p>{msg.attachments && msg.attachments.length > 0 && (<div className="mt-3 pt-2 border-t border-gray-200"><p className="text-xs font-medium mb-2">Attachments ({msg.attachments.length}):</p><div className="space-y-1">{msg.attachments.map((att, idx) => (<div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">{getFileIcon(att.mimeType)}<span className="text-xs flex-1 truncate">{att.originalName || att.filename}</span><span className="text-xs text-gray-400">{formatFileSize(att.size)}</span><button onClick={() => downloadAttachment({url: att.url, key: att.key || att.filename, originalName: att.originalName || att.filename, filename: att.filename})} className="text-blue-500 hover:text-blue-700"><FaDownload className="text-sm" /></button></div>))}</div></div>)}<p className="text-xs mt-2 opacity-70">{new Date(msg.sent_at).toLocaleString()}</p></div></div>))}
              </div>
              <div className="p-4 bg-white border-t">
                {conversationAttachments.length > 0 && (<div className="mb-3 p-3 bg-gray-50 rounded-lg"><div className="flex justify-between items-center mb-2"><span className="text-xs font-medium">Attachments to send ({conversationAttachments.length})</span><button onClick={() => setConversationAttachments([])} className="text-xs text-red-500">Clear all</button></div><div className="flex flex-wrap gap-2">{conversationAttachments.map((att, idx) => (<div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm">{getFileIcon(att.mimeType)}<span className="text-xs truncate max-w-[150px]">{att.originalName}</span><button onClick={() => removeAttachment(idx, true)} className="text-red-400 hover:text-red-600"><FaTimes className="text-xs" /></button></div>))}</div></div>)}
                <div className="flex gap-3"><textarea value={conversationReplyText} onChange={(e) => setConversationReplyText(e.target.value)} placeholder="Type your reply..." className="flex-1 px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-red-500 resize-none" rows="2" /><div className="flex flex-col gap-2"><button type="button" onClick={() => replyFileInputRef.current?.click()} className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200"><FaPaperclip /></button><button onClick={sendConversationReply} disabled={uploadingAttachment} className="p-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50">{uploadingAttachment ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}</button></div></div>
                <input type="file" ref={replyFileInputRef} onChange={(e) => handleAttachmentSelect(e, true)} className="hidden" multiple />
                {uploadingAttachment && <p className="text-xs text-gray-500 mt-2 text-center">Uploading attachments...</p>}
              </div>
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && !showConversationView && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                <div className="bg-white rounded-2xl p-5 shadow-md"><div className="flex justify-between"><div><p className="text-sm text-gray-500">Inbox</p><p className="text-3xl font-bold text-red-600">{stats?.inbox || 0}</p></div><div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><FaInbox className="text-xl text-red-600" /></div></div></div>
                <div className="bg-white rounded-2xl p-5 shadow-md"><div className="flex justify-between"><div><p className="text-sm text-gray-500">Outbox</p><p className="text-3xl font-bold text-orange-600">{stats?.outbox || 0}</p></div><div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center"><FaPaperPlane className="text-xl text-orange-600" /></div></div></div>
                <div className="bg-white rounded-2xl p-5 shadow-md"><div className="flex justify-between"><div><p className="text-sm text-gray-500">Regions</p><p className="text-3xl font-bold text-purple-600">{regions.length}</p></div><div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><FaCity className="text-xl text-purple-600" /></div></div></div>
                <div className="bg-white rounded-2xl p-5 shadow-md"><div className="flex justify-between"><div><p className="text-sm text-gray-500">Unread</p><p className="text-3xl font-bold text-amber-600">{unreadCount}</p></div><div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center"><FaEnvelope className="text-xl text-amber-600" /></div></div></div>
                <div className="bg-white rounded-2xl p-5 shadow-md"><div className="flex justify-between"><div><p className="text-sm text-gray-500">Urgent</p><p className="text-3xl font-bold text-red-600">{urgentCount}</p></div><div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><FaExclamationTriangle className="text-xl text-red-600" /></div></div></div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-md"><h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2><div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button onClick={() => { setShowReportModal(true); fetchRecipients(); }} className="p-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaPaperPlane /> New Report</button>
                <button onClick={() => setShowRegionModal(true)} className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaPlus /> Add Region</button>
                <button onClick={() => setActiveTab('regions')} className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaCity /> View Regions</button>
                <button onClick={() => setActiveTab('inbox')} className="p-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"><FaInbox /> View Inbox</button>
              </div></div>
            </div>
          )}

          {/* REGIONS TAB */}
          {activeTab === 'regions' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">🏢 Regional Administration</h2><div className="flex gap-3"><div className="relative"><input type="text" placeholder="Search regions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-red-500 w-64" /><FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" /></div><button onClick={() => setShowRegionModal(true)} className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center gap-2"><FaPlus /> Add Region</button></div></div>
              <div className="space-y-4">
                {regions.length === 0 && (<div className="text-center py-12"><FaCity className="text-6xl text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No regions found</p><button onClick={() => setShowRegionModal(true)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Add Your First Region</button></div>)}
                {regions.map((region) => (<div key={region.id} className="border rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 p-5 cursor-pointer hover:from-red-100 hover:to-orange-100 transition flex justify-between items-center" onClick={() => fetchRegionZones(region.id)}>
                    <div className="flex items-center gap-4"><div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md"><FaCity className="text-red-600 text-2xl" /></div><div><h3 className="font-bold text-gray-800 text-lg">{region.region_name}</h3><p className="text-sm text-gray-500">Admin: {region.admin_name}</p><p className="text-xs text-gray-500">{region.email}</p><div className="flex gap-2 mt-1"><span className={`text-xs px-2 py-0.5 rounded-full ${region.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{region.status}</span></div></div></div>
                    <div className="flex items-center gap-3">{regionZones[region.id] && <div className="text-right"><p className="text-sm font-bold text-red-600">{regionZones[region.id].totalZones} Zones</p></div>}{loadingZones[region.id] ? <FaSpinner className="animate-spin text-red-600 text-xl" /> : (expandedRegion === region.id ? <FaChevronUp className="text-gray-500 text-xl" /> : <FaChevronDown className="text-gray-500 text-xl" />)}</div>
                  </div>
                  {expandedRegion === region.id && regionZones[region.id] && (<div className="p-5 bg-gray-50 border-t"><h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><FaMapMarkerAlt className="text-red-600" /> Zones in {region.region_name}</h4>{regionZones[region.id].zones.length === 0 && <div className="text-center py-8"><FaMapMarkerAlt className="text-5xl text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No zones found in this region</p></div>}<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{regionZones[region.id].zones.map((zone) => (<div key={zone.id} className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition"><div className="flex items-start gap-3"><div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-100 to-orange-100 flex items-center justify-center"><FaMapMarkerAlt className="text-red-600 text-xl" /></div><div className="flex-1 min-w-0"><h4 className="font-semibold text-gray-800 truncate">{zone.zone_name}</h4><div className="flex items-center gap-2 mt-1 flex-wrap"><span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{zone.status === 'active' ? 'Active' : 'Inactive'}</span></div><div className="mt-2 text-xs text-gray-500 space-y-0.5"><p className="truncate">👤 {zone.admin_name}</p><p className="truncate">📧 {zone.email}</p>{zone.phone && <p>📞 {zone.phone}</p>}</div></div></div></div>))}</div><div className="flex justify-end mt-4 pt-4 border-t"><button onClick={(e) => { e.stopPropagation(); viewRegionDetails(region); }} className="px-4 py-2 text-sm bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:shadow-md flex items-center gap-2"><FaEye /> View Region Details</button></div></div>)}
                  {expandedRegion === region.id && loadingZones[region.id] && (<div className="p-8 text-center bg-gray-50"><FaSpinner className="animate-spin text-2xl text-red-600 mx-auto mb-2" /><p className="text-sm text-gray-500">Loading zones...</p></div>)}
                </div>))}
              </div>
            </div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && !showConversationView && (<div className="bg-white rounded-2xl shadow-md p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">Inbox</h2><button onClick={() => { setShowReportModal(true); fetchRecipients(); }} className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center gap-2"><FaPlus /> New Report</button></div><div className="space-y-4">{inbox.length === 0 && <div className="text-center py-12 text-gray-400">No messages in inbox</div>}{inbox.map((report) => (<div key={report.id} className={`border rounded-xl p-4 cursor-pointer hover:shadow-md transition ${!report.is_opened ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`} onClick={() => viewReportDetails(report)}><div className="flex justify-between items-start"><div className="flex items-center gap-2">{!report.is_opened ? <FaEnvelope className="text-red-500" /> : <FaEnvelopeOpen className="text-gray-400" />}<h3 className="font-semibold text-gray-800">{report.title}</h3></div><span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>{report.priority}</span></div><p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.body}</p>{report.attachments && report.attachments.length > 0 && <div className="mt-2 flex items-center gap-1 text-xs text-gray-400"><FaPaperclip /> {report.attachments.length} attachment(s)</div>}<div className="flex justify-between items-center mt-2"><p className="text-xs text-gray-500">From: {report.sender_full_name}</p><p className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleString()}</p></div></div>))}</div></div>)}

          {/* Outbox Tab */}
          {activeTab === 'outbox' && !showConversationView && (<div className="bg-white rounded-2xl shadow-md p-6"><h2 className="text-xl font-bold text-gray-800 mb-6">Sent Reports</h2><div className="space-y-4">{outbox.length === 0 && <div className="text-center py-12 text-gray-400">No sent reports</div>}{outbox.map((report) => (<div key={report.id} className="border rounded-xl p-4 hover:shadow-md transition bg-white cursor-pointer" onClick={() => viewReportDetails(report)}><div className="flex justify-between items-start"><h3 className="font-semibold text-gray-800">{report.title}</h3><span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>{report.priority}</span></div><p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.body}</p>{report.attachments && report.attachments.length > 0 && <div className="mt-2 flex items-center gap-1 text-xs text-gray-400"><FaPaperclip /> {report.attachments.length} attachment(s)</div>}<div className="flex justify-between items-center mt-2"><p className="text-xs text-gray-500">To: {report.display_recipient || report.recipient_full_name}</p><p className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleString()}</p></div></div>))}</div></div>)}

          {/* Profile Tab */}
          {activeTab === 'profile' && !showConversationView && (<div className="bg-white rounded-2xl shadow-md overflow-hidden"><div className="bg-gradient-to-r from-red-600 to-orange-600 px-8 py-10"><div className="flex items-center gap-6"><div className="relative"><div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl"><FaUserCircle className="text-red-600 text-6xl" /></div></div><div className="text-white"><h2 className="text-2xl font-bold">{profileData.first_name} {profileData.last_name}</h2><p className="text-red-100">Federal Administrator</p></div></div></div><div className="p-8"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-gray-800">Federal Administrator Information</h3>{!isEditingProfile ? <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"><FaEdit /> Edit Profile</button> : <div className="flex gap-2"><button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 border rounded-xl">Cancel</button><button onClick={updateProfile} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl"><FaSave /> Save</button></div>}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-gray-50 rounded-xl p-5"><h4 className="font-semibold text-red-600 mb-3">Personal Info</h4><div className="space-y-2"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-500">First Name</label>{isEditingProfile ? <input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="font-medium">{profileData.first_name || 'Not set'}</p>}</div><div><label className="text-xs text-gray-500">Last Name</label>{isEditingProfile ? <input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p className="font-medium">{profileData.last_name || 'Not set'}</p>}</div></div><div><label className="text-xs text-gray-500">Phone</label>{isEditingProfile ? <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /> : <p>{profileData.phone || 'Not set'}</p>}</div></div></div><div className="bg-gray-50 rounded-xl p-5"><h4 className="font-semibold text-red-600 mb-3">Account</h4><button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-red-600 text-red-600 rounded-xl hover:bg-red-50"><FaKey /> Change Password</button></div></div></div></div>)}
        </main>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Add Region Modal */}
      {showRegionModal && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">Add Regional Admin</h2><button onClick={() => setShowRegionModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div><form onSubmit={handleCreateRegion} className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="md:col-span-2"><input type="text" placeholder="Region Name" value={regionFormData.region_name} onChange={(e) => setRegionFormData({...regionFormData, region_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required /></div><input type="text" placeholder="First Name" value={regionFormData.first_name} onChange={(e) => setRegionFormData({...regionFormData, first_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required /><input type="text" placeholder="Middle Name" value={regionFormData.middle_name} onChange={(e) => setRegionFormData({...regionFormData, middle_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" /><input type="text" placeholder="Last Name" value={regionFormData.last_name} onChange={(e) => setRegionFormData({...regionFormData, last_name: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required /><select value={regionFormData.gender} onChange={(e) => setRegionFormData({...regionFormData, gender: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm"><option>Male</option><option>Female</option><option>Other</option></select><input type="number" placeholder="Age" value={regionFormData.age} onChange={(e) => setRegionFormData({...regionFormData, age: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required /><input type="email" placeholder="Email" value={regionFormData.email} onChange={(e) => setRegionFormData({...regionFormData, email: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required /><input type="tel" placeholder="Phone" value={regionFormData.phone} onChange={(e) => setRegionFormData({...regionFormData, phone: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" /><input type="password" placeholder="Password" value={regionFormData.password} onChange={(e) => setRegionFormData({...regionFormData, password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" required minLength="6" /></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowRegionModal(false)} className="px-5 py-2.5 border rounded-xl">Cancel</button><button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl">Create Region</button></div></form></div></div>)}

      {/* Send Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800"><FaPaperPlane className="inline mr-2 text-red-500" /> Send New Report</h2>
              <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            
            <form onSubmit={handleSendReport} className="space-y-4">
              {/* Recipient Selection - Dropdown for Regions */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Regional Admin <span className="text-red-500">*</span>
                </label>
                <select
                  value={reportFormData.recipient_id}
                  onChange={(e) => setReportFormData({
                    ...reportFormData, 
                    recipient_type: 'regional',
                    recipient_id: e.target.value
                  })}
                  className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-red-500 bg-white"
                  required
                >
                  <option value="">-- Select Region --</option>
                  {recipients.regions?.map(region => (
                    <option key={region.id} value={region.id}>
                      {region.region_name} - {region.full_name}
                    </option>
                  ))}
                </select>
                {recipients.regions?.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ No regions found. Please add regions first.</p>
                )}
              </div>

              <input type="hidden" name="recipient_type" value="regional" />

              {/* Priority Dropdown */}
              <select 
                value={reportFormData.priority} 
                onChange={(e) => setReportFormData({...reportFormData, priority: e.target.value})} 
                className="w-full px-4 py-3 border rounded-xl text-sm"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
              
              {/* Title Input */}
              <input 
                type="text" 
                placeholder="Title" 
                value={reportFormData.title} 
                onChange={(e) => setReportFormData({...reportFormData, title: e.target.value})} 
                className="w-full px-4 py-3 border rounded-xl text-sm" 
                required 
              />
              
              {/* Message Textarea */}
              <textarea 
                placeholder="Message" 
                value={reportFormData.body} 
                onChange={(e) => setReportFormData({...reportFormData, body: e.target.value})} 
                rows="5" 
                className="w-full px-4 py-3 border rounded-xl text-sm resize-none" 
                required 
              />
              
              {/* Attachments Section */}
              <div className="border rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">Attachments</label>
                  <button type="button" onClick={() => document.getElementById('reportFileInput').click()} className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1">
                    <FaPaperclip /> Add Files
                  </button>
                </div>
                <input id="reportFileInput" type="file" ref={fileInputRef} multiple onChange={(e) => handleAttachmentSelect(e, false)} className="hidden" />
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
              
              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowReportModal(false)} className="px-5 py-2.5 border rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl">
                  Send Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Region Details Modal */}
      {showRegionDetailModal && selectedRegion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Region Details</h2><button onClick={() => { setShowRegionDetailModal(false); setSelectedRegion(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <div className="flex items-center gap-4 mb-6"><div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-2xl"><FaCity className="text-red-600 text-2xl" /></div><div><h3 className="text-lg font-bold text-gray-800">{selectedRegion.region_name}</h3><p className="text-red-600 text-sm">Region</p></div></div>
            <div className="bg-gray-50 rounded-xl p-4"><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500 text-xs">Admin Name</p><p className="font-medium">{selectedRegion.admin_name}</p></div><div><p className="text-gray-500 text-xs">Email</p><p className="font-medium">{selectedRegion.email}</p></div><div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium">{selectedRegion.phone || 'Not provided'}</p></div><div><p className="text-gray-500 text-xs">Status</p><p className={`font-medium ${selectedRegion.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>{selectedRegion.status}</p></div></div></div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Report Details</h2><button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <div className="flex items-center justify-between mb-4"><span className={`px-3 py-1 rounded-full text-sm ${getPriorityBadge(selectedReport.priority)}`}>{selectedReport.priority.toUpperCase()}</span><span className="text-xs text-gray-500">{new Date(selectedReport.sent_at).toLocaleString()}</span></div>
            <h3 className="text-lg font-semibold mb-2">{selectedReport.title}</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4"><p className="text-sm text-gray-700 whitespace-pre-line">{selectedReport.body}</p></div>
            {selectedReport.attachments && selectedReport.attachments.length > 0 && (
              <div className="mb-4"><h4 className="text-sm font-semibold text-gray-700 mb-2">Attachments ({selectedReport.attachments.length})</h4><div className="space-y-2">{selectedReport.attachments.map((att, idx) => (<div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3 min-w-0 flex-1">{getFileIcon(att.mimeType)}<div className="min-w-0"><p className="text-sm font-medium truncate">{att.originalName}</p><p className="text-xs text-gray-400">{formatFileSize(att.size)}</p></div></div><button onClick={() => downloadAttachment(att)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 flex items-center gap-1"><FaDownload /> Download</button></div>))}</div></div>
            )}
            <div className="border-t pt-4"><p className="text-sm text-gray-600"><span className="font-medium">From:</span> {selectedReport.sender_full_name}</p><p className="text-sm text-gray-600"><span className="font-medium">Status:</span> {selectedReport.status}</p></div>
            <div className="flex gap-3 mt-6 pt-4 border-t"><button onClick={() => fetchConversationThread(selectedReport.id)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl flex items-center justify-center gap-2"><FaComment /> Open Chat</button></div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Change Password</h2><button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <div className="space-y-4"><input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" /><input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" /><input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" /><div className="flex justify-end gap-3 pt-4"><button onClick={() => setShowPasswordModal(false)} className="px-5 py-2.5 border rounded-xl">Cancel</button><button onClick={changePassword} className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl">Change Password</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FederalDashboard;