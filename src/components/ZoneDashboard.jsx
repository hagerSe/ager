import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  FaHome, FaCity, FaBell, FaUserCircle, FaSignOutAlt,
  FaInbox, FaPaperPlane, FaHospital, FaChartBar,
  FaPlus, FaChevronLeft, FaChevronRight, FaEnvelope, FaEnvelopeOpen,
  FaTimes, FaSpinner, FaUserMd, FaPhone, FaEnvelope as FaEnvelopeIcon,
  FaHeartbeat, FaEdit, FaSave, FaKey, FaReply, FaEye,
  FaSearch, FaArrowLeft, FaComment, FaClock, FaExclamationTriangle,
  FaBuilding, FaCalendarAlt, FaChevronDown, FaChevronUp, 
  FaUserNurse, FaFlask, FaXRay, FaBaby, FaPills, FaUserTie,
  FaBed, FaCreditCard, FaVenusMars, FaMars, FaVenus, FaUsers, FaClipboardList,
  FaSync, FaPaperclip, FaFile, FaFileImage, FaFilePdf, FaFileAlt, FaDownload, FaTrash,
  FaUniversity, FaLandmark, FaGlobe, FaMapMarkerAlt, FaFilePowerpoint, FaFileExcel, FaFileWord
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const ZoneDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [woredas, setWoredas] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showWoredaModal, setShowWoredaModal] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [showWoredaDetailModal, setShowWoredaDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedWoreda, setSelectedWoreda] = useState(null);
  const [expandedWoreda, setExpandedWoreda] = useState(null);
  const [woredaKebeles, setWoredaKebeles] = useState({});
  const [loadingKebeles, setLoadingKebeles] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [socketConnectionStatus, setSocketConnectionStatus] = useState('connecting');
  const [realTimeNotification, setRealTimeNotification] = useState(null);
  const socketRef = useRef(null);
  
  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
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
    email: '', zone_name: '', region_name: '', address: ''
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // Woreda form data with validation
  const [woredaFormData, setWoredaFormData] = useState({
    woreda_name: '', first_name: '', middle_name: '', last_name: '', gender: 'Male', 
    age: '', email: '', password: '', phone: ''
  });
  const [woredaFormErrors, setWoredaFormErrors] = useState({});
  
  // Report form data with attachments
  const [reportFormData, setReportFormData] = useState({
    title: '', body: '', priority: 'medium', recipient_type: '', recipient_id: '', attachments: []
  });
  const [recipients, setRecipients] = useState({ regional: null, woredas: [] });

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5001';

  // ==================== VALIDATION FUNCTIONS ====================
  
  // 1. Validate Email - ONLY GMAIL allowed
  const validateEmail = (email) => {
    if (!email) return 'Email is required';
    if (email.includes(' ')) return 'Email cannot contain spaces';
    if (!email.includes('@')) return 'Email must contain @ symbol';
    
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!normalizedEmail.endsWith('@gmail.com')) {
      return 'Only Gmail accounts are allowed. Email must end with @gmail.com';
    }
    
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(normalizedEmail)) {
      return 'Invalid Gmail format. Example: username@gmail.com';
    }
    
    const localPart = normalizedEmail.split('@')[0];
    if (localPart.includes('..')) return 'Email cannot contain consecutive dots';
    if (normalizedEmail.length < 10) return 'Email is too short';
    if (normalizedEmail.length > 50) return 'Email must be less than 50 characters';
    
    return null;
  };

  // 2. Validate Name (letters only)
  const validateName = (name, fieldName) => {
    if (!name || name.trim() === '') return `${fieldName} is required`;
    const nameRegex = /^[A-Za-z\s\-']+$/;
    if (!nameRegex.test(name.trim())) return `${fieldName} must contain only letters (A-Z, a-z). No numbers allowed.`;
    if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`;
    if (name.trim().length > 50) return `${fieldName} must be less than 50 characters`;
    return null;
  };

  // 3. Validate Phone (10-14 digits)
  const validatePhone = (phone) => {
    if (!phone) return null;
    const cleanedPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    if (!/^\d+$/.test(cleanedPhone)) return 'Phone number must contain only digits, spaces, dashes, or plus sign';
    if (cleanedPhone.length < 10) return 'Phone number must be at least 10 digits';
    if (cleanedPhone.length > 14) return 'Phone number must not exceed 14 digits';
    return null;
  };

  // 4. Validate Age (18-100)
  const validateAge = (age) => {
    if (!age) return 'Age is required';
    const ageNum = parseInt(age);
    if (isNaN(ageNum)) return 'Age must be a number';
    if (ageNum < 18) return 'Age must be at least 18 years old';
    if (ageNum > 100) return 'Age must be less than 100 years old';
    return null;
  };

  // 5. Validate Password
  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password.length > 50) return 'Password must be less than 50 characters';
    return null;
  };

  // Validate Woreda Form
  const validateWoredaForm = () => {
    const errors = {};
    errors.woreda_name = validateName(woredaFormData.woreda_name, 'Woreda name');
    errors.first_name = validateName(woredaFormData.first_name, 'First name');
    errors.last_name = validateName(woredaFormData.last_name, 'Last name');
    if (woredaFormData.middle_name && woredaFormData.middle_name.trim() !== '') {
      errors.middle_name = validateName(woredaFormData.middle_name, 'Middle name');
    }
    errors.email = validateEmail(woredaFormData.email);
    errors.age = validateAge(woredaFormData.age);
    errors.password = validatePassword(woredaFormData.password);
    errors.phone = validatePhone(woredaFormData.phone);
    
    setWoredaFormErrors(errors);
    return Object.keys(errors).filter(key => errors[key] !== null).length === 0;
  };

  // Validate Profile
  const validateProfile = () => {
    const errors = {};
    errors.first_name = validateName(profileData.first_name, 'First name');
    errors.last_name = validateName(profileData.last_name, 'Last name');
    if (profileData.middle_name && profileData.middle_name.trim() !== '') {
      errors.middle_name = validateName(profileData.middle_name, 'Middle name');
    }
    errors.phone = validatePhone(profileData.phone);
    errors.age = validateAge(profileData.age);
    errors.gender = !profileData.gender ? 'Gender is required' : null;
    
    setProfileErrors(errors);
    return Object.keys(errors).filter(key => errors[key] !== null).length === 0;
  };

  // Handle Woreda form input change with validation
  const handleWoredaInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    if (name === 'first_name' || name === 'last_name' || name === 'middle_name' || name === 'woreda_name') {
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
    
    setWoredaFormData({ ...woredaFormData, [name]: processedValue });
    
    if (woredaFormErrors[name]) {
      setWoredaFormErrors({ ...woredaFormErrors, [name]: null });
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

    socketRef.current.on('new_report_from_woreda', (data) => {
      setRealTimeNotification({ id: Date.now(), type: 'report', title: 'New Report', message: `${data.sender_name} sent: "${data.title}"`, priority: data.priority, timestamp: new Date() });
      setTimeout(() => setRealTimeNotification(null), 6000);
      fetchDashboardData();
    });

    socketRef.current.on('report_reply_from_woreda', (data) => {
      setRealTimeNotification({ id: Date.now(), type: 'reply', title: 'New Reply', message: `${data.sender_name} replied to: "${data.title}"`, priority: data.priority, timestamp: new Date() });
      setTimeout(() => setRealTimeNotification(null), 6000);
      if (currentConversationId) fetchConversationThread(currentConversationId);
      fetchDashboardData();
    });

    socketRef.current.on('new_report_from_regional', (data) => {
      setRealTimeNotification({ id: Date.now(), type: 'report', title: 'New Report from Regional', message: `${data.sender_name} sent: "${data.title}"`, priority: data.priority, timestamp: new Date() });
      setTimeout(() => setRealTimeNotification(null), 6000);
      fetchDashboardData();
    });

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  // ==================== DATA FETCHING ====================
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [statsRes, inboxRes, outboxRes, woredasRes, notifRes] = await Promise.all([
        axios.get(`${API_URL}/api/zone/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/zone/reports/inbox?page=${currentPage}&search=${searchTerm}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/zone/reports/outbox?page=${currentPage}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/zone/woredas`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/zone/notifications?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (inboxRes.data.success) { 
        setInbox(inboxRes.data.reports || []); 
        setTotalPages(inboxRes.data.totalPages || 1);
        setUnreadCount(inboxRes.data.unreadCount || 0);
        setUrgentCount(inboxRes.data.urgentUnreadCount || 0);
      }
      if (outboxRes.data.success) setOutbox(outboxRes.data.reports || []);
      if (woredasRes.data.success) setWoredas(woredasRes.data.woredas || []);
      if (notifRes.data.success) setNotifications(notifRes.data.notifications || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      if (error.response?.status === 401) { localStorage.removeItem('token'); navigate('/login'); }
    } finally { setLoading(false); }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/zone/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        const zone = res.data.zone;
        setProfileData({
          first_name: zone.first_name || '', middle_name: zone.middle_name || '', last_name: zone.last_name || '',
          gender: zone.gender || '', age: zone.age || '', phone: zone.phone || '', email: zone.email || '',
          zone_name: zone.zone_name || '', region_name: zone.region_name || '', address: zone.address || ''
        });
      }
    } catch (error) { console.error('Error fetching profile:', error); }
  };

  const fetchRecipients = async () => {
    try {
      const token = localStorage.getItem('token');
      const [regionalRes, woredasRes] = await Promise.all([
        axios.get(`${API_URL}/api/zone/regional-info`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/zone/woredas-list`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { success: true, woredas: [] } }))
      ]);
      setRecipients({ 
        regional: regionalRes.data.regional || null,
        woredas: woredasRes.data.woredas || []
      });
    } catch (error) { 
      console.error('Error fetching recipients:', error);
      setRecipients({ regional: null, woredas: [] });
    }
  };

  const fetchWoredaKebeles = async (woredaId) => {
    if (woredaKebeles[woredaId]) {
      setExpandedWoreda(expandedWoreda === woredaId ? null : woredaId);
      return;
    }
    
    setLoadingKebeles(prev => ({ ...prev, [woredaId]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/zone/woredas/${woredaId}/kebeles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const kebeles = res.data.kebeles || [];
      
      setWoredaKebeles(prev => ({
        ...prev,
        [woredaId]: {
          kebeles: kebeles,
          totalKebeles: kebeles.length,
          woredaName: res.data.woreda_name
        }
      }));
      setExpandedWoreda(woredaId);
    } catch (error) {
      console.error('Error fetching woreda kebeles:', error);
      setWoredaKebeles(prev => ({
        ...prev,
        [woredaId]: {
          kebeles: [],
          totalKebeles: 0,
          error: error.response?.data?.message || 'No kebeles found'
        }
      }));
      setExpandedWoreda(woredaId);
    } finally {
      setLoadingKebeles(prev => ({ ...prev, [woredaId]: false }));
    }
  };

  // ==================== ATTACHMENT HANDLING ====================
  const handleAttachmentSelect = async (e, isReply = false) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
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
    setUploadingAttachment(false);
    
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
      const res = await axios.get(`${API_URL}/api/zone/reports/thread/${reportId}`, {
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
    
    setUploadingAttachment(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('body', conversationReplyText || '');
      
      conversationAttachments.forEach(attachment => {
        if (attachment.file) {
          formData.append('attachments', attachment.file);
        }
      });
      
      const res = await axios.post(`${API_URL}/api/zone/reports/${currentConversationId}/reply`, 
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
    } finally {
      setUploadingAttachment(false);
    }
  };

  // ==================== WOREDA MANAGEMENT ====================
  const handleCreateWoreda = async (e) => {
    e.preventDefault();
    if (!validateWoredaForm()) {
      alert('Please fix the validation errors');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/zone/woredas`, woredaFormData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.data.success) {
        setWoredaFormData({ woreda_name: '', first_name: '', middle_name: '', last_name: '', gender: 'Male', age: '', email: '', password: '', phone: '' });
        setWoredaFormErrors({});
        setShowWoredaModal(false);
        fetchDashboardData();
        alert('Woreda admin created successfully!');
      }
    } catch (error) { 
      alert(error.response?.data?.message || 'Error creating woreda'); 
    }
  };

  const viewWoredaDetails = (woreda) => {
    setSelectedWoreda(woreda);
    setShowWoredaDetailModal(true);
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
        if (attachment.file) {
          formData.append('attachments', attachment.file);
        }
      });
      
      const res = await axios.post(`${API_URL}/api/zone/reports/send`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
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
    if (!validateProfile()) {
      alert('Please fix the validation errors');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/zone/profile`, profileData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.data.success) { 
        setIsEditingProfile(false); 
        setProfileErrors({});
        alert('Profile updated successfully!'); 
        fetchProfile(); 
      }
    } catch (error) { 
      alert(error.response?.data?.message || 'Error updating profile'); 
    }
  };

  const changePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) { 
      setPasswordErrors({ confirm_password: 'Passwords do not match' });
      return; 
    }
    if (passwordData.new_password.length < 6) {
      setPasswordErrors({ new_password: 'Password must be at least 6 characters' });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/zone/change-password`, 
        { current_password: passwordData.current_password, new_password: passwordData.new_password }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) { 
        setShowPasswordModal(false); 
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setPasswordErrors({});
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
      await axios.put(`${API_URL}/api/zone/notifications/${id}/read`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      fetchDashboardData();
    } catch (error) { console.error('Error marking notification:', error); }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/zone/notifications/read-all`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      fetchDashboardData();
    } catch (error) { console.error('Error marking all as read:', error); }
  };

  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/zone/reports/${reportId}/read`, {}, { 
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
      <motion.div 
        initial={{ opacity: 0, x: 100, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`fixed bottom-6 right-6 z-[10000] max-w-md bg-white rounded-2xl shadow-2xl border-l-4 ${priorityColors[realTimeNotification.priority]} overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-purple-100"
              >
                {realTimeNotification.type === 'reply' ? '💬' : '📬'}
              </motion.div>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <FaSpinner className="animate-spin text-4xl text-purple-600 mx-auto mb-3" />
          <p className="text-gray-600 text-lg">Loading Dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex">
      <RealTimeNotification />

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="text-center">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring' }}
                  className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <FaSignOutAlt className="text-red-600 text-2xl" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Logout</h3>
                <p className="text-gray-500 mb-6">Are you sure you want to logout? You will need to login again to access your account.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button onClick={handleLogout} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
                    Yes, Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Purple/Indigo Colors Only (3 colors) */}
      <motion.div 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`bg-gradient-to-b from-purple-800 to-purple-700 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} shadow-2xl relative z-10`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-lg flex items-center justify-center">
                  <FaCity className="text-white text-sm" />
                </div>
                <span className="font-bold text-base">Zone Admin</span>
              </motion.div>
            )}
            {sidebarCollapsed && <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-lg flex items-center justify-center mx-auto"><FaCity className="text-white text-sm" /></div>}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
              className="p-2 hover:bg-purple-600 rounded-lg transition"
            >
              {sidebarCollapsed ? <FaChevronRight className="text-lg" /> : <FaChevronLeft className="text-lg" />}
            </button>
          </div>
          <nav className="space-y-1">
            <button 
              onClick={() => { setActiveTab('dashboard'); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg' : 'hover:bg-purple-600'}`}
            >
              <FaHome className="text-lg" /> {!sidebarCollapsed && <span className="text-sm font-medium">Dashboard</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('woredas'); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition ${activeTab === 'woredas' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg' : 'hover:bg-purple-600'}`}
            >
              <FaMapMarkerAlt className="text-lg" /> {!sidebarCollapsed && <span className="text-sm font-medium">Woredas</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('inbox'); fetchDashboardData(); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition relative ${activeTab === 'inbox' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg' : 'hover:bg-purple-600'}`}
            >
              <FaInbox className="text-lg" /> {!sidebarCollapsed && <span className="text-sm font-medium">Inbox</span>}
              {unreadCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                >
                  {unreadCount}
                </motion.span>
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('outbox'); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition ${activeTab === 'outbox' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg' : 'hover:bg-purple-600'}`}
            >
              <FaPaperPlane className="text-lg" /> {!sidebarCollapsed && <span className="text-sm font-medium">Sent Reports</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('profile'); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition ${activeTab === 'profile' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg' : 'hover:bg-purple-600'}`}
            >
              <FaUserCircle className="text-lg" /> {!sidebarCollapsed && <span className="text-sm font-medium">Profile</span>}
            </button>
          </nav>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <motion.header 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-white/90 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b border-gray-100"
        >
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <motion.h1 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent"
                >
                  {showConversationView ? 'Conversation Thread' : (
                    activeTab === 'dashboard' ? 'Zone Dashboard' :
                    activeTab === 'woredas' ? 'Woreda Administration' :
                    activeTab === 'inbox' ? 'Inbox' :
                    activeTab === 'outbox' ? 'Sent Reports' :
                    activeTab === 'profile' ? 'My Profile' : 'Zone Dashboard'
                  )}
                </motion.h1>
                <motion.p 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-gray-500 mt-1"
                >
                  Welcome back, <span className="font-semibold text-gray-700">{profileData.first_name || user?.full_name || 'Admin'}</span> | {profileData.zone_name} Zone
                </motion.p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${socketConnectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                  <span className="text-xs text-gray-600">{socketConnectionStatus === 'connected' ? 'Live' : 'Offline'}</span>
                </div>
                <button 
                  onClick={() => setShowNotificationPanel(!showNotificationPanel)} 
                  className="relative p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <FaBell className="text-xl text-gray-600" />
                  {unreadCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                  {urgentCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-ping">
                      {urgentCount}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setShowLogoutConfirm(true)} 
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium"
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          </div>
        </motion.header>

        <AnimatePresence>
          {showNotificationPanel && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute right-6 top-20 w-80 bg-white rounded-xl shadow-2xl z-50 border border-gray-100 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <button onClick={markAllAsRead} className="text-xs text-purple-600 hover:text-purple-800">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${!notif.is_read ? 'bg-purple-50' : ''} ${notif.priority === 'urgent' ? 'border-l-4 border-red-500' : ''}`} 
                    onClick={() => markNotificationAsRead(notif.id)}
                  >
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
          {/* Welcome Animation - Only for Dashboard */}
          {activeTab === 'dashboard' && !showConversationView && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"
                  >
                    <FaCity className="text-3xl" />
                  </motion.div>
                  <div>
                    <motion.h2 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl font-bold"
                    >
                      Welcome to Zone Dashboard!
                    </motion.h2>
                    <motion.p 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-purple-100 text-sm"
                    >
                      Manage woredas, track reports, and monitor activities in {profileData.zone_name} Zone
                    </motion.p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Conversation Thread View */}
          {showConversationView && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring' }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                <button 
                  onClick={() => { setShowConversationView(false); setConversationThread([]); setCurrentConversationId(null); }} 
                  className="text-white hover:text-purple-200 flex items-center gap-2 transition"
                >
                  <FaArrowLeft /> Back
                </button>
                <h2 className="text-white font-semibold text-lg">Conversation</h2>
                <div className="w-20"></div>
              </div>
              <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50">
                {conversationThread.length === 0 && (
                  <div className="text-center py-12 text-gray-400">No messages yet</div>
                )}
                {conversationThread.map((msg, idx) => (
                  <motion.div 
                    key={msg.id} 
                    initial={{ opacity: 0, x: msg.sender_type === 'zone' ? 50 : -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex ${msg.sender_type === 'zone' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${msg.sender_type === 'zone' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'bg-white border shadow-sm'} rounded-2xl p-4`}>
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
                  </motion.div>
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
                    className="flex-1 px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 resize-none" 
                    rows="2" 
                  />
                  <div className="flex flex-col gap-2">
                    <button 
                      type="button" 
                      onClick={() => replyFileInputRef.current?.click()} 
                      className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition"
                      title="Attach file"
                    >
                      <FaPaperclip />
                    </button>
                    <button 
                      onClick={sendConversationReply} 
                      disabled={uploadingAttachment} 
                      className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50"
                    >
                      {uploadingAttachment ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                    </button>
                  </div>
                </div>
                <input type="file" ref={replyFileInputRef} onChange={(e) => handleAttachmentSelect(e, true)} className="hidden" multiple />
                {uploadingAttachment && (
                  <p className="text-xs text-gray-500 mt-2 text-center">Uploading attachments...</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Dashboard Tab - Stats Cards with Purple/Indigo/Teal colors only */}
          {activeTab === 'dashboard' && !showConversationView && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                {[
                  { label: 'Inbox', value: stats?.inbox || 0, color: 'purple', icon: <FaInbox /> },
                  { label: 'Sent Reports', value: stats?.outbox || 0, color: 'indigo', icon: <FaPaperPlane /> },
                  { label: 'Woredas', value: stats?.totalWoredas || 0, color: 'teal', icon: <FaMapMarkerAlt /> },
                  { label: 'Unread', value: unreadCount, color: 'amber', icon: <FaEnvelope /> },
                  { label: 'Urgent', value: urgentCount, color: 'red', icon: <FaExclamationTriangle /> }
                ].map((item, idx) => (
                  <motion.div 
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 400 } }}
                    className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition border-l-4 border-${item.color}-500`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">{item.label}</p>
                        <motion.p 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.1 + 0.2, type: 'spring' }}
                          className={`text-3xl font-bold text-${item.color}-600`}
                        >
                          {item.value}
                        </motion.p>
                      </div>
                      <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center`}>
                        <div className={`text-xl text-${item.color}-600`}>{item.icon}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl p-6 shadow-lg"
              >
                <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setShowReportModal(true); fetchRecipients(); }} 
                    className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FaPaperPlane /> New Report
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowWoredaModal(true)} 
                    className="p-4 bg-gradient-to-r from-teal-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FaPlus /> Add Woreda
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('woredas')} 
                    className="p-4 bg-gradient-to-r from-indigo-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FaMapMarkerAlt /> View Woredas
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('inbox')} 
                    className="p-4 bg-gradient-to-r from-purple-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FaInbox /> View Inbox
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}

          {/* WOREDAS TAB */}
          {activeTab === 'woredas' && !showConversationView && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-purple-600" /> Woreda Administration
                </h2>
                <div className="flex gap-3">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search woredas..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 w-64" 
                    />
                    <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />
                  </div>
                  <button onClick={() => setShowWoredaModal(true)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center gap-2">
                    <FaPlus /> Add Woreda
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {woredas.length === 0 && (
                  <div className="text-center py-12">
                    <FaMapMarkerAlt className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No woredas found</p>
                    <button onClick={() => setShowWoredaModal(true)} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      Add Your First Woreda
                    </button>
                  </div>
                )}
                
                {woredas.map((woreda, idx) => (
                  <motion.div 
                    key={woreda.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div 
                      className="bg-gradient-to-r from-gray-50 to-purple-50 p-5 cursor-pointer hover:from-gray-100 hover:to-purple-100 transition flex justify-between items-center"
                      onClick={() => fetchWoredaKebeles(woreda.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md">
                          <FaMapMarkerAlt className="text-purple-600 text-2xl" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{woreda.woreda_name}</h3>
                          <p className="text-sm text-gray-500">Admin: {woreda.admin_name}</p>
                          <p className="text-xs text-gray-500">{woreda.email}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${woreda.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              {woreda.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {woredaKebeles[woreda.id] && (
                          <div className="text-right">
                            <p className="text-sm font-bold text-purple-600">{woredaKebeles[woreda.id].totalKebeles} Kebeles</p>
                          </div>
                        )}
                        {loadingKebeles[woreda.id] ? (
                          <FaSpinner className="animate-spin text-purple-600 text-xl" />
                        ) : (
                          expandedWoreda === woreda.id ? <FaChevronUp className="text-gray-500 text-xl" /> : <FaChevronDown className="text-gray-500 text-xl" />
                        )}
                      </div>
                    </div>
                    
                    {expandedWoreda === woreda.id && woredaKebeles[woreda.id] && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-5 bg-gray-50 border-t"
                      >
                        <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <FaCity className="text-purple-600" /> Kebeles in {woreda.woreda_name}
                        </h4>
                        {woredaKebeles[woreda.id].kebeles.length === 0 && (
                          <div className="text-center py-8">
                            <FaCity className="text-5xl text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No kebeles found in this woreda</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {woredaKebeles[woreda.id].kebeles.map((kebele, kIdx) => (
                            <motion.div 
                              key={kebele.id} 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: kIdx * 0.03 }}
                              className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 flex items-center justify-center">
                                  <FaCity className="text-purple-600 text-xl" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-800 truncate">{kebele.kebele_name}</h4>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                      {kebele.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                                    <p className="truncate">👤 {kebele.admin_name}</p>
                                    <p className="truncate">📧 {kebele.email}</p>
                                    {kebele.phone && <p>📞 {kebele.phone}</p>}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        <div className="flex justify-end mt-4 pt-4 border-t">
                          <button 
                            onClick={(e) => { e.stopPropagation(); viewWoredaDetails(woreda); }}
                            className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-md transition flex items-center gap-2"
                          >
                            <FaEye /> View Woreda Details
                          </button>
                        </div>
                      </motion.div>
                    )}
                    {expandedWoreda === woreda.id && loadingKebeles[woreda.id] && (
                      <div className="p-8 text-center bg-gray-50">
                        <FaSpinner className="animate-spin text-2xl text-purple-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Loading kebeles...</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && !showConversationView && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaInbox className="text-purple-600" /> Inbox
                </h2>
                <button onClick={() => { setShowReportModal(true); fetchRecipients(); }} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center gap-2">
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
                {inbox.map((report, idx) => (
                  <motion.div 
                    key={report.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`border rounded-xl p-5 cursor-pointer hover:shadow-md transition ${!report.is_opened ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`} 
                    onClick={() => viewReportDetails(report)}
                  >
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {!report.is_opened ? <FaEnvelope className="text-purple-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
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
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Outbox Tab */}
          {activeTab === 'outbox' && !showConversationView && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
                <FaPaperPlane className="text-purple-600" /> Sent Reports
              </h2>
              <div className="space-y-4">
                {outbox.length === 0 && (
                  <div className="text-center py-12">
                    <FaPaperPlane className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No sent reports</p>
                  </div>
                )}
                {outbox.map((report, idx) => (
                  <motion.div 
                    key={report.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
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
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Profile Tab with Validation */}
          {activeTab === 'profile' && !showConversationView && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-10">
                <div className="flex items-center gap-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="relative"
                  >
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                      <FaUserCircle className="text-purple-600 text-6xl" />
                    </div>
                  </motion.div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold">{profileData.first_name} {profileData.last_name}</h2>
                    <p className="text-purple-100">{profileData.zone_name} Zone</p>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                  <h3 className="text-lg font-bold text-gray-800">Zone Administrator Information</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition">
                      <FaEdit /> Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => { setIsEditingProfile(false); setProfileErrors({}); }} className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                        Cancel
                      </button>
                      <button onClick={updateProfile} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
                        <FaSave /> Save
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold text-purple-600 mb-4">Personal Info</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">First Name *</label>
                          {isEditingProfile ? 
                            <input 
                              type="text" 
                              value={profileData.first_name} 
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^A-Za-z\s\-']/g, '');
                                setProfileData({...profileData, first_name: value});
                              }} 
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 ${profileErrors.first_name ? 'border-red-500' : 'border-gray-300'}`}
                            /> : 
                            <p className="font-medium text-gray-800">{profileData.first_name || 'Not set'}</p>
                          }
                          {profileErrors.first_name && <p className="text-red-500 text-xs mt-1">{profileErrors.first_name}</p>}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Last Name *</label>
                          {isEditingProfile ? 
                            <input 
                              type="text" 
                              value={profileData.last_name} 
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^A-Za-z\s\-']/g, '');
                                setProfileData({...profileData, last_name: value});
                              }} 
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 ${profileErrors.last_name ? 'border-red-500' : 'border-gray-300'}`}
                            /> : 
                            <p className="font-medium text-gray-800">{profileData.last_name || 'Not set'}</p>
                          }
                          {profileErrors.last_name && <p className="text-red-500 text-xs mt-1">{profileErrors.last_name}</p>}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Email</label>
                        <p className="font-medium text-gray-800">{profileData.email || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Phone</label>
                        {isEditingProfile ? 
                          <input 
                            type="tel" 
                            value={profileData.phone} 
                            onChange={(e) => {
                              let value = e.target.value.replace(/[^\d\s\-\(\)\+]/g, '');
                              setProfileData({...profileData, phone: value});
                            }} 
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 ${profileErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="10-14 digits"
                          /> : 
                          <p>{profileData.phone || 'Not set'}</p>
                        }
                        {profileErrors.phone && <p className="text-red-500 text-xs mt-1">{profileErrors.phone}</p>}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Age</label>
                        {isEditingProfile ? 
                          <input 
                            type="number" 
                            value={profileData.age} 
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              if (value === '' || (parseInt(value) >= 18 && parseInt(value) <= 100) || value.length < 3) {
                                setProfileData({...profileData, age: value});
                              }
                            }} 
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 ${profileErrors.age ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="18-100"
                          /> : 
                          <p className="font-medium text-gray-800">{profileData.age || 'Not set'}</p>
                        }
                        {profileErrors.age && <p className="text-red-500 text-xs mt-1">{profileErrors.age}</p>}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Gender</label>
                        {isEditingProfile ? 
                          <select 
                            value={profileData.gender} 
                            onChange={(e) => setProfileData({...profileData, gender: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select> : 
                          <p className="font-medium text-gray-800">{profileData.gender || 'Not set'}</p>
                        }
                        {profileErrors.gender && <p className="text-red-500 text-xs mt-1">{profileErrors.gender}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold text-purple-600 mb-4">Account Security</h4>
                    <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-purple-600 text-purple-600 rounded-xl hover:bg-purple-50 transition">
                      <FaKey /> Change Password
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Add Woreda Modal with Validation */}
      <AnimatePresence>
        {showWoredaModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Add Woreda Admin</h2>
                <button onClick={() => setShowWoredaModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
              </div>
              <form onSubmit={handleCreateWoreda} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Woreda Name *</label>
                    <input 
                      type="text" 
                      name="woreda_name"
                      placeholder="e.g., Addis Ketema Woreda" 
                      value={woredaFormData.woreda_name} 
                      onChange={handleWoredaInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 ${woredaFormErrors.woreda_name ? 'border-red-500' : 'border-gray-300'}`}
                      required 
                    />
                    {woredaFormErrors.woreda_name && <p className="text-red-500 text-xs mt-1">{woredaFormErrors.woreda_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input 
                      type="text" 
                      name="first_name"
                      placeholder="First name" 
                      value={woredaFormData.first_name} 
                      onChange={handleWoredaInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 ${woredaFormErrors.first_name ? 'border-red-500' : 'border-gray-300'}`}
                      required 
                    />
                    {woredaFormErrors.first_name && <p className="text-red-500 text-xs mt-1">{woredaFormErrors.first_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input 
                      type="text" 
                      name="middle_name"
                      placeholder="Middle name" 
                      value={woredaFormData.middle_name} 
                      onChange={handleWoredaInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 ${woredaFormErrors.middle_name ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {woredaFormErrors.middle_name && <p className="text-red-500 text-xs mt-1">{woredaFormErrors.middle_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input 
                      type="text" 
                      name="last_name"
                      placeholder="Last name" 
                      value={woredaFormData.last_name} 
                      onChange={handleWoredaInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 ${woredaFormErrors.last_name ? 'border-red-500' : 'border-gray-300'}`}
                      required 
                    />
                    {woredaFormErrors.last_name && <p className="text-red-500 text-xs mt-1">{woredaFormErrors.last_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                    <select 
                      name="gender"
                      value={woredaFormData.gender} 
                      onChange={handleWoredaInputChange}
                      className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
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
                      value={woredaFormData.age} 
                      onChange={handleWoredaInputChange}
                      min="18"
                      max="100"
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 ${woredaFormErrors.age ? 'border-red-500' : 'border-gray-300'}`}
                      required 
                    />
                    {woredaFormErrors.age && <p className="text-red-500 text-xs mt-1">{woredaFormErrors.age}</p>}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input 
                      type="email" 
                      name="email"
                      placeholder="username@gmail.com" 
                      value={woredaFormData.email} 
                      onChange={handleWoredaInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 ${woredaFormErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                      required 
                    />
                    {woredaFormErrors.email && <p className="text-red-500 text-xs mt-1">{woredaFormErrors.email}</p>}
                    <p className="text-xs text-purple-500 mt-1">⚠️ Only Gmail accounts are allowed (must end with @gmail.com)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                    <input 
                      type="tel" 
                      name="phone"
                      placeholder="0912345678 or +251912345678" 
                      value={woredaFormData.phone} 
                      onChange={handleWoredaInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 ${woredaFormErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {woredaFormErrors.phone && <p className="text-red-500 text-xs mt-1">{woredaFormErrors.phone}</p>}
                    <p className="text-xs text-gray-400 mt-1">10-14 digits only</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password * (min 6 chars)</label>
                    <input 
                      type="password" 
                      name="password"
                      placeholder="Password" 
                      value={woredaFormData.password} 
                      onChange={handleWoredaInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 ${woredaFormErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                      required 
                      minLength="6"
                    />
                    {woredaFormErrors.password && <p className="text-red-500 text-xs mt-1">{woredaFormErrors.password}</p>}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowWoredaModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition">
                    Create Woreda
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800"><FaPaperPlane className="inline mr-2 text-purple-500" /> Send New Report</h2>
              <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <form onSubmit={handleSendReport} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" value="regional" checked={reportFormData.recipient_type === 'regional'} onChange={(e) => setReportFormData({...reportFormData, recipient_type: e.target.value, recipient_id: ''})} />
                    <FaGlobe className="text-red-500" /> Regional Admin
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" value="woreda" checked={reportFormData.recipient_type === 'woreda'} onChange={(e) => setReportFormData({...reportFormData, recipient_type: e.target.value, recipient_id: ''})} />
                    <FaMapMarkerAlt className="text-blue-500" /> Woreda Admin
                  </label>
                </div>
              </div>
              
              {reportFormData.recipient_type === 'regional' && recipients.regional && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Regional Admin: {recipients.regional.full_name}</p>
                  <p className="text-xs text-gray-500">Region: {recipients.regional.region_name}</p>
                  <input type="hidden" value={recipients.regional.id} />
                </div>
              )}
              
              {reportFormData.recipient_type === 'woreda' && (
                <select value={reportFormData.recipient_id} onChange={(e) => setReportFormData({...reportFormData, recipient_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500" required>
                  <option value="">Select Woreda Admin</option>
                  {recipients.woredas.map(w => <option key={w.id} value={w.id}>{w.woreda_name} - {w.full_name}</option>)}
                </select>
              )}
              
              <select value={reportFormData.priority} onChange={(e) => setReportFormData({...reportFormData, priority: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm">
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
              
              <input type="text" placeholder="Title" value={reportFormData.title} onChange={(e) => setReportFormData({...reportFormData, title: e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500" required />
              
              <textarea placeholder="Message" value={reportFormData.body} onChange={(e) => setReportFormData({...reportFormData, body: e.target.value})} rows="5" className="w-full px-4 py-3 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-purple-500" required />
              
              <div className="border rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">Attachments</label>
                  <button type="button" onClick={() => document.getElementById('reportFileInput').click()} className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1">
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
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition">
                  Send Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Woreda Details Modal */}
      {showWoredaDetailModal && selectedWoreda && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Woreda Details</h2>
              <button onClick={() => { setShowWoredaDetailModal(false); setSelectedWoreda(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                <FaMapMarkerAlt className="text-purple-600 text-2xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedWoreda.woreda_name}</h3>
                <p className="text-purple-600 text-sm">Woreda</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500 text-xs">Admin Name</p><p className="font-medium text-gray-800">{selectedWoreda.admin_name}</p></div>
                <div><p className="text-gray-500 text-xs">Email</p><p className="font-medium text-gray-800">{selectedWoreda.email}</p></div>
                <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium text-gray-800">{selectedWoreda.phone || 'Not provided'}</p></div>
                <div><p className="text-gray-500 text-xs">Status</p><p className={`font-medium ${selectedWoreda.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>{selectedWoreda.status}</p></div>
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
                <button onClick={() => fetchConversationThread(selectedReport.id)} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition">
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
              <input 
                type="password" 
                placeholder="Current Password" 
                value={passwordData.current_password} 
                onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} 
                className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500" 
              />
              <input 
                type="password" 
                placeholder="New Password (min 6 characters)" 
                value={passwordData.new_password} 
                onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} 
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 ${passwordErrors.new_password ? 'border-red-500' : 'border-gray-300'}`}
              />
              {passwordErrors.new_password && <p className="text-red-500 text-xs">{passwordErrors.new_password}</p>}
              <input 
                type="password" 
                placeholder="Confirm New Password" 
                value={passwordData.confirm_password} 
                onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} 
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 ${passwordErrors.confirm_password ? 'border-red-500' : 'border-gray-300'}`}
              />
              {passwordErrors.confirm_password && <p className="text-red-500 text-xs">{passwordErrors.confirm_password}</p>}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowPasswordModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button onClick={changePassword} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition">Change Password</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoneDashboard;