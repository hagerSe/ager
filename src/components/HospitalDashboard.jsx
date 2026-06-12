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
  FaFileAlt, FaFilter, FaSearch, FaArrowLeft, FaComment,
  FaGlobe, FaCity, FaMapMarkerAlt, FaFileImage, FaFilePdf
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
  const [urgentCount, setUrgentCount] = useState(0);
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
  const [sendReportAttachments, setSendReportAttachments] = useState([]);
  const [sendReportAttachmentPreview, setSendReportAttachmentPreview] = useState([]);
  const sendReportFileInputRef = useRef(null);
  const [kebeleAdmin, setKebeleAdmin] = useState(null);
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
  const [profileErrors, setProfileErrors] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // Staff form data with validation
  const [staffFormData, setStaffFormData] = useState({
    first_name: '', middle_name: '', last_name: '', gender: 'Male', age: '', email: '', password: '', phone: '', department: 'Doctor', ward: ''
  });
  const [staffFormErrors, setStaffFormErrors] = useState({});
  
  // Report form data
  const [reportFormData, setReportFormData] = useState({
    title: '', body: '', priority: 'medium', recipient_type: '', recipient_id: ''
  });

  const requireWardDepartments = ['Doctor', 'Nurse', 'Midwife', 'Pharma', 'Lab', 'Radio'];
  const needsWardSelection = requireWardDepartments.includes(staffFormData.department);
  const wards = ['OPD', 'EME', 'ANC'];
  const departments = ['Doctor', 'Nurse', 'Pharma', 'Lab', 'Radio', 'Midwife', 'Triage', 'Card_Office', 'Bed_Management', 'Human_Resource'];

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5001';

  // ==================== VALIDATION FUNCTIONS ====================
  
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

  const validateStaffForm = () => {
    const errors = {};
    errors.first_name = validateName(staffFormData.first_name, 'First name');
    errors.last_name = validateName(staffFormData.last_name, 'Last name');
    if (staffFormData.middle_name && staffFormData.middle_name.trim() !== '') {
      errors.middle_name = validateName(staffFormData.middle_name, 'Middle name');
    }
    errors.email = validateEmail(staffFormData.email);
    errors.age = validateAge(staffFormData.age);
    errors.password = validatePassword(staffFormData.password);
    errors.phone = validatePhone(staffFormData.phone);
    
    setStaffFormErrors(errors);
    return Object.keys(errors).filter(key => errors[key] !== null).length === 0;
  };

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

  const handleStaffInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    if (name === 'first_name' || name === 'last_name' || name === 'middle_name') {
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
    
    setStaffFormData({ ...staffFormData, [name]: processedValue });
    
    if (staffFormErrors[name]) {
      setStaffFormErrors({ ...staffFormErrors, [name]: null });
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FaFileAlt className="text-gray-500 text-xl" />;
    if (mimeType.startsWith('image/')) return <FaFileImage className="text-blue-500 text-xl" />;
    if (mimeType === 'application/pdf') return <FaFilePdf className="text-red-500 text-xl" />;
    return <FaFileAlt className="text-gray-500 text-xl" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDepartmentIcon = (department) => {
    const icons = {
      Doctor: <FaUserMd className="text-teal-500 text-lg" />,
      Nurse: <FaUserNurse className="text-emerald-500 text-lg" />,
      Pharma: <FaPills className="text-purple-500 text-lg" />,
      Lab: <FaFlask className="text-yellow-500 text-lg" />,
      Radio: <FaXRay className="text-indigo-500 text-lg" />,
      Midwife: <FaBaby className="text-pink-500 text-lg" />,
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
        const res = await axios.post(`${API_URL}/upload`, formData, {
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
      setSendReportAttachments(prev => [...prev, ...uploadedFiles]);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
  };

  const removeAttachment = (index, isReply = false) => {
    if (isReply) {
      setConversationAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setSendReportAttachments(prev => prev.filter((_, i) => i !== index));
      setSendReportAttachmentPreview(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSendReportAttachmentChange = (e) => {
    const files = Array.from(e.target.files);
    setSendReportAttachments(prev => [...prev, ...files]);
    
    const previews = files.map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB',
      type: file.type
    }));
    setSendReportAttachmentPreview(prev => [...prev, ...previews]);
  };

  const removeSendReportAttachment = (index) => {
    setSendReportAttachments(prev => prev.filter((_, i) => i !== index));
    setSendReportAttachmentPreview(prev => prev.filter((_, i) => i !== index));
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
      const response = await axios.get(`${API_URL}/download/${encodeURIComponent(fileKey)}`, {
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

  // ==================== DATA FETCHING ====================
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [statsRes, inboxRes, outboxRes, staffRes, notifRes] = await Promise.all([
        axios.get(`${API_URL}/hospital/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/hospital/reports/inbox`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/hospital/reports/outbox`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/hospital/staff`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/hospital/notifications?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (inboxRes.data.success) { 
        setInbox(inboxRes.data.reports || []); 
        setUnreadCount(inboxRes.data.unreadCount || 0);
        setUrgentCount(inboxRes.data.urgentUnreadCount || 0);
      }
      if (outboxRes.data.success) setOutbox(outboxRes.data.reports || []);
      if (staffRes.data.success) setStaff(staffRes.data.staff || []);
      if (notifRes.data.success) setNotifications(notifRes.data.notifications || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      if (error.response?.status === 401) { localStorage.removeItem('token'); navigate('/login'); }
    } finally { setLoading(false); }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/hospital/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        const hospital = res.data.hospital;
        setProfileData({
          first_name: hospital.first_name || '', middle_name: hospital.middle_name || '', last_name: hospital.last_name || '',
          gender: hospital.gender || '', age: hospital.age || '', phone: hospital.phone || '', email: hospital.email || '',
          hospital_name: hospital.hospital_name || '', service_type: hospital.service_type || '', hospital_type: hospital.hospital_type || '',
          kebele_name: hospital.kebele_name || '', address: hospital.address || '', website: hospital.website || ''
        });
      }
    } catch (error) { console.error('Error fetching profile:', error); }
  };

  const fetchRecipients = async () => {
    try {
      const token = localStorage.getItem('token');
      const [staffRes, kebeleRes] = await Promise.all([
        axios.get(`${API_URL}/hospital/staff/all`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/hospital/kebele-admin`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (staffRes.data.success) setRecipients(staffRes.data.staff || []);
      if (kebeleRes.data.success) setKebeleAdmin(kebeleRes.data.kebele_admin);
    } catch (error) { console.error('Error fetching recipients:', error); }
  };

  // ==================== CONVERSATION THREAD ====================
  const fetchConversationThread = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/hospital/reports/thread/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setConversationThread(res.data.thread);
        setCurrentConversationId(reportId);
        setShowConversationView(true);
        setShowReportDetailModal(false);
        setShowReportAnalytics(false);
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
      
      const res = await axios.post(`${API_URL}/hospital/reports/${currentConversationId}/reply`, 
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

  // ==================== REPORT ANALYTICS ====================
  const fetchReportTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/hospital/reports/types`, {
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
      const res = await axios.get(`${API_URL}/hospital/reports/staff-list?department=${department || 'all'}`, {
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
      let url = `${API_URL}/hospital/reports/summary?type=${selectedReportType}`;
      
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
    if (!validateStaffForm()) {
      alert('Please fix the validation errors');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const submitData = { ...staffFormData };
      if (!needsWardSelection) delete submitData.ward;
      
      const res = await axios.post(`${API_URL}/hospital/staff`, submitData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.data.success) {
        setStaffFormData({ first_name: '', middle_name: '', last_name: '', gender: 'Male', age: '', email: '', password: '', phone: '', department: 'Doctor', ward: '' });
        setStaffFormErrors({});
        setShowStaffModal(false);
        fetchDashboardData();
        alert('Staff member created successfully!');
      }
    } catch (error) { 
      alert(error.response?.data?.message || 'Error creating staff'); 
    }
  };

  const viewStaffDetails = (staffMember) => { 
    setSelectedStaff(staffMember); 
    setShowStaffDetailModal(true); 
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
      
      // ✅ Add attachments to form data
      sendReportAttachments.forEach(file => {
        formData.append('attachments', file);
      });
      
      const res = await axios.post(`${API_URL}/hospital/reports/send`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (res.data.success) {
        alert('Report sent successfully!');
        setShowReportModal(false);
        setReportFormData({ title: '', body: '', priority: 'medium', recipient_type: '', recipient_id: '' });
        setSendReportAttachments([]);
        setSendReportAttachmentPreview([]);
        fetchDashboardData();
      }
    } catch (error) { 
      console.error('Error sending report:', error);
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
      const res = await axios.post(`${API_URL}/hospital/reports/${selectedReport.id}/reply`, 
        { body: replyText }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
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

  // ==================== PROFILE MANAGEMENT ====================
  const updateProfile = async () => {
    if (!validateProfile()) {
      alert('Please fix the validation errors');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/hospital/profile`, profileData, { 
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
      const res = await axios.put(`${API_URL}/hospital/change-password`, 
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
      await axios.put(`${API_URL}/hospital/notifications/${id}/read`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      fetchDashboardData();
    } catch (error) { console.error('Error marking notification:', error); }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/hospital/notifications/read-all`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      fetchDashboardData();
    } catch (error) { console.error('Error marking all as read:', error); }
  };

  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/hospital/reports/${reportId}/read`, {}, { 
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
const viewReportDetails = async (report) => {
  try {
    console.log("📄 Opening report:", report.id);
    
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/regional/reports/${report.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      const fullReport = response.data.report;
      
      let attachments = fullReport.attachments || [];
      if (typeof attachments === 'string') {
        try {
          attachments = JSON.parse(attachments);
          console.log("📎 Parsed attachments:", attachments.length);
        } catch(e) {
          attachments = [];
        }
      }
      
      const formattedAttachments = attachments.map(att => ({
        filename: att.filename || att.key?.split('/').pop() || 'file',
        originalName: att.originalName || att.filename || 'Unknown',
        mimeType: att.mimeType || att.mimetype || 'application/octet-stream',
        size: att.size || 0,
        url: att.url || null,
        key: att.key || att.filename,
        expiresAt: att.expiresAt || null
      }));
      
      setSelectedReport({ 
        ...fullReport, 
        attachments: formattedAttachments,
        attachments_count: formattedAttachments.length 
      });
      setShowReportDetailModal(true);
      
      if (!report.is_opened) {
        await markReportAsRead(report.id);
      }
    } else {
      alert("Could not load report details");
    }
  } catch (error) {
    console.error("Error fetching report details:", error);
    alert("Error loading report details");
  }
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

  const getPriorityIcon = (priority) => {
    const icons = { low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' };
    return icons[priority] || '🟡';
  };

  useEffect(() => { 
    fetchDashboardData(); 
    fetchProfile(); 
  }, []);

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
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-blue-100"
              >
                {realTimeNotification.type === 'reply' ? '💬' : '📬'}
              </motion.div>
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-gray-900">{realTimeNotification.title}</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 text-lg">Loading Dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 flex">
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

      {/* Sidebar - Blue/Black Color */}
      <motion.div 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`bg-gradient-to-b from-gray-900 to-blue-900 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} shadow-2xl relative z-10`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <FaHospital className="text-white text-sm" />
                </div>
                <span className="font-bold text-base">Hospital Admin</span>
              </motion.div>
            )}
            {sidebarCollapsed && <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto"><FaHospital className="text-white text-sm" /></div>}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
              className="p-2 hover:bg-blue-800 rounded-lg transition"
            >
              {sidebarCollapsed ? <FaChevronRight className="text-lg" /> : <FaChevronLeft className="text-lg" />}
            </button>
          </div>
          <nav className="space-y-1">
            <button 
              onClick={() => { setActiveTab('dashboard'); setShowReportAnalytics(false); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition ${activeTab === 'dashboard' && !showReportAnalytics && !showConversationView ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-blue-800'}`}
            >
              <FaHome className="text-lg" /> {!sidebarCollapsed && <span className="text-sm font-medium">Dashboard</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('staff'); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition ${activeTab === 'staff' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-blue-800'}`}
            >
              <FaUsers className="text-lg" /> {!sidebarCollapsed && <span className="text-sm font-medium">Staff Management</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('reports'); openReportAnalytics(); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition ${activeTab === 'reports' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-blue-800'}`}
            >
              <FaChartBar className="text-lg" /> {!sidebarCollapsed && <span className="text-sm font-medium">Reports</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('inbox'); fetchDashboardData(); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition relative ${activeTab === 'inbox' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-blue-800'}`}
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
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition ${activeTab === 'outbox' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-blue-800'}`}
            >
              <FaPaperPlane className="text-lg" /> {!sidebarCollapsed && <span className="text-sm font-medium">Sent Reports</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('profile'); setShowConversationView(false); }} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition ${activeTab === 'profile' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg' : 'hover:bg-blue-800'}`}
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
                {showConversationView && (
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => { setShowConversationView(false); setConversationThread([]); setCurrentConversationId(null); }}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition mr-4"
                  >
                    <FaArrowLeft className="text-xl" />
                    <span className="text-sm font-medium">Back</span>
                  </motion.button>
                )}
                <motion.h1 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"
                >
                  {showConversationView ? 'Conversation Thread' : (
                    activeTab === 'dashboard' && !showReportAnalytics ? 'Hospital Dashboard' :
                    activeTab === 'dashboard' && showReportAnalytics ? 'Reports & Analytics' :
                    activeTab === 'staff' ? 'Staff Management' :
                    activeTab === 'reports' ? 'Reports & Analytics' :
                    activeTab === 'inbox' ? 'Inbox' :
                    activeTab === 'outbox' ? 'Sent Reports' :
                    activeTab === 'profile' ? 'My Profile' : 'Hospital Dashboard'
                  )}
                </motion.h1>
                <motion.p 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-gray-500 mt-1"
                >
                  Welcome back, <span className="font-semibold text-gray-700">{profileData.first_name || user?.full_name || 'Admin'}</span> | {profileData.hospital_name}
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
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-cyan-50">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${!notif.is_read ? 'bg-blue-50' : ''} ${notif.priority === 'urgent' ? 'border-l-4 border-red-500' : ''}`} 
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
          {activeTab === 'dashboard' && !showReportAnalytics && !showConversationView && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"
                  >
                    <FaHospital className="text-3xl" />
                  </motion.div>
                  <div>
                    <motion.h2 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl font-bold"
                    >
                      Welcome to Hospital Dashboard!
                    </motion.h2>
                    <motion.p 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-blue-100 text-sm"
                    >
                      Manage staff, track reports, and monitor hospital activities
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
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex justify-between items-center">
                <button 
                  onClick={() => { setShowConversationView(false); setConversationThread([]); setCurrentConversationId(null); }} 
                  className="text-white hover:text-blue-200 flex items-center gap-2 transition"
                >
                  <FaArrowLeft className="text-lg" /> Back
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
                    initial={{ opacity: 0, x: msg.sender_type === 'hospital' ? 50 : -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex ${msg.sender_type === 'hospital' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${msg.sender_type === 'hospital' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' : 'bg-white border shadow-sm'} rounded-2xl p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium">{msg.sender_name}</span>
                        {msg.sender_department && <span className="text-xs opacity-70">{msg.sender_department}</span>}
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
                    className="flex-1 px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 resize-none" 
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
                      className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50"
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

          {/* Reports & Analytics View */}
          {activeTab === 'reports' && !showConversationView && (
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6"
              >
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaChartLine className="text-blue-600" /> Generate Report
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                    <select 
                      value={selectedReportType} 
                      onChange={(e) => { setSelectedReportType(e.target.value); setReportData(null); setSelectedDepartment(''); setSelectedStaffId(''); setSelectedWard(''); }}
                      className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Department</option>
                          {reportTypes?.by_department?.departments?.map(dept => (
                            <option key={dept} value={dept}>{dept === 'Card_Office' ? 'Card Office' : dept}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ward (Optional)</label>
                        <select 
                          value={selectedWard} 
                          onChange={(e) => { setSelectedWard(e.target.value); setReportData(null); }} 
                          className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        >
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
                          className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Department</option>
                          {reportTypes?.by_staff?.departments?.map(dept => (
                            <option key={dept} value={dept}>{dept === 'Card_Office' ? 'Card Office' : dept}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
                        <select 
                          value={selectedStaffId} 
                          onChange={(e) => { setSelectedStaffId(e.target.value); setReportData(null); }} 
                          className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        >
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
                      <select 
                        value={selectedWard} 
                        onChange={(e) => { setSelectedWard(e.target.value); setReportData(null); }} 
                        className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Ward</option>
                        <option value="OPD">OPD</option>
                        <option value="EME">EME</option>
                        <option value="ANC">ANC</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="flex items-end">
                    <button 
                      onClick={fetchReportSummary} 
                      className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg font-medium flex items-center justify-center gap-2 transition"
                    >
                      <FaSearch /> Generate
                    </button>
                  </div>
                </div>
              </motion.div>
              
              {/* Report Results Display */}
              {loadingReport ? (
                <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                  <FaSpinner className="animate-spin text-3xl text-blue-600 mx-auto mb-3" />
                  <p className="text-gray-600">Loading report data...</p>
                </div>
              ) : reportData && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-xl p-6"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {selectedReportType === 'general' && 'General Hospital Overview'}
                    {selectedReportType === 'by_department' && `Department Report: ${selectedDepartment}`}
                    {selectedReportType === 'by_staff' && 'Staff Performance Report'}
                    {selectedReportType === 'by_ward' && `Ward Report: ${selectedWard}`}
                  </h3>
                  
                  {selectedReportType === 'general' && reportData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-blue-600">{reportData.totalPatients || 0}</p>
                          <p className="text-sm text-gray-600">Total Patients</p>
                        </div>
                        <div className="bg-cyan-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-cyan-600">{reportData.activeStaff || 0}</p>
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
                            <div className="flex justify-between"><span>Male:</span><span className="font-bold text-blue-600">{reportData.patientsByGender?.male || 0}</span></div>
                            <div className="flex justify-between"><span>Female:</span><span className="font-bold text-pink-600">{reportData.patientsByGender?.female || 0}</span></div>
                          </div>
                        </div>
                        <div className="border rounded-xl p-4">
                          <h4 className="font-semibold text-gray-800 mb-3">Patients by Age Group</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between"><span>Pediatric (&lt;18):</span><span className="font-bold text-teal-600">{reportData.patientsByAgeGroup?.pediatric || 0}</span></div>
                            <div className="flex justify-between"><span>Adult (18-64):</span><span className="font-bold text-green-600">{reportData.patientsByAgeGroup?.adult || 0}</span></div>
                            <div className="flex justify-between"><span>Geriatric (65+):</span><span className="font-bold text-orange-600">{reportData.patientsByAgeGroup?.geriatric || 0}</span></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border rounded-xl p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Staff by Department</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(reportData.staffByDepartment || {}).map(([dept, count]) => (
                            <div key={dept} className="flex justify-between bg-gray-50 rounded-lg p-2">
                              <span className="text-sm">{dept === 'Card_Office' ? 'Card Office' : dept}:</span>
                              <span className="font-bold text-blue-600">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(selectedReportType === 'by_department' || selectedReportType === 'by_staff') && reportData && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p><strong>Total Staff:</strong> <span className="font-bold text-blue-600">{reportData.totalStaff || 0}</span></p>
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
                                <tr key={staffMember.id} className="border-t hover:bg-gray-50">
                                  <td className="p-3 font-medium">{staffMember.name}</td>
                                  <td className="p-3 text-gray-600">{staffMember.email}</td>
                                  <td className="p-3">{staffMember.ward || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* Dashboard Tab - Stats Cards */}
          {activeTab === 'dashboard' && !showReportAnalytics && !showConversationView && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                {[
                  { label: 'Inbox', value: stats?.inbox || 0, color: 'blue', icon: <FaInbox /> },
                  { label: 'Sent Reports', value: stats?.outbox || 0, color: 'cyan', icon: <FaPaperPlane /> },
                  { label: 'Total Staff', value: stats?.totalStaff || 0, color: 'purple', icon: <FaUsers /> },
                  { label: 'Doctors', value: stats?.doctorCount || 0, color: 'teal', icon: <FaUserMd /> },
                  { label: 'Nurses', value: stats?.nurseCount || 0, color: 'pink', icon: <FaUserNurse /> }
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
                    className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FaPaperPlane /> New Report
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowStaffModal(true)} 
                    className="p-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FaPlus /> Add Staff
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setActiveTab('reports'); openReportAnalytics(); }} 
                    className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FaChartBar /> View Reports
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('inbox')} 
                    className="p-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FaInbox /> View Inbox
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && !showConversationView && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaUsers className="text-blue-600" /> Staff Management
                </h2>
                <button onClick={() => setShowStaffModal(true)} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center gap-2">
                  <FaPlus /> Add Staff
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.map((member, idx) => (
                  <motion.div 
                    key={member.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 cursor-pointer hover:shadow-lg transition" 
                    onClick={() => viewStaffDetails(member)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm">
                        {getDepartmentIcon(member.department)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm">{member.full_name}</h3>
                        <p className="text-xs text-blue-600">{member.department === 'Card_Office' ? 'Card Office' : member.department}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 truncate">{member.email}</div>
                    <div className="mt-2 flex justify-between text-xs">
                      <span>{member.gender}, {member.age} yrs</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {member.status}
                      </span>
                    </div>
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
                  <FaInbox className="text-blue-600" /> Inbox
                </h2>
                <button onClick={() => { setShowReportModal(true); fetchRecipients(); }} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium flex items-center gap-2">
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
                    className={`border rounded-xl p-5 cursor-pointer hover:shadow-md transition ${!report.is_opened ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`} 
                    onClick={() => viewReportDetails(report)}
                  >
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        {!report.is_opened ? <FaEnvelope className="text-blue-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
                        <h3 className="font-semibold text-gray-800 text-lg">{report.title}</h3>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${getPriorityBadge(report.priority)}`}>
                        {getPriorityIcon(report.priority)} {report.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">{report.body}</p>
                    {report.attachments && report.attachments.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <FaPaperclip /> {report.attachments.length} attachment(s)
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-700 font-bold">
                          {report.sender_full_name?.charAt(0) || 'D'}
                        </div>
                        <p className="text-xs text-gray-600">{report.sender_full_name}</p>
                      </div>
                      <p className="text-xs text-gray-400">{new Date(report.sent_at).toLocaleString()}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); fetchConversationThread(report.id); }} 
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition flex items-center gap-1"
                      >
                        <FaComment /> Open Chat
                      </button>
                      {report.sender_type === 'staff' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); fetchConversationThread(report.id); }} 
                          className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-xs hover:bg-cyan-600 transition flex items-center gap-1"
                        >
                          <FaReply /> Reply
                        </button>
                      )}
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
                <FaPaperPlane className="text-blue-600" /> Sent Reports
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
                      <div className="flex items-center gap-3">
                        <FaPaperPlane className="text-gray-400" />
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {report.is_reply ? `Reply to: ${report.title}` : report.title}
                        </h3>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${getPriorityBadge(report.priority)}`}>
                        {getPriorityIcon(report.priority)} {report.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">{report.body}</p>
                    {report.attachments && report.attachments.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <FaPaperclip /> {report.attachments.length} attachment(s)
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-xs text-gray-600">To: {report.display_recipient}</p>
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
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-10">
                <div className="flex items-center gap-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="relative"
                  >
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                      <FaUserCircle className="text-blue-600 text-6xl" />
                    </div>
                  </motion.div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold">{profileData.first_name} {profileData.last_name}</h2>
                    <p className="text-blue-100 flex items-center gap-2">
                      <FaHospital /> {profileData.hospital_name}
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs ml-2">{profileData.service_type}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                  <h3 className="text-lg font-bold text-gray-800">Administrator Information</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
                      <FaEdit /> Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => { setIsEditingProfile(false); setProfileErrors({}); }} className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
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
                    <h4 className="font-semibold text-blue-600 mb-4"><FaUserCircle className="inline mr-2" /> Personal Info</h4>
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
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${profileErrors.first_name ? 'border-red-500' : 'border-gray-300'}`}
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
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${profileErrors.last_name ? 'border-red-500' : 'border-gray-300'}`}
                            /> : 
                            <p className="font-medium text-gray-800">{profileData.last_name || 'Not set'}</p>
                          }
                          {profileErrors.last_name && <p className="text-red-500 text-xs mt-1">{profileErrors.last_name}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Gender</label>
                          {isEditingProfile ? 
                            <select 
                              value={profileData.gender} 
                              onChange={(e) => setProfileData({...profileData, gender: e.target.value})}
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${profileErrors.age ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="18-100"
                            /> : 
                            <p className="font-medium text-gray-800">{profileData.age || 'Not set'} years</p>
                          }
                          {profileErrors.age && <p className="text-red-500 text-xs mt-1">{profileErrors.age}</p>}
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
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${profileErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="10-14 digits"
                          /> : 
                          <p>{profileData.phone || 'Not set'}</p>
                        }
                        {profileErrors.phone && <p className="text-red-500 text-xs mt-1">{profileErrors.phone}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold text-blue-600 mb-4"><FaHospital className="inline mr-2" /> Hospital Info</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Hospital Name</label>
                        {isEditingProfile ? 
                          <input type="text" value={profileData.hospital_name} onChange={(e) => setProfileData({...profileData, hospital_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" /> : 
                          <p className="font-medium text-gray-800">{profileData.hospital_name || 'Not set'}</p>
                        }
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Service Type</label>
                          {isEditingProfile ? 
                            <select value={profileData.service_type} onChange={(e) => setProfileData({...profileData, service_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                              <option value="Private">Private</option>
                              <option value="Public">Public</option>
                            </select> : 
                            <p>{profileData.service_type || 'Not set'}</p>
                          }
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Hospital Type</label>
                          {isEditingProfile ? 
                            <select value={profileData.hospital_type} onChange={(e) => setProfileData({...profileData, hospital_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                              <option value="General">General</option>
                              <option value="Specialized">Specialized</option>
                              <option value="Primary">Primary</option>
                            </select> : 
                            <p>{profileData.hospital_type || 'Not set'}</p>
                          }
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Kebele</label>
                        <p className="font-medium text-gray-800">{profileData.kebele_name || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold text-blue-600 mb-4"><FaKey className="inline mr-2" /> Account Settings</h4>
                    <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition">
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

      {/* Add Staff Modal with Validation */}
      <AnimatePresence>
        {showStaffModal && (
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
                <h2 className="text-xl font-bold text-gray-800">Add Hospital Staff</h2>
                <button onClick={() => setShowStaffModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
              </div>
              <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input 
                      type="text" 
                      name="first_name"
                      placeholder="First name" 
                      value={staffFormData.first_name} 
                      onChange={handleStaffInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${staffFormErrors.first_name ? 'border-red-500' : 'border-gray-300'}`}
                      required 
                    />
                    {staffFormErrors.first_name && <p className="text-red-500 text-xs mt-1">{staffFormErrors.first_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input 
                      type="text" 
                      name="middle_name"
                      placeholder="Middle name" 
                      value={staffFormData.middle_name} 
                      onChange={handleStaffInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${staffFormErrors.middle_name ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {staffFormErrors.middle_name && <p className="text-red-500 text-xs mt-1">{staffFormErrors.middle_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input 
                      type="text" 
                      name="last_name"
                      placeholder="Last name" 
                      value={staffFormData.last_name} 
                      onChange={handleStaffInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${staffFormErrors.last_name ? 'border-red-500' : 'border-gray-300'}`}
                      required 
                    />
                    {staffFormErrors.last_name && <p className="text-red-500 text-xs mt-1">{staffFormErrors.last_name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                    <select 
                      name="gender"
                      value={staffFormData.gender} 
                      onChange={handleStaffInputChange}
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
                      value={staffFormData.age} 
                      onChange={handleStaffInputChange}
                      min="18"
                      max="100"
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${staffFormErrors.age ? 'border-red-500' : 'border-gray-300'}`}
                      required 
                    />
                    {staffFormErrors.age && <p className="text-red-500 text-xs mt-1">{staffFormErrors.age}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input 
                      type="email" 
                      name="email"
                      placeholder="username@gmail.com" 
                      value={staffFormData.email} 
                      onChange={handleStaffInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${staffFormErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                      required 
                    />
                    {staffFormErrors.email && <p className="text-red-500 text-xs mt-1">{staffFormErrors.email}</p>}
                    <p className="text-xs text-blue-500 mt-1">⚠️ Only Gmail accounts are allowed (must end with @gmail.com)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                    <input 
                      type="tel" 
                      name="phone"
                      placeholder="0912345678 or +251912345678" 
                      value={staffFormData.phone} 
                      onChange={handleStaffInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${staffFormErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {staffFormErrors.phone && <p className="text-red-500 text-xs mt-1">{staffFormErrors.phone}</p>}
                    <p className="text-xs text-gray-400 mt-1">10-14 digits only</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                    <select 
                      name="department"
                      value={staffFormData.department} 
                      onChange={handleStaffInputChange}
                      className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {departments.map(dept => <option key={dept} value={dept}>{dept === 'Card_Office' ? 'Card Office' : dept}</option>)}
                    </select>
                  </div>
                  
                  {needsWardSelection && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ward * (Required)</label>
                      <select 
                        name="ward"
                        value={staffFormData.ward} 
                        onChange={handleStaffInputChange}
                        className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Ward</option>
                        {wards.map(ward => <option key={ward} value={ward}>{ward}</option>)}
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password * (min 6 chars)</label>
                    <input 
                      type="password" 
                      name="password"
                      placeholder="Password" 
                      value={staffFormData.password} 
                      onChange={handleStaffInputChange}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${staffFormErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                      required 
                      minLength="6"
                    />
                    {staffFormErrors.password && <p className="text-red-500 text-xs mt-1">{staffFormErrors.password}</p>}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowStaffModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition">
                    Create Staff
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800"><FaPaperPlane className="inline mr-2 text-blue-500" /> Send New Report</h2>
              <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <form onSubmit={handleSendReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Type</label>
                <div className="flex gap-4">
                  {kebeleAdmin && (
                    <label className="flex items-center gap-2">
                      <input type="radio" value="kebele" checked={reportFormData.recipient_type === 'kebele'} onChange={(e) => setReportFormData({...reportFormData, recipient_type: e.target.value, recipient_id: kebeleAdmin.id})} />
                      <FaGlobe className="text-red-500" /> Kebele Admin ({kebeleAdmin?.kebele_name})
                    </label>
                  )}
                  <label className="flex items-center gap-2">
                    <input type="radio" value="staff" checked={reportFormData.recipient_type === 'staff'} onChange={(e) => setReportFormData({...reportFormData, recipient_type: e.target.value, recipient_id: ''})} />
                    <FaUsers className="text-purple-500" /> Hospital Staff
                  </label>
                </div>
              </div>
              
              {reportFormData.recipient_type === 'staff' && (
                <select 
                  value={reportFormData.recipient_id} 
                  onChange={(e) => setReportFormData({...reportFormData, recipient_id: e.target.value})} 
                  className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500" 
                  required
                >
                  <option value="">Select Staff Member</option>
                  {recipients.map(s => <option key={s.id} value={s.id}>{s.full_name} - {s.department}</option>)}
                </select>
              )}
              
              <select 
                value={reportFormData.priority} 
                onChange={(e) => setReportFormData({...reportFormData, priority: e.target.value})} 
                className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500" 
                required 
              />
              
              <textarea 
                placeholder="Message" 
                value={reportFormData.body} 
                onChange={(e) => setReportFormData({...reportFormData, body: e.target.value})} 
                rows="5" 
                className="w-full px-4 py-3 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500" 
                required 
              />

              {/* ✅ File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaPaperclip className="inline mr-1" /> Attachments
                </label>
                <input
                  type="file"
                  ref={sendReportFileInputRef}
                  onChange={handleSendReportAttachmentChange}
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  className="w-full p-2 border border-gray-300 rounded-xl text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                
                {/* Attachment previews */}
                {sendReportAttachmentPreview.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-500">Selected files ({sendReportAttachmentPreview.length}):</p>
                    {sendReportAttachmentPreview.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          {file.type?.startsWith('image/') ? (
                            <span className="text-blue-500">🖼️</span>
                          ) : file.type === 'application/pdf' ? (
                            <span className="text-red-500">📄</span>
                          ) : (
                            <span className="text-gray-500">📎</span>
                          )}
                          <span className="text-sm text-gray-600 truncate max-w-[200px]">{file.name}</span>
                          <span className="text-xs text-gray-400">({file.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSendReportAttachment(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTimes />
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

      {/* Staff Details Modal */}
      {showStaffDetailModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Staff Details</h2>
              <button onClick={() => { setShowStaffDetailModal(false); setSelectedStaff(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl">
                {getDepartmentIcon(selectedStaff.department)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedStaff.full_name}</h3>
                <p className="text-blue-600 text-sm">{selectedStaff.department === 'Card_Office' ? 'Card Office' : selectedStaff.department}</p>
                {selectedStaff.ward && <p className="text-xs text-gray-500">Ward: {selectedStaff.ward}</p>}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500 text-xs">First Name</p><p className="font-medium text-gray-800">{selectedStaff.first_name}</p></div>
                <div><p className="text-gray-500 text-xs">Last Name</p><p className="font-medium text-gray-800">{selectedStaff.last_name}</p></div>
                <div><p className="text-gray-500 text-xs">Gender</p><p className="font-medium text-gray-800">{selectedStaff.gender}</p></div>
                <div><p className="text-gray-500 text-xs">Age</p><p className="font-medium text-gray-800">{selectedStaff.age} years</p></div>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-2">Contact</h4>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FaEnvelopeIcon className="text-gray-400 text-xs" /> {selectedStaff.email}
              </div>
              {selectedStaff.phone && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <FaPhone className="text-gray-400 text-xs" /> {selectedStaff.phone}
                </div>
              )}
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
                className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500" 
              />
              <input 
                type="password" 
                placeholder="New Password (min 6 characters)" 
                value={passwordData.new_password} 
                onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} 
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${passwordErrors.new_password ? 'border-red-500' : 'border-gray-300'}`}
              />
              {passwordErrors.new_password && <p className="text-red-500 text-xs">{passwordErrors.new_password}</p>}
              <input 
                type="password" 
                placeholder="Confirm New Password" 
                value={passwordData.confirm_password} 
                onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} 
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${passwordErrors.confirm_password ? 'border-red-500' : 'border-gray-300'}`}
              />
              {passwordErrors.confirm_password && <p className="text-red-500 text-xs">{passwordErrors.confirm_password}</p>}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowPasswordModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button onClick={changePassword} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition">Change Password</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal with Attachment Display */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                {!selectedReport.is_opened ? <FaEnvelope className="text-blue-500" /> : <FaEnvelopeOpen className="text-gray-400" />}
                <h2 className="text-xl font-bold text-gray-800">{selectedReport.title}</h2>
              </div>
              <button onClick={() => setShowReportDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-gray-500">From</p>
                  <p className="font-semibold text-gray-800">{selectedReport.sender_full_name}</p>
                  {selectedReport.sender_department && (
                    <p className="text-xs text-gray-400">{selectedReport.sender_department}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Priority</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(selectedReport.priority)}`}>
                    {getPriorityIcon(selectedReport.priority)} {selectedReport.priority}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Date Received</p>
                <p className="text-sm text-gray-700">{new Date(selectedReport.sent_at).toLocaleString()}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">Message</p>
                <p className="whitespace-pre-wrap text-gray-800">{selectedReport.body}</p>
              </div>

              {/* ✅ Attachment Display Section */}
              {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <FaPaperclip className="text-gray-500" /> 
                    Attachments ({selectedReport.attachments.length})
                  </p>
                  <div className="space-y-2">
                    {selectedReport.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:shadow-sm transition">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {att.mimeType?.startsWith('image/') ? (
                            <img 
                              src={att.url} 
                              alt={att.name} 
                              className="w-10 h-10 object-cover rounded border border-gray-200" 
                            />
                          ) : att.mimeType === 'application/pdf' ? (
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                              <FaFilePdf className="text-red-600 text-xl" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <FaFileAlt className="text-gray-600 text-xl" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{att.name}</p>
                            <p className="text-xs text-gray-400">
                              {att.size ? `${(att.size / 1024).toFixed(1)} KB` : 'Size unknown'}
                            </p>
                          </div>
                        </div>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center gap-1 text-sm"
                          download={att.name}
                        >
                          <FaDownload size={12} /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => { setShowReportDetailModal(false); fetchConversationThread(selectedReport.id); }} 
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <FaComment /> Open Chat
                </button>
                <button 
                  onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} 
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  <FaReply /> Reply
                </button>
                <button 
                  onClick={() => setShowReportDetailModal(false)} 
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaReply className="text-blue-500" /> Reply to Report
              </h2>
              <button onClick={() => { setShowReplyModal(false); setReplyText(''); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Original Report</p>
              <p className="text-sm font-medium text-gray-800">{selectedReport.title}</p>
              <p className="text-xs text-gray-400 mt-1">From: {selectedReport.sender_full_name}</p>
            </div>
            <textarea 
              value={replyText} 
              onChange={(e) => setReplyText(e.target.value)} 
              rows="5" 
              placeholder="Type your reply here..." 
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none" 
            />
            <div className="flex gap-3 pt-4 mt-2">
              <button onClick={() => { setShowReplyModal(false); setReplyText(''); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                Cancel
              </button>
              <button 
                onClick={handleSendReply} 
                disabled={loading} 
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                {loading ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;