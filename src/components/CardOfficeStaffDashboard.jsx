// frontend/src/components/CardOfficeDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaIdCard, FaUserPlus, FaSearch, FaHistory, FaChartBar,
  FaCalendarAlt, FaSync, FaUserCircle, FaSignOutAlt, 
  FaChevronLeft, FaChevronRight, FaInbox, FaPaperPlane, 
  FaEnvelope, FaEnvelopeOpen, FaReply, FaKey, FaSave, 
  FaSpinner, FaCheck, FaTextHeight, FaUndo,
  FaHeartbeat, FaEdit as FaEditIcon, FaPaperclip,
  FaCreditCard, FaClock, FaEye, FaTimes, FaEdit,
  FaTrash, FaHospitalUser, FaUserMd, FaChartLine, FaVial,
  FaFileAlt, FaUserCheck, FaUserClock, FaBell, FaSearch as FaSearchIcon
} from 'react-icons/fa';
import ScheduleViewer from '../components/ScheduleViewer';

// At the top of CardOfficeDashboard component, add:

const CardOfficeDashboard = ({ user, onLogout }) => {
  // ==================== HELPER: Get Hospital ID ====================
  
const getHospitalId = () => {
  console.log('=== USER OBJECT DEBUG ===');
  console.log('Full user object:', user);
  console.log('user?.hospital_id:', user?.hospital_id);
  console.log('user?.hospitalId:', user?.hospitalId);
  console.log('user?.hospital?.id:', user?.hospital?.id);
  console.log('localStorage hospital_id:', localStorage.getItem('hospital_id'));
  
  // Try multiple sources
  let id = user?.hospital_id || 
          user?.hospitalId || 
          localStorage.getItem('hospital_id') || 
          (user?.hospital ? user.hospital.id : null);
  
  // If still null, try to get from nested user object in localStorage
  if (!id) {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        id = parsed?.hospital_id || parsed?.hospitalId || (parsed?.hospital ? parsed.hospital.id : null);
        console.log('Found in stored user:', id);
      }
    } catch (e) {}
  }
  
  // If still null, try to decode from JWT token
  if (!id) {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        id = payload?.hospital_id || payload?.hospitalId;
        console.log('Found in token payload:', id);
      }
    } catch (e) {}
  }
  
  console.log('Final hospital ID:', id);
  return id;
};
  // ==================== STATE MANAGEMENT ====================
  const [activeTab, setActiveTab] = useState('register');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [realTimeNotification, setRealTimeNotification] = useState(null);
  const [showScheduleView, setShowScheduleView] = useState(false);
  
  // ==================== TEXT SIZE STATE ====================
  const [textSize, setTextSize] = useState('xlarge');
  const [showTextSizeMenu, setShowTextSizeMenu] = useState(false);
  
  // ==================== LOGOUT CONFIRMATION ====================
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // ==================== HISTORY FOR BACK NAVIGATION ====================
  const [tabHistory, setTabHistory] = useState(['register']);
  
  // ==================== REGISTRATION STATES ====================
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    age: '',
    gender: 'Male',
    phone: ''
  });
  const [formErrors, setFormErrors] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    age: '',
    phone: ''
  });
  
  // ==================== SEARCH STATES ====================
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // ==================== PATIENT STATES ====================
  const [recentPatients, setRecentPatients] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [stats, setStats] = useState({
    today: 0,
    inTriage: 0,
    active: 0,
    total: 0
  });
  
  // ==================== REPORT STATES ====================
  const [reportsInbox, setReportsInbox] = useState([]);
  const [reportsOutbox, setReportsOutbox] = useState([]);
  const [unreadReportsCount, setUnreadReportsCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [showSendReportModal, setShowSendReportModal] = useState(false);
  const [hospitalAdmins, setHospitalAdmins] = useState([]);
  const [sendReportForm, setSendReportForm] = useState({
    recipient_type: 'hospital',
    recipient_id: '',
    title: '',
    body: '',
    priority: 'medium',
    attachments: []
  });
  const [attachmentPreview, setAttachmentPreview] = useState([]);
  const fileInputRef = useRef(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  
  // ==================== PROFILE STATES ====================
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    age: '',
    phone: '',
    email: '',
    department: 'Card Office'
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // ==================== TEXT SIZE STYLES ====================
  const getTextSizeClasses = () => {
    switch(textSize) {
      case 'small': return { base: 'text-sm', heading: 'text-base', title: 'text-lg', large: 'text-sm' };
      case 'normal': return { base: 'text-base', heading: 'text-lg', title: 'text-xl', large: 'text-base' };
      case 'large': return { base: 'text-lg', heading: 'text-xl', title: 'text-2xl', large: 'text-lg' };
      case 'xlarge': return { base: 'text-xl', heading: 'text-2xl', title: 'text-3xl', large: 'text-xl' };
      default: return { base: 'text-xl', heading: 'text-2xl', title: 'text-3xl', large: 'text-xl' };
    }
  };
  
  const textSizeClasses = getTextSizeClasses();
  
  useEffect(() => {
    document.documentElement.style.fontSize = 
      textSize === 'small' ? '13px' : 
      textSize === 'normal' ? '15px' : 
      textSize === 'large' ? '17px' : '19px';
  }, [textSize]);
  
  // ==================== BACK NAVIGATION ====================
  const handleTabChange = (tab, isSchedule = false) => {
    if (tab !== activeTab || isSchedule !== showScheduleView) {
      setTabHistory(prev => [...prev, activeTab]);
      setActiveTab(tab);
      setShowScheduleView(isSchedule);
    }
  };
  
  const handleGoBack = () => {
    if (tabHistory.length > 0) {
      const previousTab = tabHistory[tabHistory.length - 1];
      setTabHistory(prev => prev.slice(0, -1));
      setActiveTab(previousTab);
      setShowScheduleView(previousTab === 'schedule');
    }
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5001';
  const socket = useRef(null);
  const navigate = useNavigate();

  // ==================== HELPER FUNCTIONS ====================
  const formatFullName = (staffMember) => {
    if (!staffMember) return 'Unknown';
    const firstName = staffMember.first_name || '';
    const middleName = staffMember.middle_name ? ` ${staffMember.middle_name}` : '';
    const lastName = staffMember.last_name || '';
    return `${firstName}${middleName} ${lastName}`.trim();
  };

  // ==================== LOGOUT ====================
  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleConfirmLogout = () => {
    if (socket.current) socket.current.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };
  const handleCancelLogout = () => setShowLogoutConfirm(false);

  // ==================== VALIDATION ====================
  const validateName = (name, fieldName) => {
    if (!name.trim()) return `${fieldName} is required`;
    const nameRegex = /^[A-Za-z\s\-']+$/;
    if (!nameRegex.test(name)) return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    if (name.length < 2) return `${fieldName} must be at least 2 characters`;
    if (name.length > 50) return `${fieldName} must be less than 50 characters`;
    return '';
  };

  const validateAge = (age) => {
    if (!age) return 'Age is required';
    const ageNum = Number(age);
    if (isNaN(ageNum)) return 'Age must be a number';
    if (!Number.isInteger(ageNum)) return 'Age must be a whole number';
    if (ageNum < 0 || ageNum > 120) return ageNum < 0 ? 'Age cannot be negative' : 'Age must be less than 120';
    return '';
  };

  const validatePhone = (phone) => {
    if (!phone) return '';
    const phoneRegex = /^[0-9\s\-+()]+$/;
    if (!phoneRegex.test(phone)) return 'Phone can only contain numbers, spaces, and + - ( )';
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) return 'Phone must have at least 10 digits';
    if (digitsOnly.length > 15) return 'Phone must have less than 15 digits';
    return '';
  };

  const validateForm = () => {
    const errors = {
      first_name: validateName(formData.first_name, 'First name'),
      last_name: validateName(formData.last_name, 'Last name'),
      middle_name: formData.middle_name ? validateName(formData.middle_name, 'Middle name') : '',
      age: validateAge(formData.age),
      phone: validatePhone(formData.phone)
    };
    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  // ==================== INPUT HANDLER ====================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };

  // ==================== FETCH DATA ====================
  const fetchRecentPatients = async () => {
    const hospitalId = getHospitalId();
    if (!hospitalId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/cardoffice/patients/recent`, {
        params: { hospital_id: hospitalId },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setRecentPatients(response.data.patients || []);
    } catch (error) {
      console.error('Error fetching recent patients:', error);
    }
  };

  const fetchStats = async () => {
    const hospitalId = getHospitalId();
    if (!hospitalId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/cardoffice/stats`, {
        params: { hospital_id: hospitalId },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setStats(response.data.stats || { today: 0, inTriage: 0, active: 0, total: 0 });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // ==================== REPORT FUNCTIONS ====================
  const fetchReportsInbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/cardoffice/reports/inbox`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setReportsInbox(res.data.reports || []);
        setUnreadReportsCount(res.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching reports inbox:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchReportsOutbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/cardoffice/reports/outbox`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setReportsOutbox(res.data.reports || []);
    } catch (error) {
      console.error('Error fetching reports outbox:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchHospitalAdmins = async () => {
    const hospitalId = getHospitalId();
    if (!hospitalId) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/cardoffice/hospital-admins`, {
        params: { hospital_id: hospitalId },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHospitalAdmins(res.data.admins || []);
        if (res.data.admins?.length === 1) {
          setSendReportForm(prev => ({ ...prev, recipient_id: res.data.admins[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching hospital admins:', error);
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!sendReportForm.recipient_id) {
      setMessage({ type: 'error', text: 'Please select a recipient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', sendReportForm.title);
      formData.append('subject', sendReportForm.title);
      formData.append('body', sendReportForm.body);
      formData.append('priority', sendReportForm.priority);
      formData.append('recipient_type', sendReportForm.recipient_type);
      formData.append('recipient_id', sendReportForm.recipient_id);
      sendReportForm.attachments.forEach((file) => formData.append('attachments', file));
      
      const res = await axios.post(`${API_URL}/cardoffice/reports/send`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Report sent successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setShowSendReportModal(false);
        setSendReportForm({
          recipient_type: 'hospital',
          recipient_id: '',
          title: '',
          body: '',
          priority: 'medium',
          attachments: []
        });
        setAttachmentPreview([]);
        fetchReportsOutbox();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error sending report' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const viewReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportDetailModal(true);
    if (!report.is_opened) markReportAsRead(report.id);
  };

  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/cardoffice/reports/${reportId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReportsInbox();
    } catch (error) {
      console.error('Error marking report as read:', error);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() && !replyAttachment) {
      setMessage({ type: 'error', text: 'Please enter a reply message' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('body', replyText);
      if (replyAttachment) formData.append('attachment', replyAttachment);
      
      const res = await axios.post(`${API_URL}/cardoffice/reports/${selectedReport.id}/reply`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Reply sent successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setShowReplyModal(false);
        setReplyText('');
        setReplyAttachment(null);
        fetchReportsInbox();
        fetchReportsOutbox();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error sending reply' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== PROFILE FUNCTIONS ====================
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`	${API_URL}/cardoffice/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const staff = res.data.staff;
        setProfileData({
          first_name: staff.first_name || '',
          middle_name: staff.middle_name || '',
          last_name: staff.last_name || '',
          gender: staff.gender || '',
          age: staff.age || '',
          phone: staff.phone || '',
          email: staff.email || '',
          department: staff.department || 'Card Office'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/cardoffice/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setIsEditingProfile(false);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error updating profile' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const changePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/cardoffice/change-password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setShowPasswordModal(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error changing password' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // ==================== REGISTRATION ====================
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the errors in the form before submitting' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }
    
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const cleanedFormData = {
        ...formData,
        phone: formData.phone.replace(/\s/g, ''),
        hospital_id: getHospitalId()
      };
      
      const response = await axios.post(
        `${API_URL}/cardoffice/patients/register`,
        cleanedFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: `Patient ${formData.first_name} ${formData.last_name} registered! Card: ${response.data.patient.card_number}` });
        setFormData({
          first_name: '',
          middle_name: '',
          last_name: '',
          age: '',
          gender: 'Male',
          phone: ''
        });
        setFormErrors({
          first_name: '',
          middle_name: '',
          last_name: '',
          age: '',
          phone: ''
        });
        setSelectedPatient(response.data.patient);
        setShowPrintModal(true);
        fetchRecentPatients();
        fetchStats();
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error registering patient' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // ==================== SEARCH ====================
  const handleSearch = async () => {
    const hospitalId = getHospitalId();
    if (!hospitalId) {
      setMessage({ type: 'error', text: 'Hospital ID not found. Please login again.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setMessage({ type: 'error', text: 'Please enter a search term' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const encodedQuery = encodeURIComponent(searchQuery.trim());
      const response = await axios.get(
        `${API_URL}/cardoffice/patients/search`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSearchResults(response.data.patients || []);
        if (!response.data.patients || response.data.patients.length === 0) {
          setMessage({ type: 'info', text: 'No patients found matching your search' });
          setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error searching patients' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSearching(false);
    }
  };

  const handleSendToTriage = async (patient) => {
    const reason = prompt('Enter reason for return visit:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/cardoffice/patients/send-to-triage`,
        { patientId: patient.id, reason, hospital_id: getHospitalId() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: `Patient ${patient.first_name} ${patient.last_name} sent to triage` });
        handleSearch();
        fetchStats();
      }
    } catch (error) {
      console.error('Error sending to triage:', error);
      setMessage({ type: 'error', text: 'Error sending patient to triage' });
    } finally {
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleViewHistory = async (patient) => {
    try {
      const token = localStorage.getItem('token');
     const response = await axios.get(
  `${API_URL}/cardoffice/patients/${patient.id}?hospital_id=${getHospitalId()}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

      if (response.data.success) {
        const visitsCount = response.data.visits?.length || 0;
        alert(`${patient.first_name} ${patient.last_name}\nCard: ${patient.card_number}\nTotal Visits: ${visitsCount}`);
      }
    } catch (error) {
      console.error('Error fetching patient history:', error);
      setMessage({ type: 'error', text: 'Error fetching patient history' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setMessage({ type: '', text: '' });
  };

  // ==================== SOCKET CONNECTION ====================
  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    
    socket.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socket.current.on('connect', () => {
      console.log('✅ Card Office socket connected');
      setConnectionStatus('connected');
      const hospitalId = getHospitalId();
      if (hospitalId) {
        socket.current.emit('join_cardoffice', hospitalId);
      }
    });

    socket.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnectionStatus('disconnected');
    });
    
    socket.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnectionStatus('disconnected');
    });

    socket.current.on('patient_registered', (data) => {
      const hospitalId = getHospitalId();
      if (data.hospital_id == hospitalId) {
        setRealTimeNotification({
          id: Date.now(),
          type: 'new_patient',
          title: 'New Patient Registered',
          message: `${data.patient_name} - Card: ${data.card_number}`,
          priority: 'medium',
          timestamp: new Date()
        });
        fetchRecentPatients();
        fetchStats();
        setTimeout(() => setRealTimeNotification(null), 6000);
      }
    });

    socket.current.on('new_report_from_hospital', (data) => {
      setRealTimeNotification({
        id: Date.now(),
        type: 'report',
        title: 'New Report',
        message: `Hospital Admin sent: "${data.title}"`,
        priority: data.priority,
        timestamp: new Date()
      });
      fetchReportsInbox();
      setTimeout(() => setRealTimeNotification(null), 6000);
    });
  };

  // ==================== UI HELPER FUNCTIONS ====================
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

  const getStatusStyle = (status) => {
    const styles = {
      'in_triage': { bg: 'bg-amber-100', color: 'text-amber-800', text: 'In Triage' },
      'in_opd': { bg: 'bg-green-100', color: 'text-green-800', text: 'In OPD' },
      'in_emergency': { bg: 'bg-red-100', color: 'text-red-800', text: 'In Emergency' },
      'in_anc': { bg: 'bg-purple-100', color: 'text-purple-800', text: 'In ANC' },
      'with_doctor': { bg: 'bg-blue-100', color: 'text-blue-800', text: 'With Doctor' },
      'admitted': { bg: 'bg-orange-100', color: 'text-orange-800', text: 'Admitted' },
      'discharged': { bg: 'bg-gray-100', color: 'text-gray-800', text: 'Discharged' },
      'referred': { bg: 'bg-pink-100', color: 'text-pink-800', text: 'Referred' }
    };
    return styles[status] || { bg: 'bg-gray-100', color: 'text-gray-800', text: status || 'Unknown' };
  };

  const RealTimeNotification = () => {
    if (!realTimeNotification) return null;
    const priorityColors = {
      low: 'border-teal-500 bg-teal-50',
      medium: 'border-yellow-500 bg-yellow-50',
      high: 'border-orange-500 bg-orange-50',
      urgent: 'border-red-500 bg-red-50 animate-pulse'
    };
    return (
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.9 }}
        className={`fixed bottom-6 right-6 z-[10000] max-w-md bg-white rounded-2xl shadow-2xl border-l-4 ${priorityColors[realTimeNotification.priority] || 'border-teal-500'} overflow-hidden`}
      >
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-blue-100">
                {realTimeNotification.type === 'reply' ? '💬' : realTimeNotification.type === 'new_patient' ? '🆕' : '📬'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className={`font-bold text-gray-900 ${textSizeClasses.heading}`}>{realTimeNotification.title}</p>
                <span className={`text-gray-400 ml-2 ${textSizeClasses.base}`}>{getPriorityIcon(realTimeNotification.priority)} {realTimeNotification.priority}</span>
              </div>
              <p className={`text-gray-600 mb-2 ${textSizeClasses.base}`}>{realTimeNotification.message}</p>
              <div className="flex items-center gap-3 text-gray-400" style={{ fontSize: '0.875rem' }}>
                <span>🕒 {new Date(realTimeNotification.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            <button onClick={() => setRealTimeNotification(null)} className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>
        </div>
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 6, ease: 'linear' }}
          className={`h-1 ${realTimeNotification.priority === 'urgent' ? 'bg-red-500' : 'bg-blue-500'}`}
        />
      </motion.div>
    );
  };

  const SocketStatusIndicator = () => {
    const statusConfig = {
      connected: { color: 'bg-green-500', text: 'Live', icon: '🟢' },
      connecting: { color: 'bg-yellow-500', text: 'Connecting...', icon: '🟡' },
      disconnected: { color: 'bg-red-500', text: 'Offline', icon: '🔴' }
    };
    const config = statusConfig[connectionStatus] || statusConfig.connecting;
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
        <div className={`w-3 h-3 rounded-full ${config.color} animate-pulse`} />
        <span className={`text-gray-600 ${textSizeClasses.base}`}>{config.icon} {config.text}</span>
      </div>
    );
  };

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    if (!getHospitalId()) {
      console.warn('No hospital_id available on initial load');
      return;
    }

    initializeSocket();
    fetchRecentPatients();
    fetchStats();
    fetchReportsInbox();
    fetchReportsOutbox();
    fetchHospitalAdmins();
    fetchProfile();

    const interval = setInterval(() => {
      fetchStats();
      fetchReportsInbox();
    }, 30000);

    return () => {
      if (socket.current) socket.current.disconnect();
      clearInterval(interval);
    };
  }, []);

  // ==================== RENDER ====================
  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex ${textSizeClasses.base}`}>
      <RealTimeNotification />
      
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <FaSignOutAlt className="text-red-600 text-3xl" />
              </div>
              <h3 className={`font-bold text-gray-800 mb-3 ${textSizeClasses.title}`}>Confirm Logout</h3>
              <p className={`text-gray-600 mb-8 ${textSizeClasses.base}`}>Are you sure you want to logout from Card Office Dashboard?</p>
              <div className="flex gap-4">
                <button onClick={handleCancelLogout} className={`flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium ${textSizeClasses.base}`}>No, Stay</button>
                <button onClick={handleConfirmLogout} className={`flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium ${textSizeClasses.base}`}>Yes, Logout</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes glow { 0% { box-shadow: 0 0 5px rgba(59,130,246,0.2); } 50% { box-shadow: 0 0 20px rgba(59,130,246,0.5); } 100% { box-shadow: 0 0 5px rgba(59,130,246,0.2); } }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        .animate-glow { animation: glow 2s infinite; }
        .white-blue-card { background: white !important; border: 2px solid #e0e7ff !important; border-radius: 1rem !important; padding: 1.5rem !important; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1) !important; transition: all 0.3s ease !important; }
        .white-blue-card:hover { box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15) !important; border-color: #3b82f6 !important; }
      `}</style>

      {/* ==================== SIDEBAR ==================== */}
      <div className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ${
        sidebarCollapsed ? 'w-24' : 'w-72'
      } shadow-2xl flex flex-col h-screen sticky top-0 z-50`}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FaIdCard className="text-white text-lg" />
                </div>
                <span className={`font-bold tracking-tight ${textSizeClasses.heading}`}>Card Office</span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg mx-auto">
                <FaIdCard className="text-white text-lg" />
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-slate-700 rounded-xl transition-colors">
              {sidebarCollapsed ? <FaChevronRight size={20} /> : <FaChevronLeft size={20} />}
            </button>
          </div>

          <nav className="space-y-2">
            <button onClick={() => handleTabChange('register', false)} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              activeTab === 'register' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaUserPlus className="text-xl" />
              {!sidebarCollapsed && <span>Register Patient</span>}
            </button>

            <button onClick={() => handleTabChange('search', false)} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              activeTab === 'search' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaSearch className="text-xl" />
              {!sidebarCollapsed && <span>Search Patients</span>}
            </button>

            <button onClick={() => handleTabChange('recent', false)} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              activeTab === 'recent' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaHistory className="text-xl" />
              {!sidebarCollapsed && <span>Recent Registrations</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            <button onClick={() => { handleTabChange('inbox', false); fetchReportsInbox(); }} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} relative ${
              activeTab === 'inbox' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaInbox className="text-xl" />
              {!sidebarCollapsed && <span>Inbox</span>}
              {unreadReportsCount > 0 && (
                <span className="absolute right-3 bg-red-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                  {unreadReportsCount}
                </span>
              )}
            </button>

            <button onClick={() => { handleTabChange('outbox', false); fetchReportsOutbox(); }} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              activeTab === 'outbox' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaPaperPlane className="text-xl" />
              {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>

            <button onClick={() => handleTabChange('reports', false)} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              activeTab === 'reports' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaChartBar className="text-xl" />
              {!sidebarCollapsed && <span>Statistics</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            <button onClick={() => handleTabChange('schedule', true)} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaCalendarAlt className="text-xl" />
              {!sidebarCollapsed && <span>My Schedule</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            <button onClick={() => handleTabChange('profile', false)} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              activeTab === 'profile' && !showScheduleView ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaUserCircle className="text-xl" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>

          {sidebarCollapsed && (
            <div className="mt-8 text-center">
              <div className={`text-2xl font-bold text-blue-400 ${textSizeClasses.title}`}>{stats.today}</div>
              <div className="text-xs text-slate-400 mt-1">Today</div>
              {unreadReportsCount > 0 && (
                <div className="mt-3">
                  <div className={`text-xl font-bold text-red-400 ${textSizeClasses.heading}`}>{unreadReportsCount}</div>
                  <div className="text-xs text-slate-400 mt-1">Unread</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`${sidebarCollapsed ? 'py-5 px-0' : 'p-6'} border-t border-slate-700/50 mt-auto`}>
          <button onClick={handleLogoutClick} className={`w-full ${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-5'} bg-transparent border border-slate-600 rounded-xl text-red-400 cursor-pointer flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 ${textSizeClasses.base} transition-all duration-200 hover:bg-red-500/10 hover:border-red-500`}>
            <span className="text-xl">🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-8 px-10 shadow-xl sticky top-0 z-40">
          <div className="max-w-[1600px] mx-auto flex justify-between items-center flex-wrap gap-5">
            <div className="flex items-center gap-5">
              <button onClick={handleGoBack} className="bg-white/20 backdrop-blur p-3 rounded-xl text-white hover:bg-white/30 transition-all duration-200 shadow-lg flex items-center gap-2 group" title="Go Back">
                <FaUndo className="text-white text-lg" />
                <span className={`hidden sm:inline ${textSizeClasses.base}`}>Back</span>
              </button>
              
              <div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-glow">
                    <FaIdCard className="text-white" />
                  </div>
                  <div>
                    <h1 className={`font-bold text-white m-0 drop-shadow-md tracking-tight ${textSizeClasses.title}`}>
                      {activeTab === 'register' && !showScheduleView && 'Register New Patient'}
                      {activeTab === 'search' && !showScheduleView && 'Search Patients'}
                      {activeTab === 'recent' && !showScheduleView && 'Recent Registrations'}
                      {activeTab === 'inbox' && !showScheduleView && 'Reports - Inbox'}
                      {activeTab === 'outbox' && !showScheduleView && 'Reports - Sent'}
                      {activeTab === 'reports' && !showScheduleView && 'Card Office Statistics'}
                      {showScheduleView && 'My Work Schedule'}
                      {activeTab === 'profile' && !showScheduleView && 'My Profile'}
                    </h1>
                    <p className={`text-white/90 mt-2 flex items-center gap-3 flex-wrap ${textSizeClasses.base}`}>
                      <span>{formatFullName(user)}</span>
                      <span className="text-white/50 text-lg">•</span>
                      <span>{user?.hospital_name}</span>
                      <span className="bg-white/20 px-4 py-1 rounded-full text-sm font-medium backdrop-blur">Card Office Department</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative">
                <button onClick={() => setShowTextSizeMenu(!showTextSizeMenu)} className="bg-white/20 backdrop-blur px-4 py-3 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg" title="Adjust Text Size">
                  <FaTextHeight className="text-lg" />
                  <span className={`hidden md:inline ${textSizeClasses.base}`}>Text Size</span>
                </button>
                
                {showTextSizeMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                    <button onClick={() => { setTextSize('small'); setShowTextSizeMenu(false); }} className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition flex items-center justify-between ${textSize === 'small' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'} ${textSizeClasses.base}`}>
                      <span>Small</span>
                      {textSize === 'small' && <FaCheck className="text-blue-500" />}
                    </button>
                    <button onClick={() => { setTextSize('normal'); setShowTextSizeMenu(false); }} className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition flex items-center justify-between ${textSize === 'normal' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'} ${textSizeClasses.base}`}>
                      <span>Normal</span>
                      {textSize === 'normal' && <FaCheck className="text-blue-500" />}
                    </button>
                    <button onClick={() => { setTextSize('large'); setShowTextSizeMenu(false); }} className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition flex items-center justify-between ${textSize === 'large' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'} ${textSizeClasses.base}`}>
                      <span>Large</span>
                      {textSize === 'large' && <FaCheck className="text-blue-500" />}
                    </button>
                    <button onClick={() => { setTextSize('xlarge'); setShowTextSizeMenu(false); }} className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition flex items-center justify-between ${textSize === 'xlarge' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'} ${textSizeClasses.base}`}>
                      <span>Extra Large</span>
                      {textSize === 'xlarge' && <FaCheck className="text-blue-500" />}
                    </button>
                  </div>
                )}
              </div>
              
              <SocketStatusIndicator />
              <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className="bg-white/20 backdrop-blur px-5 py-3 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg font-medium">
                <FaPaperPlane className="text-base" /> Send Report
              </button>
              <button onClick={() => { fetchStats(); fetchRecentPatients(); }} className="bg-white/20 backdrop-blur px-5 py-3 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg font-medium">
                <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <div className="flex gap-5 bg-white/10 backdrop-blur py-3 px-6 rounded-full">
                <div className="text-center"><div className={`font-bold text-white ${textSizeClasses.title}`}>{stats.today}</div><div className="text-xs text-white/70 uppercase tracking-wider mt-1">Today</div></div>
                <div className="w-px h-10 bg-white/30" />
                <div className="text-center"><div className={`font-bold text-white ${textSizeClasses.title}`}>{stats.inTriage}</div><div className="text-xs text-white/70 uppercase tracking-wider mt-1">In Triage</div></div>
                <div className="w-px h-10 bg-white/30" />
                <div className="text-center"><div className={`font-bold text-white ${textSizeClasses.title}`}>{stats.active}</div><div className="text-xs text-white/70 uppercase tracking-wider mt-1">Active</div></div>
                <div className="w-px h-10 bg-white/30" />
                <div className="text-center"><div className={`font-bold text-white ${textSizeClasses.title}`}>{stats.total}</div><div className="text-xs text-white/70 uppercase tracking-wider mt-1">Total</div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto p-10">
          {/* Message Display */}
          {message.text && (
            <div className={`mb-6 p-5 rounded-xl border-l-4 ${message.type === 'error' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'} flex justify-between items-center ${textSizeClasses.base}`}>
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: '', text: '' })} className="text-xl hover:opacity-70">×</button>
            </div>
          )}

          {/* Register Tab - White/Blue Card */}
          {activeTab === 'register' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className={`font-bold text-gray-800 flex items-center gap-2 ${textSizeClasses.heading}`}>
                  <FaUserPlus className="text-blue-500" /> Register New Patient
                </h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleRegister} className="max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>First Name <span className="text-red-500">*</span></label><input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} className={`w-full p-3 border ${formErrors.first_name ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${textSizeClasses.base}`} placeholder="Enter first name" />{formErrors.first_name && <p className={`text-red-500 mt-1 ${textSizeClasses.base}`}>{formErrors.first_name}</p>}</div>
                    <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Middle Name</label><input type="text" name="middle_name" value={formData.middle_name} onChange={handleInputChange} className={`w-full p-3 border ${formErrors.middle_name ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${textSizeClasses.base}`} placeholder="Enter middle name" />{formErrors.middle_name && <p className={`text-red-500 mt-1 ${textSizeClasses.base}`}>{formErrors.middle_name}</p>}</div>
                    <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Last Name <span className="text-red-500">*</span></label><input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} className={`w-full p-3 border ${formErrors.last_name ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${textSizeClasses.base}`} placeholder="Enter last name" />{formErrors.last_name && <p className={`text-red-500 mt-1 ${textSizeClasses.base}`}>{formErrors.last_name}</p>}</div>
                    <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Age <span className="text-red-500">*</span></label><input type="number" name="age" value={formData.age} onChange={handleInputChange} className={`w-full p-3 border ${formErrors.age ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${textSizeClasses.base}`} placeholder="Enter age" />{formErrors.age && <p className={`text-red-500 mt-1 ${textSizeClasses.base}`}>{formErrors.age}</p>}</div>
                    <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Gender <span className="text-red-500">*</span></label><select name="gender" value={formData.gender} onChange={handleInputChange} className={`w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${textSizeClasses.base}`}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                    <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Phone Number</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={`w-full p-3 border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${textSizeClasses.base}`} placeholder="Enter phone number" />{formErrors.phone && <p className={`text-red-500 mt-1 ${textSizeClasses.base}`}>{formErrors.phone}</p>}</div>
                  </div>
                  <div className="mt-8 flex justify-end"><button type="submit" disabled={loading} className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2 ${textSizeClasses.base}`}>{loading ? <FaSpinner className="animate-spin" /> : <FaUserPlus />}{loading ? 'Registering...' : 'Register Patient'}</button></div>
                </form>
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200"><p className={`text-blue-800 ${textSizeClasses.base}`}><strong>📌 Note:</strong> After registration, patient will automatically be sent to Triage</p></div>
              </div>
            </div>
          )}

          {/* Search Tab - White/Blue Cards */}
          {activeTab === 'search' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className={`font-bold text-gray-800 mb-6 ${textSizeClasses.heading}`}>Search Patients</h2>
              <div className="flex gap-3 mb-6"><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search by card number, name, or phone..." className={`flex-1 p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} /><button onClick={handleSearch} disabled={searching} className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center gap-2 ${textSizeClasses.base}`}>{searching ? <FaSpinner className="animate-spin" /> : <FaSearch />}{searching ? 'Searching...' : 'Search'}</button>{searchQuery && <button onClick={clearSearch} className={`px-6 py-3 bg-gray-200 text-gray-700 rounded-xl ${textSizeClasses.base}`}>Clear</button>}</div>
              {searchResults.length > 0 && (<div className="space-y-4">{searchResults.map(patient => (<div key={patient.id} className="white-blue-card"><div className="flex justify-between items-start flex-wrap gap-4"><div><div className="flex items-center gap-3 mb-2"><span className={`font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded ${textSizeClasses.base}`}><FaCreditCard className="inline mr-1" /> {patient.card_number}</span><span className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(patient.status).bg} ${getStatusStyle(patient.status).color}`}>{getStatusStyle(patient.status).text}</span></div><h3 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>{patient.first_name} {patient.middle_name || ''} {patient.last_name}</h3><p className={`text-gray-500 mt-1 ${textSizeClasses.base}`}>{patient.age} years • {patient.gender}{patient.phone && ` • 📞 ${patient.phone}`}</p></div><div className="flex gap-2"><button onClick={() => handleViewHistory(patient)} className={`px-4 py-2 bg-blue-600 text-white rounded-lg ${textSizeClasses.base}`}><FaHistory className="inline mr-1" /> History</button>{patient.status !== 'in_triage' && patient.status !== 'with_doctor' && (<button onClick={() => handleSendToTriage(patient)} className={`px-4 py-2 bg-amber-600 text-white rounded-lg ${textSizeClasses.base}`}><FaHeartbeat className="inline mr-1" /> Send to Triage</button>)}</div></div></div>))}</div>)}
              {searchResults.length === 0 && searchQuery && !searching && (<div className="text-center py-12 text-gray-500">No patients found</div>)}
            </div>
          )}

          {/* Recent Tab - White/Blue Cards */}
          {activeTab === 'recent' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className={`font-bold text-gray-800 mb-6 ${textSizeClasses.heading}`}>Recent Registrations</h2>
              {recentPatients.length === 0 ? (<div className="text-center py-20 bg-gray-50 rounded-xl"><FaUserPlus className="text-6xl text-gray-300 mx-auto mb-4" /><p className={`text-gray-500 ${textSizeClasses.base}`}>No patients registered yet</p></div>) : (<div className="space-y-4">{recentPatients.map(patient => (<div key={patient.id} className="white-blue-card"><div className="flex justify-between items-center"><div><span className={`font-mono text-blue-600 ${textSizeClasses.base}`}>{patient.card_number}</span><h3 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>{patient.first_name} {patient.last_name}</h3><p className={`text-gray-500 ${textSizeClasses.base}`}>{patient.age} years • {patient.gender}</p></div><span className={`px-3 py-1 rounded-full ${getStatusStyle(patient.status).bg} ${getStatusStyle(patient.status).color}`}>{getStatusStyle(patient.status).text}</span></div></div>))}</div>)}
            </div>
          )}

          {/* Inbox Tab - White/Blue Cards */}
          {activeTab === 'inbox' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-3"><h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>📬 Inbox</h2>{unreadReportsCount > 0 && <span className={`px-3 py-1 bg-red-500 text-white rounded-full animate-pulse ${textSizeClasses.base}`}>{unreadReportsCount} unread</span>}</div><button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className={`px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-medium ${textSizeClasses.base}`}>New Report</button></div>
              {reportsLoading && reportsInbox.length === 0 ? (<div className="text-center py-20"><FaSpinner className="animate-spin text-4xl text-gray-400 mx-auto mb-4" /><p className={`text-gray-500 ${textSizeClasses.base}`}>Loading reports...</p></div>) : reportsInbox.length === 0 ? (<div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><FaInbox className="text-6xl text-gray-300 mx-auto mb-4" /><p className={`text-gray-500 ${textSizeClasses.base}`}>No reports in inbox</p></div>) : (<div className="space-y-5">{reportsInbox.map(report => (<div key={report.id} className={`white-blue-card cursor-pointer ${!report.is_opened ? 'border-blue-300 bg-blue-50' : ''}`} onClick={() => viewReportDetails(report)}><div className="flex justify-between items-start mb-3"><div className="flex items-center gap-3">{!report.is_opened ? <FaEnvelope className="text-blue-500 text-xl" /> : <FaEnvelopeOpen className="text-gray-400 text-xl" />}<h3 className={`font-semibold text-gray-800 ${textSizeClasses.base}`}>{report.title}</h3></div><span className={`text-sm px-3 py-1.5 rounded-full ${getPriorityBadge(report.priority)}`}>{getPriorityIcon(report.priority)} {report.priority}</span></div><p className={`text-gray-600 mb-3 line-clamp-2 ${textSizeClasses.base}`}>{report.body}</p><div className={`flex justify-between items-center text-gray-500 ${textSizeClasses.base}`}><span>From: {report.sender_full_name}</span><span>{new Date(report.sent_at).toLocaleString()}</span></div></div>))}</div>)}
            </div>
          )}

          {/* Outbox Tab - White/Blue Cards */}
          {activeTab === 'outbox' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6"><h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>📤 Sent Reports</h2><button onClick={() => fetchReportsOutbox()} className={`px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium ${textSizeClasses.base}`}>Refresh</button></div>
              {reportsLoading && reportsOutbox.length === 0 ? (<div className="text-center py-20"><FaSpinner className="animate-spin text-4xl text-gray-400 mx-auto mb-4" /><p className={`text-gray-500 ${textSizeClasses.base}`}>Loading sent reports...</p></div>) : reportsOutbox.length === 0 ? (<div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><FaPaperPlane className="text-6xl text-gray-300 mx-auto mb-4" /><p className={`text-gray-500 ${textSizeClasses.base}`}>No sent reports</p></div>) : (<div className="space-y-5">{reportsOutbox.map(report => (<div key={report.id} className="white-blue-card cursor-pointer" onClick={() => viewReportDetails(report)}><div className="flex justify-between items-start mb-3"><div className="flex items-center gap-3"><FaPaperPlane className="text-gray-400 text-xl" /><h3 className={`font-semibold text-gray-800 ${textSizeClasses.base}`}>{report.title}</h3></div><span className={`text-sm px-3 py-1.5 rounded-full ${getPriorityBadge(report.priority)}`}>{getPriorityIcon(report.priority)} {report.priority}</span></div><p className={`text-gray-600 mb-3 line-clamp-2 ${textSizeClasses.base}`}>{report.body}</p><div className={`flex justify-between items-center text-gray-500 ${textSizeClasses.base}`}><span>To: {report.recipient_full_name}</span><span>Sent: {new Date(report.sent_at).toLocaleString()}</span></div></div>))}</div>)}
            </div>
          )}

          {/* Statistics Tab - White/Blue Cards */}
          {activeTab === 'reports' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className={`font-bold text-gray-800 mb-6 ${textSizeClasses.heading}`}>📊 Card Office Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="white-blue-card"><p className={`text-blue-600 mb-2 font-semibold ${textSizeClasses.base}`}>Today's Registrations</p><p className={`font-bold text-gray-800 ${textSizeClasses.title}`}>{stats.today}</p></div>
                <div className="white-blue-card"><p className={`text-blue-600 mb-2 font-semibold ${textSizeClasses.base}`}>In Triage</p><p className={`font-bold text-gray-800 ${textSizeClasses.title}`}>{stats.inTriage}</p></div>
                <div className="white-blue-card"><p className={`text-blue-600 mb-2 font-semibold ${textSizeClasses.base}`}>Active Patients</p><p className={`font-bold text-gray-800 ${textSizeClasses.title}`}>{stats.active}</p></div>
                <div className="white-blue-card"><p className={`text-blue-600 mb-2 font-semibold ${textSizeClasses.base}`}>Total Patients</p><p className={`font-bold text-gray-800 ${textSizeClasses.title}`}>{stats.total}</p></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 text-center"><p className={`text-gray-600 ${textSizeClasses.base}`}>Today's Summary: {stats.today} patients registered, {stats.inTriage} waiting for triage</p><p className={`text-sm text-gray-400 mt-2`}>Active patients: {stats.active} | Total patients: {stats.total}</p></div>
            </div>
          )}

          {/* My Schedule View */}
          {showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg"><FaCalendarAlt className="text-white text-xl" /></div>
                  <div><h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>My Work Schedule</h2><p className={`text-gray-500 ${textSizeClasses.base}`}>View your upcoming shifts and weekly schedule</p></div>
                </div>
                <button onClick={() => { const event = new CustomEvent('refreshSchedule'); window.dispatchEvent(event); }} className={`px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium flex items-center gap-2 ${textSizeClasses.base}`}><FaSync className="text-sm" /> Refresh</button>
              </div>
              <ScheduleViewer user={user} compact={false} />
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-12">
                <div className="flex items-center gap-8">
                  <div className="relative"><div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-xl"><FaUserCircle className="text-blue-600 text-7xl" /></div></div>
                  <div className="text-white">
                    <h2 className={`font-bold mb-2 ${textSizeClasses.title}`}>{profileData.first_name} {profileData.middle_name ? profileData.middle_name + ' ' : ''}{profileData.last_name}</h2>
                    <p className={`text-blue-100 flex items-center gap-3 ${textSizeClasses.base}`}><FaIdCard className="text-lg" /> {profileData.department || 'Card Office'} Staff</p>
                    <p className={`text-blue-100 mt-2 opacity-80 ${textSizeClasses.base}`}>{user?.hospital_name}</p>
                  </div>
                </div>
              </div>
              <div className="p-10">
                <div className="flex justify-between items-center mb-8"><h3 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>Professional Information</h3>{!isEditingProfile ? (<button onClick={() => setIsEditingProfile(true)} className={`flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium ${textSizeClasses.base}`}><FaEditIcon /> Edit Profile</button>) : (<div className="flex gap-3"><button onClick={() => setIsEditingProfile(false)} className={`px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition ${textSizeClasses.base}`}>Cancel</button><button onClick={updateProfile} className={`flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition ${textSizeClasses.base}`}><FaSave /> Save</button></div>)}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gray-50 rounded-xl p-6"><h4 className={`font-semibold text-blue-600 mb-5 flex items-center gap-2 ${textSizeClasses.base}`}><FaUserCircle /> Personal Info</h4><div className="space-y-4"><div><label className={`text-gray-500 ${textSizeClasses.base}`}>First Name</label>{isEditingProfile ? (<input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} />) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.first_name || 'Not set'}</p>)}</div><div><label className={`text-gray-500 ${textSizeClasses.base}`}>Middle Name</label>{isEditingProfile ? (<input type="text" value={profileData.middle_name} onChange={(e) => setProfileData({...profileData, middle_name: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} />) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.middle_name || '—'}</p>)}</div><div><label className={`text-gray-500 ${textSizeClasses.base}`}>Last Name</label>{isEditingProfile ? (<input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} />) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.last_name || 'Not set'}</p>)}</div><div className="grid grid-cols-2 gap-4"><div><label className={`text-gray-500 ${textSizeClasses.base}`}>Gender</label>{isEditingProfile ? (<select value={profileData.gender} onChange={(e) => setProfileData({...profileData, gender: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`}><option>Male</option><option>Female</option><option>Other</option></select>) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.gender || 'Not set'}</p>)}</div><div><label className={`text-gray-500 ${textSizeClasses.base}`}>Age</label>{isEditingProfile ? (<input type="number" value={profileData.age} onChange={(e) => setProfileData({...profileData, age: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} />) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.age ? `${profileData.age} years` : 'Not set'}</p>)}</div></div><div><label className={`text-gray-500 ${textSizeClasses.base}`}>Phone</label>{isEditingProfile ? (<input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} />) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.phone || 'Not set'}</p>)}</div><div><label className={`text-gray-500 ${textSizeClasses.base}`}>Email</label><p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.email || 'Not set'}</p></div></div></div>
                  <div className="bg-gray-50 rounded-xl p-6"><h4 className={`font-semibold text-blue-600 mb-5 flex items-center gap-2 ${textSizeClasses.base}`}><FaKey /> Account Settings</h4><button onClick={() => setShowPasswordModal(true)} className={`flex items-center gap-2 px-5 py-3 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition font-medium w-full justify-center ${textSizeClasses.base}`}><FaKey /> Change Password</button><div className="mt-8 pt-6 border-t border-gray-200"><h5 className={`font-medium text-gray-700 mb-3 ${textSizeClasses.base}`}>Account Info</h5><div className={`space-y-3 ${textSizeClasses.base}`}><div className="flex justify-between"><span className="text-gray-500">Role:</span><span className="text-gray-800 font-medium">Card Office Staff</span></div><div className="flex justify-between"><span className="text-gray-500">Department:</span><span className="text-gray-800">{profileData.department || 'Card Office'}</span></div><div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="text-green-600 text-base">● Active</span></div></div></div></div></div>
                </div>
              </div>
          
          )}
        </div>
      </div>

      {/* All Modals (Send Report, Report Detail, Reply, Change Password, Print) */}
      {/* Send Report Modal */}
      {showSendReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4"><h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>Send Report</h2><button onClick={() => setShowSendReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <form onSubmit={handleSendReport} className="space-y-4">
              <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Recipient *</label><select value={sendReportForm.recipient_id} onChange={(e) => setSendReportForm({...sendReportForm, recipient_id: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} required><option value="">Select Hospital Admin...</option>{hospitalAdmins.map(admin => (<option key={admin.id} value={admin.id}>{admin.full_name} - {admin.hospital_name}</option>))}</select></div>
              <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Priority</label><select value={sendReportForm.priority} onChange={(e) => setSendReportForm({...sendReportForm, priority: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`}><option value="low">🟢 Low</option><option value="medium">🟡 Medium</option><option value="high">🟠 High</option><option value="urgent">🔴 Urgent</option></select></div>
              <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Title *</label><input type="text" value={sendReportForm.title} onChange={(e) => setSendReportForm({...sendReportForm, title: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} required /></div>
              <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Message *</label><textarea value={sendReportForm.body} onChange={(e) => setSendReportForm({...sendReportForm, body: e.target.value})} rows="5" className={`w-full p-3 border border-gray-300 rounded-xl resize-none ${textSizeClasses.base}`} required /></div>
              <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Attachments</label><input type="file" ref={fileInputRef} onChange={(e) => { const files = Array.from(e.target.files); setSendReportForm(prev => ({ ...prev, attachments: [...prev.attachments, ...files] })); }} multiple className={`w-full p-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`} /></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowSendReportModal(false)} className={`px-5 py-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`}>Cancel</button><button type="submit" disabled={loading} className={`px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center gap-2 ${textSizeClasses.base}`}>{loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}{loading ? 'Sending...' : 'Send Report'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4"><h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>{selectedReport.title}</h2><button onClick={() => setShowReportDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <div className="space-y-4"><div className="flex justify-between"><div><p className={`text-gray-500 ${textSizeClasses.base}`}>From</p><p className={`font-semibold ${textSizeClasses.base}`}>{selectedReport.sender_full_name}</p></div><div><p className={`text-gray-500 ${textSizeClasses.base}`}>Priority</p><span className={`px-3 py-1 rounded-full text-sm ${getPriorityBadge(selectedReport.priority)}`}>{getPriorityIcon(selectedReport.priority)} {selectedReport.priority}</span></div></div>
            <div><p className={`text-gray-500 ${textSizeClasses.base}`}>Date Received</p><p className={`${textSizeClasses.base}`}>{new Date(selectedReport.sent_at).toLocaleString()}</p></div>
            <div className="bg-gray-50 p-5 rounded-xl"><p className={`text-gray-500 mb-2 ${textSizeClasses.base}`}>Message</p><p className={`whitespace-pre-wrap ${textSizeClasses.base}`}>{selectedReport.body}</p></div>
            {selectedReport.attachments?.length > 0 && (<div className="bg-gray-50 p-4 rounded-xl"><p className={`text-gray-500 mb-2 ${textSizeClasses.base}`}>Attachments</p>{selectedReport.attachments.map((att, idx) => (<div key={idx} className="flex items-center gap-2 text-blue-600"><FaPaperclip /><span>{att.name}</span></div>))}</div>)}
            <div className="flex gap-3 pt-4 border-t border-gray-200"><button onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} className={`flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 ${textSizeClasses.base}`}><FaReply /> Reply</button><button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className={`flex-1 px-4 py-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`}>Close</button></div></div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>Reply to Report</h2><button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <div className="mb-4 p-4 bg-gray-50 rounded-xl"><p className={`text-gray-500 ${textSizeClasses.base}`}>Original Report</p><p className={`font-medium ${textSizeClasses.base}`}>{selectedReport.title}</p><p className={`text-gray-400 mt-1 ${textSizeClasses.base}`}>From: {selectedReport.sender_full_name}</p></div>
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows="5" placeholder="Type your reply here..." className={`w-full p-3 border border-gray-300 rounded-xl resize-none ${textSizeClasses.base}`} />
            <div className="mt-3"><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Attachment (Optional)</label><input type="file" onChange={(e) => setReplyAttachment(e.target.files[0])} className={`w-full p-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`} /></div>
            <div className="flex gap-3 pt-4 mt-2"><button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className={`flex-1 px-4 py-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`}>Cancel</button><button onClick={handleSendReply} disabled={loading} className={`flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 ${textSizeClasses.base}`}>{loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}{loading ? 'Sending...' : 'Send Reply'}</button></div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>Change Password</h2><button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
            <div className="space-y-4"><input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} /><input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} /><input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} />
            <div className="flex gap-3 pt-4"><button onClick={() => setShowPasswordModal(false)} className={`flex-1 px-4 py-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`}>Cancel</button><button onClick={changePassword} className={`flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl ${textSizeClasses.base}`}>Change Password</button></div></div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className={`font-bold ${textSizeClasses.heading}`}>Patient Card</h2><button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button></div>
            <div className="border-2 border-blue-600 rounded-xl p-6 text-center"><p className={`font-bold text-gray-800 ${textSizeClasses.base}`}>{user?.hospital_name || 'Hospital'}</p><p className={`font-mono text-2xl font-bold text-blue-600 my-3 ${textSizeClasses.title}`}>{selectedPatient.card_number}</p><p className={`font-bold ${textSizeClasses.heading}`}>{selectedPatient.first_name} {selectedPatient.last_name}</p><p className={`${textSizeClasses.base}`}>{selectedPatient.gender} • {selectedPatient.age} years</p>{selectedPatient.phone && <p className={`${textSizeClasses.base}`}>📞 {selectedPatient.phone}</p>}<div className="mt-4 pt-4 border-t border-gray-200"><p className="text-xs text-gray-500">Registered: {new Date(selectedPatient.registered_at).toLocaleDateString()}</p></div></div>
            <div className="flex justify-end gap-3 mt-4"><button onClick={() => setShowPrintModal(false)} className={`px-4 py-2 border rounded-xl ${textSizeClasses.base}`}>Close</button><button onClick={() => window.print()} className={`px-4 py-2 bg-blue-600 text-white rounded-xl ${textSizeClasses.base}`}>Print</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardOfficeDashboard;