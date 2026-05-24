import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  FaHome, FaGlobe, FaBell, FaUserCircle, FaSignOutAlt,
  FaInbox, FaPaperPlane, FaPlus, FaChevronLeft, FaChevronRight, 
  FaEnvelope, FaEnvelopeOpen, FaTimes, FaSpinner, FaEdit, FaSave, 
  FaKey, FaReply, FaEye, FaSearch, FaArrowLeft, FaComment, 
  FaExclamationTriangle, FaChevronDown, FaChevronUp, FaPaperclip, 
  FaFile, FaFileImage, FaFilePdf, FaFileAlt, FaDownload, FaTrash,
  FaCity, FaMapMarkerAlt, FaFilePowerpoint, FaFileExcel, FaFileWord
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
  
  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '', middle_name: '', last_name: '', gender: '', age: '', phone: '',
    email: '', address: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  
  // Region form data with validation
  const [regionFormData, setRegionFormData] = useState({
    region_name: '', first_name: '', middle_name: '', last_name: '', gender: 'Male', 
    age: '', email: '', password: '', phone: ''
  });
  const [regionFormErrors, setRegionFormErrors] = useState({});
  
  // Report form data with attachments
  const [reportFormData, setReportFormData] = useState({
    title: '', body: '', priority: 'medium', recipient_type: 'regional', recipient_id: '', attachments: []
  });
  const [recipients, setRecipients] = useState({ regions: [] });

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5001';

  // ==================== VALIDATION FUNCTIONS ====================
  const validateEmail = (email) => {
    if (!email) return 'Email is required';
    if (email.includes(' ')) return 'Email cannot contain spaces';
    if (!email.includes('@')) return 'Email must contain @ symbol';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return 'Invalid email format. Examples: name@gmail.com, admin@health.gov.et';
    return null;
  };

  const validateName = (name, fieldName) => {
    if (!name || name.trim() === '') return `${fieldName} is required`;
    const nameRegex = /^[A-Za-z\s\-']+$/;
    if (!nameRegex.test(name.trim())) return `${fieldName} must contain only letters (A-Z, a-z). No numbers allowed.`;
    if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`;
    if (name.trim().length > 50) return `${fieldName} must be less than 50 characters`;
    return null;
  };

  const validatePhone = (phone) => {
    if (!phone) return null;
    const cleanedPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    if (!/^\d+$/.test(cleanedPhone)) return 'Phone number must contain only digits, spaces, dashes, or plus sign';
    if (cleanedPhone.length < 10) return 'Phone number must be at least 10 digits';
    if (cleanedPhone.length > 14) return 'Phone number must not exceed 14 digits';
    return null;
  };

  const validateAge = (age) => {
    if (!age) return 'Age is required';
    const ageNum = parseInt(age);
    if (isNaN(ageNum)) return 'Age must be a number';
    if (ageNum < 18) return 'Age must be at least 18 years old';
    if (ageNum > 100) return 'Age must be less than 100 years old';
    return null;
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password.length > 50) return 'Password must be less than 50 characters';
    return null;
  };

  const validateRegionForm = () => {
    const errors = {};
    errors.region_name = validateName(regionFormData.region_name, 'Region name');
    errors.first_name = validateName(regionFormData.first_name, 'First name');
    errors.last_name = validateName(regionFormData.last_name, 'Last name');
    if (regionFormData.middle_name && regionFormData.middle_name.trim() !== '') {
      errors.middle_name = validateName(regionFormData.middle_name, 'Middle name');
    }
    errors.email = validateEmail(regionFormData.email);
    errors.age = validateAge(regionFormData.age);
    errors.password = validatePassword(regionFormData.password);
    errors.phone = validatePhone(regionFormData.phone);
    
    setRegionFormErrors(errors);
    return Object.keys(errors).filter(key => errors[key] !== null).length === 0;
  };

  const handleRegionInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    if (name === 'first_name' || name === 'last_name' || name === 'middle_name' || name === 'region_name') {
      processedValue = value.replace(/[^A-Za-z\s\-']/g, '');
    }
    if (name === 'age') {
      processedValue = value.replace(/[^0-9]/g, '');
    }
    if (name === 'phone') {
      processedValue = value.replace(/[^\d\s\-\(\)\+]/g, '');
    }
    if (name === 'email') {
      processedValue = value.toLowerCase();
    }
    
    setRegionFormData({ ...regionFormData, [name]: processedValue });
    
    if (regionFormErrors[name]) {
      setRegionFormErrors({ ...regionFormErrors, [name]: null });
    }
  };

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

  const fetchRecipients = async () => {
    try {
      const token = localStorage.getItem('token');
      const regionsRes = await axios.get(`${API_URL}/api/federal/regions-list`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setRecipients({ regions: regionsRes.data.regions || [] });
    } catch (error) { 
      console.error('Error fetching recipients:', error);
      setRecipients({ regions: [] });
    }
  };

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
      let fileKey = attachment.key || attachment.fileKey;
      
      if (!fileKey && attachment.url && attachment.url.includes('attachments/')) {
        const urlParts = attachment.url.split('/');
        const attIndex = urlParts.findIndex(part => part === 'attachments');
        if (attIndex !== -1) {
          fileKey = urlParts.slice(attIndex).join('/').split('?')[0];
        }
      }
      
      if (!fileKey && attachment.filename) {
        fileKey = attachment.filename;
      }
      
      if (!fileKey) {
        alert('Cannot download: file information missing');
        return;
      }
      
      const token = localStorage.getItem('token');
      
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
      alert('Failed to download file');
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
    if (!validateRegionForm()) {
      alert('Please fix the validation errors');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/federal/regions`, regionFormData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.data.success) {
        setRegionFormData({ region_name: '', first_name: '', middle_name: '', last_name: '', gender: 'Male', age: '', email: '', password: '', phone: '' });
        setRegionFormErrors({});
        setShowRegionModal(false);
        fetchDashboardData();
        alert('Regional admin created successfully!');
      }
    } catch (error) { 
      alert(error.response?.data?.message || 'Error creating region'); 
    }
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
      const res = await axios.put(`${API_URL}/api/federal/profile`, profileData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.data.success) { 
        setIsEditingProfile(false); 
        alert('Profile updated successfully!'); 
        fetchProfile(); 
      }
    } catch (error) { 
      alert(error.response?.data?.message || 'Error updating profile'); 
    }
  };

  const changePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) { 
      alert('Passwords do not match'); 
      return; 
    }
    if (passwordData.new_password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/federal/change-password`, 
        { current_password: passwordData.current_password, new_password: passwordData.new_password }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) { 
        setShowPasswordModal(false); 
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' }); 
        alert('Password changed successfully!'); 
      }
    } catch (error) { 
      alert(error.response?.data?.message || 'Error changing password'); 
    }
  };

  // ==================== NOTIFICATIONS ====================
  const markNotificationAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/federal/notifications/${id}/read`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      fetchDashboardData();
    } catch (error) { console.error('Error marking notification:', error); }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/federal/notifications/read-all`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      fetchDashboardData();
    } catch (error) { console.error('Error marking all as read:', error); }
  };

  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/federal/reports/${reportId}/read`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      fetchDashboardData();
    } catch (error) { console.error('Error marking report as read:', error); }
  };

  // ==================== LOGOUT HANDLER ====================
  const handleLogout = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };

  // ==================== UTILITIES ====================
  const viewReportDetails = (report) => { 
    setSelectedReport(report); 
    setShowReportDetailModal(true); 
    if (!report.is_opened) markReportAsRead(report.id); 
  };

  const getPriorityBadge = (priority) => {
    const colors = { 
      low: 'bg-teal-100 text-teal-800', 
      medium: 'bg-yellow-100 text-yellow-800', 
      high: 'bg-orange-100 text-orange-800', 
      urgent: 'bg-red-100 text-red-800 animate-pulse' 
    };
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-blue-900">
        <div className="text-center"><FaSpinner className="animate-spin text-3xl text-blue-400 mx-auto mb-3" /><p className="text-gray-300">Loading Dashboard...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 flex">
      <RealTimeNotification />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaSignOutAlt className="text-red-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Logout</h3>
              <p className="text-gray-500 mb-6">Are you sure you want to logout? You will need to login again to access your account.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleLogout} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Blue/Black Color - NO SCHEDULES */}
      <div className={`bg-gradient-to-b from-gray-900 to-blue-900 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} shadow-2xl`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <FaGlobe className="text-white text-sm" />
                </div>
                <span className="font-bold text-base">Federal Admin</span>
              </div>
            )}
            {sidebarCollapsed && <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto"><FaGlobe className="text-white text-sm" /></div>}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-blue-800 rounded-lg transition">
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>
          <nav className="space-y-1">
            <button onClick={() => { setActiveTab('dashboard'); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-blue-800'}`}>
              <FaHome className="text-lg" /> {!sidebarCollapsed && <span>Dashboard</span>}
            </button>
            <button onClick={() => { setActiveTab('regions'); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'regions' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-blue-800'}`}>
              <FaCity className="text-lg" /> {!sidebarCollapsed && <span>Regions</span>}
            </button>
            <button onClick={() => { setActiveTab('inbox'); fetchDashboardData(); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition relative ${activeTab === 'inbox' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-blue-800'}`}>
              <FaInbox className="text-lg" /> {!sidebarCollapsed && <span>Inbox</span>}
              {unreadCount > 0 && <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{unreadCount}</span>}
            </button>
            <button onClick={() => { setActiveTab('outbox'); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'outbox' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-blue-800'}`}>
              <FaPaperPlane className="text-lg" /> {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>
            <button onClick={() => { setActiveTab('profile'); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition ${activeTab === 'profile' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-blue-800'}`}>
              <FaUserCircle className="text-lg" /> {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/90 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                  {showConversationView ? 'Conversation Thread' : (
                    activeTab === 'dashboard' ? 'Federal Dashboard' :
                    activeTab === 'regions' ? 'Regional Administration' :
                    activeTab === 'inbox' ? 'Inbox' :
                    activeTab === 'outbox' ? 'Sent Reports' :
                    activeTab === 'profile' ? 'My Profile' : 'Federal Dashboard'
                  )}
                </h1>
                <p className="text-sm text-gray-500">Welcome back, {profileData.first_name || user?.full_name || 'Admin'} | Federal Government</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${socketConnectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                  <span className="text-xs text-gray-600">{socketConnectionStatus === 'connected' ? 'Live' : 'Offline'}</span>
                </div>
                <button onClick={() => setShowNotificationPanel(!showNotificationPanel)} className="relative p-2 hover:bg-gray-100 rounded-full transition">
                  <FaBell className="text-xl text-gray-600" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{unreadCount}</span>}
                  {urgentCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-ping">{urgentCount}</span>}
                </button>
                <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium">
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
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-cyan-50">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notif.is_read ? 'bg-blue-50' : ''} ${notif.priority === 'urgent' ? 'border-l-4 border-red-500' : ''}`} onClick={() => markNotificationAsRead(notif.id)}>
                    <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                  </div>
                )) : (
                  <div className="p-8 text-center text-gray-500">
                    <FaBell className="text-3xl mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No notifications</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Conversation Thread View */}
          {showConversationView && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-700 to-cyan-700 px-6 py-4 flex justify-between items-center">
                <button onClick={() => { setShowConversationView(false); setConversationThread([]); setCurrentConversationId(null); }} 
                  className="text-white hover:text-blue-200 flex items-center gap-2 transition">
                  <FaArrowLeft /> Back
                </button>
                <h2 className="text-white font-semibold text-lg">Conversation</h2>
                <div className="w-20"></div>
              </div>
              <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50">
                {conversationThread.length === 0 && (
                  <div className="text-center py-12 text-gray-400">No messages yet</div>
                )}
                {conversationThread.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'federal' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${msg.sender_type === 'federal' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' : 'bg-white border shadow-sm'} rounded-2xl p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium">{msg.sender_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${msg.priority === 'urgent' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {msg.priority}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium mb-2">Attachments ({msg.attachments.length}):</p>
                          <div className="space-y-1">
                            {msg.attachments.map((att, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                {getFileIcon(att.mimeType)}
                                <span className="text-xs flex-1 truncate">{att.originalName || att.filename}</span>
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
                {conversationAttachments.length > 0 && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium">Attachments to send ({conversationAttachments.length})</span>
                      <button onClick={() => setConversationAttachments([])} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
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
                    className="flex-1 px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 resize-none" 
                    rows="2" 
                  />
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => replyFileInputRef.current?.click()} 
                      className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition">
                      <FaPaperclip />
                    </button>
                    <button onClick={sendConversationReply} disabled={uploadingAttachment} 
                      className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50">
                      {uploadingAttachment ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                    </button>
                  </div>
                </div>
                <input type="file" ref={replyFileInputRef} onChange={(e) => handleAttachmentSelect(e, true)} className="hidden" multiple />
              </div>
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && !showConversationView && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition border-l-4 border-blue-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Inbox</p>
                      <p className="text-3xl font-bold text-blue-600">{stats?.inbox || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FaInbox className="text-xl text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition border-l-4 border-cyan-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Sent Reports</p>
                      <p className="text-3xl font-bold text-cyan-600">{stats?.outbox || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                      <FaPaperPlane className="text-xl text-cyan-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition border-l-4 border-purple-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Regions</p>
                      <p className="text-3xl font-bold text-purple-600">{regions.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <FaCity className="text-xl text-purple-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition border-l-4 border-amber-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Unread Messages</p>
                      <p className="text-3xl font-bold text-amber-600">{unreadCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <FaEnvelope className="text-xl text-amber-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition border-l-4 border-red-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Urgent Alerts</p>
                      <p className="text-3xl font-bold text-red-600">{urgentCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <FaExclamationTriangle className="text-xl text-red-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button onClick={() => { setShowReportModal(true); fetchRecipients(); }} 
                    className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-2">
                    <FaPaperPlane /> New Report
                  </button>
                  <button onClick={() => setShowRegionModal(true)} 
                    className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-2">
                    <FaPlus /> Add Region
                  </button>
                  <button onClick={() => setActiveTab('regions')} 
                    className="p-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-2">
                    <FaCity /> View Regions
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REGIONS TAB */}
          {activeTab === 'regions' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaCity className="text-blue-600" /> Regional Administration
                </h2>
                <div className="flex gap-3">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search regions..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-64" 
                    />
                    <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />
                  </div>
                  <button onClick={() => setShowRegionModal(true)} 
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center gap-2">
                    <FaPlus /> Add Region
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {regions.length === 0 && (
                  <div className="text-center py-12">
                    <FaCity className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No regions found</p>
                    <button onClick={() => setShowRegionModal(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Add Your First Region
                    </button>
                  </div>
                )}
                {regions.map((region) => (
                  <div key={region.id} className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                    <div 
                      className="bg-gradient-to-r from-gray-50 to-blue-50 p-5 cursor-pointer hover:from-gray-100 hover:to-blue-100 transition flex justify-between items-center"
                      onClick={() => fetchRegionZones(region.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md">
                          <FaCity className="text-blue-600 text-2xl" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{region.region_name}</h3>
                          <p className="text-sm text-gray-500">Admin: {region.admin_name}</p>
                          <p className="text-xs text-gray-500">{region.email}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${region.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              {region.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {regionZones[region.id] && (
                          <div className="text-right">
                            <p className="text-sm font-bold text-blue-600">{regionZones[region.id].totalZones} Zones</p>
                          </div>
                        )}
                        {loadingZones[region.id] ? (
                          <FaSpinner className="animate-spin text-blue-600 text-xl" />
                        ) : (
                          expandedRegion === region.id ? <FaChevronUp className="text-gray-500 text-xl" /> : <FaChevronDown className="text-gray-500 text-xl" />
                        )}
                      </div>
                    </div>
                    {expandedRegion === region.id && regionZones[region.id] && (
                      <div className="p-5 bg-gray-50 border-t">
                        <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <FaMapMarkerAlt className="text-blue-600" /> Zones in {region.region_name}
                        </h4>
                        {regionZones[region.id].zones.length === 0 && (
                          <div className="text-center py-8">
                            <FaMapMarkerAlt className="text-5xl text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No zones found in this region</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {regionZones[region.id].zones.map((zone) => (
                            <div key={zone.id} className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 flex items-center justify-center">
                                  <FaMapMarkerAlt className="text-blue-600 text-xl" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-800 truncate">{zone.zone_name}</h4>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                      {zone.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                                    <p className="truncate">👤 {zone.admin_name}</p>
                                    <p className="truncate">📧 {zone.email}</p>
                                    {zone.phone && <p>📞 {zone.phone}</p>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end mt-4 pt-4 border-t">
                          <button 
                            onClick={(e) => { e.stopPropagation(); viewRegionDetails(region); }} 
                            className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-md transition flex items-center gap-2">
                            <FaEye /> View Region Details
                          </button>
                        </div>
                      </div>
                    )}
                    {expandedRegion === region.id && loadingZones[region.id] && (
                      <div className="p-8 text-center bg-gray-50">
                        <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Loading zones...</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaInbox className="text-blue-600" /> Inbox
                </h2>
                <button onClick={() => { setShowReportModal(true); fetchRecipients(); }} 
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center gap-2">
                  <FaPlus /> New Report
                </button>
              </div>
              <div className="space-y-4">
                {inbox.length === 0 && (
                  <div className="text-center py-12">
                    <FaInbox className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No messages in inbox</p>
                  </div>
                )}
                {inbox.map((report) => (
                  <div 
                    key={report.id} 
                    className={`border rounded-xl p-5 cursor-pointer hover:shadow-md transition ${!report.is_opened ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`} 
                    onClick={() => viewReportDetails(report)}
                  >
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {!report.is_opened ? <FaEnvelope className="text-blue-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
                        <h3 className="font-semibold text-gray-800 text-lg">{report.title}</h3>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>
                        {report.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">{report.body}</p>
                    {report.attachments && report.attachments.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <FaPaperclip /> {report.attachments.length} attachment(s)
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-3">
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
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
                <FaPaperPlane className="text-blue-600" /> Sent Reports
              </h2>
              <div className="space-y-4">
                {outbox.length === 0 && (
                  <div className="text-center py-12">
                    <FaPaperPlane className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No sent reports</p>
                  </div>
                )}
                {outbox.map((report) => (
                  <div 
                    key={report.id} 
                    className="border rounded-xl p-5 hover:shadow-md transition bg-white cursor-pointer" 
                    onClick={() => viewReportDetails(report)}
                  >
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <h3 className="font-semibold text-gray-800 text-lg">{report.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(report.priority)}`}>
                        {report.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">{report.body}</p>
                    {report.attachments && report.attachments.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <FaPaperclip /> {report.attachments.length} attachment(s)
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-xs text-gray-500">To: {report.display_recipient || report.recipient_full_name}</p>
                      <p className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && !showConversationView && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-700 to-cyan-700 px-8 py-10">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                      <FaUserCircle className="text-blue-600 text-6xl" />
                    </div>
                  </div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold">{profileData.first_name} {profileData.last_name}</h2>
                    <p className="text-blue-100">Federal Administrator</p>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                  <h3 className="text-lg font-bold text-gray-800">Federal Administrator Information</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} 
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
                      <FaEdit /> Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                        Cancel
                      </button>
                      <button onClick={updateProfile} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition">
                        <FaSave /> Save
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold text-blue-600 mb-4">Personal Info</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">First Name</label>
                          {isEditingProfile ? 
                            <input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} 
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /> : 
                            <p className="font-medium text-gray-800">{profileData.first_name || 'Not set'}</p>
                          }
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Last Name</label>
                          {isEditingProfile ? 
                            <input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} 
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /> : 
                            <p className="font-medium text-gray-800">{profileData.last_name || 'Not set'}</p>
                          }
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Email</label>
                        <p className="font-medium text-gray-800">{profileData.email || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Phone</label>
                        {isEditingProfile ? 
                          <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} 
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /> : 
                          <p>{profileData.phone || 'Not set'}</p>
                        }
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold text-blue-600 mb-4">Account Security</h4>
                    <button onClick={() => setShowPasswordModal(true)} 
                      className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition">
                      <FaKey /> Change Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Add Region Modal */}
      {showRegionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Add Regional Admin</h2>
              <button onClick={() => setShowRegionModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <form onSubmit={handleCreateRegion} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region Name *</label>
                  <input 
                    type="text" 
                    name="region_name"
                    placeholder="e.g., Addis Ababa" 
                    value={regionFormData.region_name} 
                    onChange={handleRegionInputChange}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${regionFormErrors.region_name ? 'border-red-500' : 'border-gray-300'}`}
                    required 
                  />
                  {regionFormErrors.region_name && <p className="text-red-500 text-xs mt-1">{regionFormErrors.region_name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input 
                    type="text" 
                    name="first_name"
                    placeholder="First name" 
                    value={regionFormData.first_name} 
                    onChange={handleRegionInputChange}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${regionFormErrors.first_name ? 'border-red-500' : 'border-gray-300'}`}
                    required 
                  />
                  {regionFormErrors.first_name && <p className="text-red-500 text-xs mt-1">{regionFormErrors.first_name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input 
                    type="text" 
                    name="middle_name"
                    placeholder="Middle name" 
                    value={regionFormData.middle_name} 
                    onChange={handleRegionInputChange}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${regionFormErrors.middle_name ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {regionFormErrors.middle_name && <p className="text-red-500 text-xs mt-1">{regionFormErrors.middle_name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input 
                    type="text" 
                    name="last_name"
                    placeholder="Last name" 
                    value={regionFormData.last_name} 
                    onChange={handleRegionInputChange}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${regionFormErrors.last_name ? 'border-red-500' : 'border-gray-300'}`}
                    required 
                  />
                  {regionFormErrors.last_name && <p className="text-red-500 text-xs mt-1">{regionFormErrors.last_name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select 
                    name="gender"
                    value={regionFormData.gender} 
                    onChange={handleRegionInputChange}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age * (18-100)</label>
                  <input 
                    type="number" 
                    name="age"
                    placeholder="Age" 
                    value={regionFormData.age} 
                    onChange={handleRegionInputChange}
                    min="18"
                    max="100"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${regionFormErrors.age ? 'border-red-500' : 'border-gray-300'}`}
                    required 
                  />
                  {regionFormErrors.age && <p className="text-red-500 text-xs mt-1">{regionFormErrors.age}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input 
                    type="email" 
                    name="email"
                    placeholder="admin@health.gov.et" 
                    value={regionFormData.email} 
                    onChange={handleRegionInputChange}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${regionFormErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                    required 
                  />
                  {regionFormErrors.email && <p className="text-red-500 text-xs mt-1">{regionFormErrors.email}</p>}
                  <p className="text-xs text-gray-400 mt-1">Accepts .com, .org, .gov.et, etc.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                  <input 
                    type="tel" 
                    name="phone"
                    placeholder="0912345678 or +251912345678" 
                    value={regionFormData.phone} 
                    onChange={handleRegionInputChange}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${regionFormErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {regionFormErrors.phone && <p className="text-red-500 text-xs mt-1">{regionFormErrors.phone}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password * (min 6 chars)</label>
                  <input 
                    type="password" 
                    name="password"
                    placeholder="Password" 
                    value={regionFormData.password} 
                    onChange={handleRegionInputChange}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${regionFormErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                    required 
                    minLength="6"
                  />
                  {regionFormErrors.password && <p className="text-red-500 text-xs mt-1">{regionFormErrors.password}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowRegionModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition">
                  Create Region
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800"><FaPaperPlane className="inline mr-2 text-blue-500" /> Send New Report</h2>
              <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <form onSubmit={handleSendReport} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Regional Admin <span className="text-red-500">*</span>
                </label>
                <select
                  value={reportFormData.recipient_id}
                  onChange={(e) => setReportFormData({...reportFormData, recipient_type: 'regional', recipient_id: e.target.value})}
                  className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
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
              
              <input 
                type="text" 
                placeholder="Title" 
                value={reportFormData.title} 
                onChange={(e) => setReportFormData({...reportFormData, title: e.target.value})} 
                className="w-full px-4 py-3 border rounded-xl text-sm" 
                required 
              />
              
              <textarea 
                placeholder="Message" 
                value={reportFormData.body} 
                onChange={(e) => setReportFormData({...reportFormData, body: e.target.value})} 
                rows="5" 
                className="w-full px-4 py-3 border rounded-xl text-sm resize-none" 
                required 
              />
              
              <div className="border rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">Attachments</label>
                  <button type="button" onClick={() => document.getElementById('reportFileInput').click()} 
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
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
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowReportModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition">
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Region Details</h2>
              <button onClick={() => { setShowRegionDetailModal(false); setSelectedRegion(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                <FaCity className="text-blue-600 text-2xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedRegion.region_name}</h3>
                <p className="text-blue-600 text-sm">Region</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500 text-xs">Admin Name</p><p className="font-medium text-gray-800">{selectedRegion.admin_name}</p></div>
                <div><p className="text-gray-500 text-xs">Email</p><p className="font-medium text-gray-800">{selectedRegion.email}</p></div>
                <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium text-gray-800">{selectedRegion.phone || 'Not provided'}</p></div>
                <div><p className="text-gray-500 text-xs">Status</p><p className={`font-medium ${selectedRegion.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>{selectedRegion.status}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Report Details</h2>
              <button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-sm ${getPriorityBadge(selectedReport.priority)}`}>
                  {selectedReport.priority.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">{new Date(selectedReport.sent_at).toLocaleString()}</span>
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">{selectedReport.title}</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-line">{selectedReport.body}</p>
              </div>
              
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
              
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600"><span className="font-medium">From:</span> {selectedReport.sender_full_name}</p>
                <p className="text-sm text-gray-600"><span className="font-medium">Status:</span> {selectedReport.status}</p>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button onClick={() => fetchConversationThread(selectedReport.id)} 
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition">
                  <FaComment /> Open Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" />
              <input type="password" placeholder="New Password (min 6 characters)" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" />
              <input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" />
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowPasswordModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button onClick={changePassword} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition">Change Password</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FederalDashboard;