// frontend/src/components/TriageDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import { 
  FaHeartbeat, FaUsers, FaCheck, FaInbox, FaPaperPlane, 
  FaChartBar, FaUserCircle, FaSignOutAlt, FaChevronLeft, 
  FaChevronRight, FaEnvelope, FaEnvelopeOpen, FaReply, 
  FaKey, FaSave, FaSpinner, FaCheck as FaCheckIcon, 
  FaTextHeight, FaUndo, FaCalendarAlt, FaSync,
  FaEdit as FaEditIcon, FaPaperclip, FaClock, FaTimes,
  FaThermometerHalf, FaTachometerAlt, FaWeight, FaRuler,
  FaWheelchair, FaBaby, FaStethoscope, FaUserMd
} from 'react-icons/fa';

const TriageDashboard = ({ user, onLogout }) => {
  // ==================== HELPER: Get Hospital ID ====================
// LINE ~23 - Update getHospitalId
const getHospitalId = () => {
  if (!user) return null;
  return user?.hospital_id || user?.hospitalId;
};

// LINE ~700 - Update useEffect
useEffect(() => {
  const hospitalId = getHospitalId();
  
  if (!hospitalId) {
    console.warn('No hospital_id available - waiting for user data');
    return;
  }

  initializeSocket();
  fetchTriageQueue();
  fetchTriagedPatients();
  fetchStats();
  fetchReportsInbox();
  fetchReportsOutbox();
  fetchHospitalAdmins();
  fetchProfile();
  fetchMySchedule();

  const interval = setInterval(() => {
    fetchTriageQueue();
    fetchStats();
    fetchReportsInbox();
  }, 30000);

  return () => {
    if (socket.current) socket.current.disconnect();
    clearInterval(interval);
  };
}, [user?.hospital_id]); // ← ADD THIS DEPENDENCY

  // ==================== STATE MANAGEMENT ====================
  const [activeTab, setActiveTab] = useState('queue');
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
  const [tabHistory, setTabHistory] = useState(['queue']);
  
  // ==================== TRIAGE QUEUE STATES ====================
  const [triageQueue, setTriageQueue] = useState([]);
  const [triagedPatients, setTriagedPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [stats, setStats] = useState({
    waiting: 0,
    opd: 0,
    eme: 0,
    anc: 0
  });
  
  // ==================== SCHEDULE STATES ====================
  const [schedules, setSchedules] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleStats, setScheduleStats] = useState({ 
    today: { shift_count: 0, total_hours: 0 }, 
    this_week: { shift_count: 0, total_hours: 0 }, 
    total_hours: 0 
  });
  
  // ==================== VITAL SIGNS STATE ====================
  const [vitalsData, setVitalsData] = useState({
    blood_pressure: '',
    temperature: '',
    heart_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    pain_level: '',
    consciousness: 'Alert',
    is_pregnant: false,
    weeks_pregnant: '',
    chief_complaint: '',
    notes: ''
  });
  
  const [selectedWard, setSelectedWard] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [warningMessages, setWarningMessages] = useState({});
  
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
    department: 'Triage'
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
    const fontSizes = { small: '13px', normal: '15px', large: '17px', xlarge: '19px' };
    document.documentElement.style.fontSize = fontSizes[textSize] || '19px';
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

  // ==================== API CONFIGURATION ====================
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

  // ==================== GET SHIFT DISPLAY ====================
  const getShiftDisplay = (shiftType) => {
    const shifts = {
      morning: { name: '🌅 Morning', time: '08:00 - 14:00', hours: 6 },
      afternoon: { name: '☀️ Afternoon', time: '14:00 - 20:00', hours: 6 },
      night: { name: '🌙 Night', time: '20:00 - 08:00', hours: 12 }
    };
    return shifts[shiftType] || { name: shiftType, time: '--:-- - --:--', hours: 0 };
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

  // ==================== VALIDATION FUNCTIONS ====================
  const validateBloodPressure = (bp) => {
    if (!bp) return 'Blood pressure is required';
    const bpRegex = /^\d{2,3}\/\d{2,3}$/;
    if (!bpRegex.test(bp)) return 'Invalid format. Use format: 120/80';
    const [systolic, diastolic] = bp.split('/').map(Number);
    if (systolic < 70) return '⚠️ Systolic very low (< 70) - Critical!';
    if (systolic > 220) return '⚠️ Systolic critically high (> 220) - Emergency!';
    if (diastolic < 40) return '⚠️ Diastolic very low (< 40) - Critical!';
    if (diastolic > 130) return '⚠️ Diastolic critically high (> 130) - Emergency!';
    return '';
  };

  const validateTemperature = (temp) => {
    if (!temp) return 'Temperature is required';
    const numTemp = parseFloat(temp);
    if (isNaN(numTemp)) return 'Temperature must be a number';
    if (numTemp < 32) return '⚠️ Critically low temperature (< 32°C) - Severe hypothermia!';
    if (numTemp > 41) return '⚠️ Critically high temperature (> 41°C) - Hyperpyrexia! Emergency!';
    return '';
  };

  const validateHeartRate = (hr) => {
    if (!hr) return 'Heart rate is required';
    const numHr = parseInt(hr);
    if (isNaN(numHr)) return 'Heart rate must be a number';
    if (numHr < 40) return '⚠️ Severe bradycardia (< 40 bpm) - Emergency!';
    if (numHr > 180) return '⚠️ Severe tachycardia (> 180 bpm) - Emergency!';
    return '';
  };

  const validateOxygenSaturation = (o2) => {
    if (!o2) return 'Oxygen saturation is required';
    const numO2 = parseInt(o2);
    if (isNaN(numO2)) return 'Oxygen saturation must be a number';
    if (numO2 < 70) return '⚠️ Critically low O2 (< 70%) - Immediate intervention!';
    if (numO2 > 100) return 'O2 saturation cannot exceed 100%';
    return '';
  };

  const validateAllFields = () => {
    const errors = {};
    errors.blood_pressure = validateBloodPressure(vitalsData.blood_pressure);
    errors.temperature = validateTemperature(vitalsData.temperature);
    errors.heart_rate = validateHeartRate(vitalsData.heart_rate);
    errors.oxygen_saturation = validateOxygenSaturation(vitalsData.oxygen_saturation);
    setValidationErrors(errors);
    const hasErrors = Object.values(errors).some(error => error !== '' && !error.includes('⚠️'));
    return !hasErrors;
  };

  const calculateBMI = () => {
    if (vitalsData.weight && vitalsData.height) {
      const heightInM = vitalsData.height / 100;
      const bmi = vitalsData.weight / (heightInM * heightInM);
      const bmiValue = bmi.toFixed(1);
      if (bmi < 18.5) return `${bmiValue} (Underweight)`;
      if (bmi < 25) return `${bmiValue} (Normal)`;
      if (bmi < 30) return `${bmiValue} (Overweight)`;
      return `${bmiValue} (Obese)`;
    }
    return null;
  };

  const checkCriticalVitals = () => {
    let critical = false;
    if (vitalsData.blood_pressure) {
      const systolic = parseInt(vitalsData.blood_pressure.split('/')[0]);
      if (systolic > 200 || systolic < 70) critical = true;
    }
    if (vitalsData.temperature && (vitalsData.temperature < 32 || vitalsData.temperature > 41)) critical = true;
    if (vitalsData.heart_rate && (vitalsData.heart_rate < 40 || vitalsData.heart_rate > 160)) critical = true;
    if (vitalsData.oxygen_saturation && vitalsData.oxygen_saturation < 85) critical = true;
    if (vitalsData.consciousness !== 'Alert') critical = true;
    return critical;
  };

  // ==================== FETCH SCHEDULE ====================
  const fetchMySchedule = async () => {
    setScheduleLoading(true);
    try {
      const token = localStorage.getItem('token');
      // ✅ REMOVED /api/ prefix
      const response = await axios.get(`${API_URL}/triage/my-schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSchedules(response.data.schedules || []);
        setScheduleStats({
          today: response.data.stats?.today || { shift_count: 0, total_hours: 0 },
          this_week: response.data.stats?.this_week || { shift_count: 0, total_hours: 0 },
          total_hours: response.data.total_hours || 0
        });
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setSchedules([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  // ==================== FETCH DATA (REMOVED /api/ PREFIX) ====================
  const fetchTriageQueue = async () => {
    const hospitalId = getHospitalId();
    if (!hospitalId) {
      console.error('No hospital_id for fetchTriageQueue');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      // ✅ REMOVED /api/ prefix
      const response = await axios.get(`${API_URL}/triage/queue`, {
        params: { hospital_id: hospitalId },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTriageQueue(response.data.patients || []);
        setStats(prev => ({ ...prev, waiting: response.data.patients?.length || 0 }));
      }
    } catch (error) {
      console.error('Error fetching triage queue:', error);
    }
  };

  const fetchTriagedPatients = async () => {
    const hospitalId = getHospitalId();
    if (!hospitalId) return;
    
    try {
      const token = localStorage.getItem('token');
      // ✅ REMOVED /api/ prefix
      const response = await axios.get(`${API_URL}/triage/triaged`, {
        params: { hospital_id: hospitalId },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTriagedPatients(response.data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching triaged patients:', error);
    }
  };

  const fetchStats = async () => {
    const hospitalId = getHospitalId();
    if (!hospitalId) return;
    
    try {
      const token = localStorage.getItem('token');
      // ✅ REMOVED /api/ prefix
      const response = await axios.get(`${API_URL}/triage/stats`, {
        params: { hospital_id: hospitalId },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setStats(response.data.stats || { waiting: 0, opd: 0, eme: 0, anc: 0 });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // ==================== REPORT FUNCTIONS (REMOVED /api/ PREFIX) ====================
  const fetchReportsInbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      // ✅ REMOVED /api/ prefix
      const res = await axios.get(`${API_URL}/triage/reports/inbox`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setReportsInbox(res.data.reports || []);
        setUnreadReportsCount(res.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching reports inbox:', error);
      setReportsInbox([]);
      setUnreadReportsCount(0);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchReportsOutbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      // ✅ REMOVED /api/ prefix
      const res = await axios.get(`${API_URL}/triage/reports/outbox`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setReportsOutbox(res.data.reports || []);
    } catch (error) {
      console.error('Error fetching reports outbox:', error);
      setReportsOutbox([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchHospitalAdmins = async () => {
    const hospitalId = getHospitalId();
    if (!hospitalId) return;
    
    try {
      const token = localStorage.getItem('token');
      // ✅ REMOVED /api/ prefix
      const res = await axios.get(`${API_URL}/triage/hospital-admins`, {
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
      setHospitalAdmins([]);
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
      formData.append('body', sendReportForm.body);
      formData.append('priority', sendReportForm.priority);
      formData.append('recipient_id', sendReportForm.recipient_id);
      sendReportForm.attachments.forEach((file) => formData.append('attachments', file));
      
      // ✅ REMOVED /api/ prefix
      const res = await axios.post(`${API_URL}/triage/reports/send`, formData, {
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
      // ✅ REMOVED /api/ prefix
      await axios.put(`${API_URL}/triage/reports/${reportId}/read`, {}, {
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
      
      // ✅ REMOVED /api/ prefix
      const res = await axios.post(`${API_URL}/triage/reports/${selectedReport.id}/reply`, formData, {
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

  // ==================== PROFILE FUNCTIONS (REMOVED /api/ PREFIX) ====================
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      // ✅ REMOVED /api/ prefix
      const res = await axios.get(`${API_URL}/triage/profile`, {
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
          department: staff.department || 'Triage'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      // ✅ REMOVED /api/ prefix
      const res = await axios.put(`${API_URL}/triage/profile`, profileData, {
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
    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      // ✅ REMOVED /api/ prefix
      const res = await axios.put(`${API_URL}/triage/change-password`, {
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

  // ==================== TRIAGE FUNCTIONS ====================
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setSelectedWard('');
    setShowVitalsModal(true);
    setValidationErrors({});
    setWarningMessages({});
    setVitalsData({
      blood_pressure: '',
      temperature: '',
      heart_rate: '',
      respiratory_rate: '',
      oxygen_saturation: '',
      weight: '',
      height: '',
      pain_level: '',
      consciousness: 'Alert',
      is_pregnant: false,
      weeks_pregnant: '',
      chief_complaint: '',
      notes: ''
    });
  };

  const handleVitalsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValidationErrors(prev => ({ ...prev, [name]: '' }));
    setWarningMessages(prev => ({ ...prev, [name]: '' }));
    if (type === 'checkbox') {
      setVitalsData(prev => ({ ...prev, [name]: checked }));
    } else {
      setVitalsData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmitVitals = async (e) => {
    e.preventDefault();
    
    if (!validateAllFields()) {
      setMessage({ type: 'error', text: 'Please fix critical validation errors' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    if (!selectedWard) {
      setMessage({ type: 'error', text: 'Please select a ward' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const vitalsPayload = {
        blood_pressure: vitalsData.blood_pressure,
        temperature: vitalsData.temperature ? parseFloat(vitalsData.temperature) : null,
        heart_rate: vitalsData.heart_rate ? parseInt(vitalsData.heart_rate) : null,
        respiratory_rate: vitalsData.respiratory_rate ? parseInt(vitalsData.respiratory_rate) : null,
        oxygen_saturation: vitalsData.oxygen_saturation ? parseInt(vitalsData.oxygen_saturation) : null,
        weight: vitalsData.weight ? parseFloat(vitalsData.weight) : null,
        height: vitalsData.height ? parseFloat(vitalsData.height) : null,
        pain_level: vitalsData.pain_level ? parseInt(vitalsData.pain_level) : null,
        consciousness: vitalsData.consciousness,
        is_pregnant: vitalsData.is_pregnant,
        weeks_pregnant: vitalsData.weeks_pregnant ? parseInt(vitalsData.weeks_pregnant) : null,
        chief_complaint: vitalsData.chief_complaint || vitalsData.notes,
        notes: vitalsData.notes
      };

      // ✅ REMOVED /api/ prefix
      const response = await axios.post(`${API_URL}/triage/send-to-ward`, {
        patientId: selectedPatient.id,
        vitals: vitalsPayload,
        ward: selectedWard,
        notes: vitalsData.notes || vitalsData.chief_complaint
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (response.data.success) {
        setMessage({ type: 'success', text: `Patient sent to ${selectedWard} Ward` });
        setShowVitalsModal(false);
        setSelectedPatient(null);
        setSelectedWard('');
        fetchTriageQueue();
        fetchTriagedPatients();
        fetchStats();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(response.data.message || 'Failed to send patient');
      }
    } catch (error) {
      console.error('Error submitting vitals:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || error.message || 'Error sending patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==================== SOCKET CONNECTION ====================
  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    const hospitalId = getHospitalId();
    
    socket.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socket.current.on('connect', () => {
      console.log('✅ Triage socket connected');
      setConnectionStatus('connected');
      if (hospitalId) {
        socket.current.emit('join_triage', hospitalId);
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

    socket.current.on('new_patient_registered', (data) => {
      if (data.hospital_id == hospitalId) {
        setRealTimeNotification({
          id: Date.now(),
          type: 'new_patient',
          title: 'New Patient Arrived',
          message: `${data.patient_name} is waiting for triage`,
          priority: 'medium',
          timestamp: new Date()
        });
        fetchTriageQueue();
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
      'in_triage': { bg: 'bg-amber-100', color: 'text-amber-800', text: 'Waiting for Triage' },
      'in_opd': { bg: 'bg-green-100', color: 'text-green-800', text: 'In OPD Ward' },
      'in_emergency': { bg: 'bg-red-100', color: 'text-red-800', text: 'In EME Ward' },
      'in_anc': { bg: 'bg-purple-100', color: 'text-purple-800', text: 'In ANC Ward' },
      'with_doctor': { bg: 'bg-blue-100', color: 'text-blue-800', text: 'With Doctor' },
      'admitted': { bg: 'bg-orange-100', color: 'text-orange-800', text: 'Admitted' },
      'discharged': { bg: 'bg-gray-100', color: 'text-gray-800', text: 'Discharged' },
      'referred': { bg: 'bg-pink-100', color: 'text-pink-800', text: 'Referred' }
    };
    return styles[status] || { bg: 'bg-gray-100', color: 'text-gray-800', text: status || 'Unknown' };
  };

  const getWardStyle = (ward) => {
    const styles = {
      'OPD': { bg: 'bg-green-100', color: 'text-green-800', text: 'OPD Ward' },
      'EME': { bg: 'bg-red-100', color: 'text-red-800', text: 'EME Ward' },
      'ANC': { bg: 'bg-purple-100', color: 'text-purple-800', text: 'ANC Ward' }
    };
    return styles[ward] || { bg: 'bg-gray-100', color: 'text-gray-800', text: 'Not Assigned' };
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
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-teal-100">
                {realTimeNotification.type === 'reply' ? '💬' : realTimeNotification.type === 'new_patient' ? '🆕' : '📬'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className={`font-bold text-gray-900 ${textSizeClasses.heading}`}>{realTimeNotification.title}</p>
                <span className={`text-gray-400 ml-2 ${textSizeClasses.base}`}>{getPriorityIcon(realTimeNotification.priority)} {realTimeNotification.priority}</span>
              </div>
              <p className={`text-gray-600 mb-2 ${textSizeClasses.base}`}>{realTimeNotification.message}</p>
              <div className="flex items-center gap-3 text-gray-400 text-sm">
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
          className={`h-1 ${realTimeNotification.priority === 'urgent' ? 'bg-red-500' : 'bg-teal-500'}`}
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
    const hospitalId = getHospitalId();
    if (!hospitalId) {
      console.warn('No hospital_id available on initial load');
      return;
    }

    initializeSocket();
    fetchTriageQueue();
    fetchTriagedPatients();
    fetchStats();
    fetchReportsInbox();
    fetchReportsOutbox();
    fetchHospitalAdmins();
    fetchProfile();
    fetchMySchedule();

    const interval = setInterval(() => {
      fetchTriageQueue();
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
    <div className={`min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex ${textSizeClasses.base}`}>
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
              <p className={`text-gray-600 mb-8 ${textSizeClasses.base}`}>Are you sure you want to logout from Triage Dashboard?</p>
              <div className="flex gap-4">
                <button onClick={handleCancelLogout} className={`flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium ${textSizeClasses.base}`}>No, Stay</button>
                <button onClick={handleConfirmLogout} className={`flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium ${textSizeClasses.base}`}>Yes, Logout</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      <style>{`
        @keyframes glow { 0% { box-shadow: 0 0 5px rgba(13,148,136,0.2); } 50% { box-shadow: 0 0 20px rgba(13,148,136,0.5); } 100% { box-shadow: 0 0 5px rgba(13,148,136,0.2); } }
        .animate-glow { animation: glow 2s infinite; }
        .white-teal-card { background: white !important; border: 2px solid #ccfbf1 !important; border-radius: 1rem !important; padding: 1.5rem !important; box-shadow: 0 4px 12px rgba(13,148,136,0.1) !important; transition: all 0.3s ease !important; }
        .white-teal-card:hover { box-shadow: 0 8px 24px rgba(13,148,136,0.15) !important; border-color: #0d9488 !important; }
      `}</style>

      {/* ==================== SIDEBAR ==================== */}
      <div className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ${
        sidebarCollapsed ? 'w-24' : 'w-72'
      } shadow-2xl flex flex-col h-screen sticky top-0 z-50`}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FaHeartbeat className="text-white text-lg" />
                </div>
                <span className={`font-bold tracking-tight ${textSizeClasses.heading}`}>Triage Nurse</span>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg mx-auto">
                <FaHeartbeat className="text-white text-lg" />
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-slate-700 rounded-xl transition-colors">
              {sidebarCollapsed ? <FaChevronRight size={20} /> : <FaChevronLeft size={20} />}
            </button>
          </div>

          <nav className="space-y-2">
            <button onClick={() => handleTabChange('queue', false)} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              activeTab === 'queue' && !showScheduleView ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaUsers className="text-xl" />
              {!sidebarCollapsed && <span>Triage Queue</span>}
              {!sidebarCollapsed && triageQueue.length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                  {triageQueue.length}
                </span>
              )}
            </button>

            <button onClick={() => handleTabChange('triaged', false)} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              activeTab === 'triaged' && !showScheduleView ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaCheck className="text-xl" />
              {!sidebarCollapsed && <span>Triaged Patients</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            <button onClick={() => { handleTabChange('inbox', false); fetchReportsInbox(); }} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} relative ${
              activeTab === 'inbox' && !showScheduleView ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
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
              activeTab === 'outbox' && !showScheduleView ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaPaperPlane className="text-xl" />
              {!sidebarCollapsed && <span>Sent Reports</span>}
            </button>

            <button onClick={() => handleTabChange('reports', false)} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              activeTab === 'reports' && !showScheduleView ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaChartBar className="text-xl" />
              {!sidebarCollapsed && <span>Statistics</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            <button onClick={() => handleTabChange('schedule', true)} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              showScheduleView ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaCalendarAlt className="text-xl" />
              {!sidebarCollapsed && <span>My Schedule</span>}
            </button>

            <div className="h-px bg-slate-700/50 my-4 mx-3"></div>

            <button onClick={() => handleTabChange('profile', false)} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${textSizeClasses.base} ${
              activeTab === 'profile' && !showScheduleView ? 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg' : 'hover:bg-slate-700'
            }`}>
              <FaUserCircle className="text-xl" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
          </nav>

          {sidebarCollapsed && (
            <div className="mt-8 text-center">
              <div className={`text-2xl font-bold text-teal-400 ${textSizeClasses.title}`}>{triageQueue.length}</div>
              <div className="text-xs text-slate-400 mt-1">Queue</div>
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
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 py-8 px-10 shadow-xl sticky top-0 z-40">
          <div className="max-w-[1600px] mx-auto flex justify-between items-center flex-wrap gap-5">
            <div className="flex items-center gap-5">
              <button onClick={handleGoBack} className="bg-white/20 backdrop-blur p-3 rounded-xl text-white hover:bg-white/30 transition-all duration-200 shadow-lg flex items-center gap-2">
                <FaUndo className="text-white text-lg" />
                <span className={`hidden sm:inline ${textSizeClasses.base}`}>Back</span>
              </button>
              
              <div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-glow">
                    <FaHeartbeat className="text-white" />
                  </div>
                  <div>
                    <h1 className={`font-bold text-white drop-shadow-md tracking-tight ${textSizeClasses.title}`}>
                      {activeTab === 'queue' && !showScheduleView && 'Triage Queue'}
                      {activeTab === 'triaged' && !showScheduleView && 'Triaged Patients'}
                      {activeTab === 'inbox' && !showScheduleView && 'Reports - Inbox'}
                      {activeTab === 'outbox' && !showScheduleView && 'Reports - Sent'}
                      {activeTab === 'reports' && !showScheduleView && 'Triage Statistics'}
                      {showScheduleView && 'My Work Schedule'}
                      {activeTab === 'profile' && !showScheduleView && 'My Profile'}
                    </h1>
                    <p className={`text-white/90 mt-2 flex items-center gap-3 flex-wrap ${textSizeClasses.base}`}>
                      <span>{formatFullName(user)}</span>
                      <span className="text-white/50 text-lg">•</span>
                      <span>{user?.hospital_name || 'Hospital'}</span>
                      <span className="bg-white/20 px-4 py-1 rounded-full text-sm font-medium backdrop-blur">Triage Department</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative">
                <button onClick={() => setShowTextSizeMenu(!showTextSizeMenu)} className="bg-white/20 backdrop-blur px-4 py-3 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg">
                  <FaTextHeight className="text-lg" />
                  <span className={`hidden md:inline ${textSizeClasses.base}`}>Text Size</span>
                </button>
                {showTextSizeMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                    {['small', 'normal', 'large', 'xlarge'].map(size => (
                      <button key={size} onClick={() => { setTextSize(size); setShowTextSizeMenu(false); }} className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition flex items-center justify-between ${textSize === size ? 'bg-teal-50 text-teal-600' : 'text-gray-700'} ${textSizeClasses.base}`}>
                        <span className="capitalize">{size}</span>
                        {textSize === size && <FaCheckIcon className="text-teal-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <SocketStatusIndicator />
              <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className="bg-white/20 backdrop-blur px-5 py-3 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg font-medium">
                <FaPaperPlane className="text-base" /> Send Report
              </button>
              <button onClick={() => { fetchTriageQueue(); fetchStats(); }} className="bg-white/20 backdrop-blur px-5 py-3 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition-all duration-200 shadow-lg font-medium">
                <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <div className="flex gap-5 bg-white/10 backdrop-blur py-3 px-6 rounded-full">
                <div className="text-center"><div className={`font-bold text-white ${textSizeClasses.title}`}>{stats.waiting}</div><div className="text-xs text-white/70">Waiting</div></div>
                <div className="w-px h-10 bg-white/30" />
                <div className="text-center"><div className={`font-bold text-white ${textSizeClasses.title}`}>{stats.opd}</div><div className="text-xs text-white/70">OPD</div></div>
                <div className="w-px h-10 bg-white/30" />
                <div className="text-center"><div className={`font-bold text-white ${textSizeClasses.title}`}>{stats.eme}</div><div className="text-xs text-white/70">EME</div></div>
                <div className="w-px h-10 bg-white/30" />
                <div className="text-center"><div className={`font-bold text-white ${textSizeClasses.title}`}>{stats.anc}</div><div className="text-xs text-white/70">ANC</div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto p-10">
          {/* Message Display */}
          {message.text && (
            <div className={`mb-6 p-5 rounded-xl border-l-4 ${message.type === 'error' ? 'bg-red-50 border-red-500 text-red-700' : message.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-blue-50 border-blue-500 text-blue-700'} flex justify-between items-center ${textSizeClasses.base}`}>
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: '', text: '' })} className="text-xl">×</button>
            </div>
          )}

          {/* Triage Queue Tab */}
          {activeTab === 'queue' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className={`font-bold text-gray-800 mb-6 ${textSizeClasses.heading}`}>Patients Waiting for Triage</h2>
              {triageQueue.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <FaUsers className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className={`text-gray-500 ${textSizeClasses.base}`}>No patients waiting for triage</p>
                  <p className={`text-gray-400 mt-2 ${textSizeClasses.base}`}>Patients from Card Office will appear here automatically</p>
                  <p className={`text-teal-500 mt-4 text-sm`}>Hospital ID: {getHospitalId()}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {triageQueue.map(patient => (
                    <div key={patient.id} className="white-teal-card">
                      <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`font-mono text-teal-600 bg-teal-50 px-3 py-1 rounded ${textSizeClasses.base}`}>{patient.card_number}</span>
                            <span className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(patient.status).bg} ${getStatusStyle(patient.status).color}`}>{getStatusStyle(patient.status).text}</span>
                          </div>
                          <h3 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>{patient.first_name} {patient.middle_name || ''} {patient.last_name}</h3>
                          <p className={`text-gray-500 mt-1 ${textSizeClasses.base}`}>{patient.age} years • {patient.gender}{patient.phone && ` • 📞 ${patient.phone}`}</p>
                          <p className={`text-gray-400 text-sm mt-1`}>Registered: {new Date(patient.registered_at).toLocaleTimeString()}</p>
                        </div>
                        <button onClick={() => handleSelectPatient(patient)} className={`px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition font-medium ${textSizeClasses.base}`}>
                          Record Vitals
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Triaged Patients Tab */}
          {activeTab === 'triaged' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className={`font-bold text-gray-800 mb-6 ${textSizeClasses.heading}`}>Recently Triaged Patients</h2>
              {triagedPatients.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <FaCheck className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className={`text-gray-500 ${textSizeClasses.base}`}>No patients triaged yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {triagedPatients.slice(0, 20).map(patient => {
                    const wardStyle = getWardStyle(patient.ward);
                    const statusStyle = getStatusStyle(patient.status);
                    return (
                      <div key={patient.id} className="white-teal-card">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`font-mono text-teal-600 bg-teal-50 px-3 py-1 rounded ${textSizeClasses.base}`}>{patient.card_number}</span>
                              <span className={`px-3 py-1 rounded-full text-sm ${wardStyle.bg} ${wardStyle.color}`}>{wardStyle.text}</span>
                              <span className={`px-3 py-1 rounded-full text-sm ${statusStyle.bg} ${statusStyle.color}`}>{statusStyle.text}</span>
                            </div>
                            <h3 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>{patient.first_name} {patient.middle_name || ''} {patient.last_name}</h3>
                            <p className={`text-gray-500 mt-1 ${textSizeClasses.base}`}>{patient.age} years • {patient.gender}</p>
                            <p className={`text-gray-400 text-sm mt-1`}>Triaged by: {patient.triage_info?.triaged_by || 'N/A'} at {new Date(patient.triaged_at || patient.registered_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>📬 Inbox</h2>
                  {unreadReportsCount > 0 && <span className={`px-3 py-1 bg-red-500 text-white rounded-full animate-pulse ${textSizeClasses.base}`}>{unreadReportsCount} unread</span>}
                </div>
                <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); }} className={`px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition font-medium ${textSizeClasses.base}`}>New Report</button>
              </div>
              {reportsLoading ? (
                <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-teal-600 mx-auto" /></div>
              ) : reportsInbox.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><FaInbox className="text-6xl text-gray-300 mx-auto mb-4" /><p className={`text-gray-500 ${textSizeClasses.base}`}>No reports in inbox</p></div>
              ) : (
                <div className="space-y-4">
                  {reportsInbox.map(report => (
                    <div key={report.id} className={`white-teal-card cursor-pointer ${!report.is_opened ? 'border-teal-300 bg-teal-50' : ''}`} onClick={() => viewReportDetails(report)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {!report.is_opened ? <FaEnvelope className="text-teal-500 text-xl" /> : <FaEnvelopeOpen className="text-gray-400 text-xl" />}
                          <h3 className={`font-semibold text-gray-800 ${textSizeClasses.base}`}>{report.title}</h3>
                        </div>
                        <span className={`text-sm px-3 py-1.5 rounded-full ${getPriorityBadge(report.priority)}`}>{getPriorityIcon(report.priority)} {report.priority}</span>
                      </div>
                      <p className={`text-gray-600 mb-3 line-clamp-2 ${textSizeClasses.base}`}>{report.body?.substring(0, 100)}...</p>
                      <div className={`flex justify-between items-center text-gray-500 ${textSizeClasses.base}`}>
                        <span>From: {report.sender_full_name}</span>
                        <span>{new Date(report.sent_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Outbox Tab */}
          {activeTab === 'outbox' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>📤 Sent Reports</h2>
                <button onClick={() => fetchReportsOutbox()} className={`px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium ${textSizeClasses.base}`}>Refresh</button>
              </div>
              {reportsLoading ? (
                <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-teal-600 mx-auto" /></div>
              ) : reportsOutbox.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><FaPaperPlane className="text-6xl text-gray-300 mx-auto mb-4" /><p className={`text-gray-500 ${textSizeClasses.base}`}>No sent reports</p></div>
              ) : (
                <div className="space-y-4">
                  {reportsOutbox.map(report => (
                    <div key={report.id} className="white-teal-card cursor-pointer" onClick={() => viewReportDetails(report)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3"><FaPaperPlane className="text-gray-400 text-xl" /><h3 className={`font-semibold text-gray-800 ${textSizeClasses.base}`}>{report.title}</h3></div>
                        <span className={`text-sm px-3 py-1.5 rounded-full ${getPriorityBadge(report.priority)}`}>{getPriorityIcon(report.priority)} {report.priority}</span>
                      </div>
                      <p className={`text-gray-600 mb-3 line-clamp-2 ${textSizeClasses.base}`}>{report.body?.substring(0, 100)}...</p>
                      <div className={`flex justify-between items-center text-gray-500 ${textSizeClasses.base}`}>
                        <span>To: {report.recipient_full_name}</span>
                        <span>Sent: {new Date(report.sent_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-3"><span className={`${report.is_opened ? 'text-green-600' : 'text-gray-400'} ${textSizeClasses.base}`}>{report.is_opened ? '✓ Opened by recipient' : '✗ Not opened yet'}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'reports' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className={`font-bold text-gray-800 mb-6 ${textSizeClasses.heading}`}>📊 Triage Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="white-teal-card"><p className={`text-teal-600 mb-2 font-semibold ${textSizeClasses.base}`}>Waiting for Triage</p><p className={`font-bold text-gray-800 ${textSizeClasses.title}`}>{stats.waiting}</p></div>
                <div className="white-teal-card"><p className={`text-green-600 mb-2 font-semibold ${textSizeClasses.base}`}>OPD Ward</p><p className={`font-bold text-gray-800 ${textSizeClasses.title}`}>{stats.opd}</p></div>
                <div className="white-teal-card"><p className={`text-red-600 mb-2 font-semibold ${textSizeClasses.base}`}>EME Ward</p><p className={`font-bold text-gray-800 ${textSizeClasses.title}`}>{stats.eme}</p></div>
                <div className="white-teal-card"><p className={`text-purple-600 mb-2 font-semibold ${textSizeClasses.base}`}>ANC Ward</p><p className={`font-bold text-gray-800 ${textSizeClasses.title}`}>{stats.anc}</p></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className={`text-gray-600 ${textSizeClasses.base}`}>Today's Triage Summary: {triagedPatients.length} patients processed</p>
                <p className={`text-sm text-gray-400 mt-2`}>Waiting: {stats.waiting} | In Wards: {stats.opd + stats.eme + stats.anc}</p>
              </div>
            </div>
          )}

          {/* Schedule View Tab */}
          {showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FaCalendarAlt className="text-white text-xl" />
                  </div>
                  <div>
                    <h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>My Work Schedule</h2>
                    <p className={`text-gray-500 ${textSizeClasses.base}`}>View your upcoming shifts</p>
                  </div>
                </div>
                <button onClick={fetchMySchedule} className={`px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium flex items-center gap-2 ${textSizeClasses.base}`}>
                  <FaSync className={`${scheduleLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-teal-50 rounded-xl p-4 text-center">
                  <p className={`text-teal-600 ${textSizeClasses.base}`}>Today's Shifts</p>
                  <p className={`font-bold text-teal-800 ${textSizeClasses.title}`}>{scheduleStats.today?.shift_count || 0}</p>
                  <p className={`text-sm text-teal-500`}>{scheduleStats.today?.total_hours || 0} hours</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className={`text-emerald-600 ${textSizeClasses.base}`}>This Week</p>
                  <p className={`font-bold text-emerald-800 ${textSizeClasses.title}`}>{scheduleStats.this_week?.shift_count || 0}</p>
                  <p className={`text-sm text-emerald-500`}>{scheduleStats.this_week?.total_hours || 0} hours</p>
                </div>
                <div className="bg-teal-50 rounded-xl p-4 text-center">
                  <p className={`text-teal-600 ${textSizeClasses.base}`}>Total Hours</p>
                  <p className={`font-bold text-teal-800 ${textSizeClasses.title}`}>{scheduleStats.total_hours || 0}</p>
                  <p className={`text-sm text-teal-500`}>Scheduled</p>
                </div>
              </div>

              {scheduleLoading ? (
                <div className="text-center py-12"><FaSpinner className="animate-spin text-3xl text-teal-600 mx-auto" /></div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <FaCalendarAlt className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className={`text-gray-500 ${textSizeClasses.base}`}>No schedules found</p>
                  <p className={`text-sm text-gray-400 mt-2`}>Your shifts will appear here when assigned</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {schedules.map(schedule => {
                    const shift = getShiftDisplay(schedule.shift_type);
                    return (
                      <div key={schedule.id} className="white-teal-card flex justify-between items-center flex-wrap gap-4">
                        <div>
                          <p className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>
                            {new Date(schedule.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          <p className={`text-gray-600 mt-1 ${textSizeClasses.base}`}>
                            <FaClock className="inline mr-2" /> {shift.name} Shift • {shift.time}
                          </p>
                          {schedule.ward && <p className={`text-gray-500 text-sm mt-1`}>🏥 Ward: {schedule.ward}</p>}
                        </div>
                        <div className="text-right">
                          <span className={`px-4 py-2 rounded-full text-sm font-medium ${schedule.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {schedule.status === 'active' ? '✅ Active' : '📋 Scheduled'}
                          </span>
                          <p className={`text-gray-400 text-sm mt-2`}>{shift.hours} hours</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-10 py-12">
                <div className="flex items-center gap-8">
                  <div className="relative">
                    <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-xl">
                      <FaUserCircle className="text-teal-600 text-7xl" />
                    </div>
                  </div>
                  <div className="text-white">
                    <h2 className={`font-bold mb-2 ${textSizeClasses.title}`}>
                      {profileData.first_name} {profileData.middle_name ? profileData.middle_name + ' ' : ''}{profileData.last_name}
                    </h2>
                    <p className={`text-teal-100 flex items-center gap-3 ${textSizeClasses.base}`}>
                      <FaHeartbeat className="text-lg" /> {profileData.department || 'Triage'} Nurse
                    </p>
                    <p className={`text-teal-100 mt-2 opacity-80 ${textSizeClasses.base}`}>{user?.hospital_name}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>Professional Information</h3>
                  {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} className={`flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-medium ${textSizeClasses.base}`}><FaEditIcon /> Edit Profile</button>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => setIsEditingProfile(false)} className={`px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition ${textSizeClasses.base}`}>Cancel</button>
                      <button onClick={updateProfile} className={`flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition ${textSizeClasses.base}`}><FaSave /> Save</button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className={`font-semibold text-teal-600 mb-5 flex items-center gap-2 ${textSizeClasses.base}`}><FaUserCircle /> Personal Info</h4>
                    <div className="space-y-4">
                      <div><label className={`text-gray-500 ${textSizeClasses.base}`}>First Name</label>{isEditingProfile ? (<input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} />) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.first_name || 'Not set'}</p>)}</div>
                      <div><label className={`text-gray-500 ${textSizeClasses.base}`}>Middle Name</label>{isEditingProfile ? (<input type="text" value={profileData.middle_name} onChange={(e) => setProfileData({...profileData, middle_name: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} />) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.middle_name || '—'}</p>)}</div>
                      <div><label className={`text-gray-500 ${textSizeClasses.base}`}>Last Name</label>{isEditingProfile ? (<input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} />) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.last_name || 'Not set'}</p>)}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={`text-gray-500 ${textSizeClasses.base}`}>Gender</label>{isEditingProfile ? (<select value={profileData.gender} onChange={(e) => setProfileData({...profileData, gender: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`}><option>Male</option><option>Female</option><option>Other</option></select>) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.gender || 'Not set'}</p>)}</div>
                        <div><label className={`text-gray-500 ${textSizeClasses.base}`}>Age</label>{isEditingProfile ? (<input type="number" value={profileData.age} onChange={(e) => setProfileData({...profileData, age: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} />) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.age ? `${profileData.age} years` : 'Not set'}</p>)}</div>
                      </div>
                      <div><label className={`text-gray-500 ${textSizeClasses.base}`}>Phone</label>{isEditingProfile ? (<input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} />) : (<p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.phone || 'Not set'}</p>)}</div>
                      <div><label className={`text-gray-500 ${textSizeClasses.base}`}>Email</label><p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.email || 'Not set'}</p></div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className={`font-semibold text-teal-600 mb-5 flex items-center gap-2 ${textSizeClasses.base}`}><FaKey /> Account Settings</h4>
                    <button onClick={() => setShowPasswordModal(true)} className={`flex items-center gap-2 px-5 py-3 border border-teal-600 text-teal-600 rounded-xl hover:bg-teal-50 transition font-medium w-full justify-center ${textSizeClasses.base}`}><FaKey /> Change Password</button>
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h5 className={`font-medium text-gray-700 mb-3 ${textSizeClasses.base}`}>Account Info</h5>
                      <div className={`space-y-3 ${textSizeClasses.base}`}>
                        <div className="flex justify-between"><span className="text-gray-500">Role:</span><span className="text-gray-800 font-medium">Triage Nurse</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Department:</span><span className="text-gray-800">{profileData.department || 'Triage'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="text-green-600">● Active</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Report Modal */}
      {showSendReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>Send Report</h2>
              <button onClick={() => setShowSendReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <form onSubmit={handleSendReport} className="space-y-4">
              <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Recipient *</label><select value={sendReportForm.recipient_id} onChange={(e) => setSendReportForm({...sendReportForm, recipient_id: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} required><option value="">Select Hospital Admin...</option>{hospitalAdmins.map(admin => (<option key={admin.id} value={admin.id}>{admin.full_name} - {admin.hospital_name}</option>))}</select></div>
              <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Priority</label><select value={sendReportForm.priority} onChange={(e) => setSendReportForm({...sendReportForm, priority: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`}><option value="low">🟢 Low</option><option value="medium">🟡 Medium</option><option value="high">🟠 High</option><option value="urgent">🔴 Urgent</option></select></div>
              <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Title *</label><input type="text" value={sendReportForm.title} onChange={(e) => setSendReportForm({...sendReportForm, title: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} required /></div>
              <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Message *</label><textarea value={sendReportForm.body} onChange={(e) => setSendReportForm({...sendReportForm, body: e.target.value})} rows="5" className={`w-full p-3 border border-gray-300 rounded-xl resize-none ${textSizeClasses.base}`} required /></div>
              <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Attachments</label><input type="file" ref={fileInputRef} onChange={(e) => { const files = Array.from(e.target.files); setSendReportForm(prev => ({ ...prev, attachments: [...prev.attachments, ...files] })); }} multiple className={`w-full p-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`} /></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowSendReportModal(false)} className={`px-5 py-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`}>Cancel</button><button type="submit" disabled={loading} className={`px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl flex items-center gap-2 ${textSizeClasses.base}`}>{loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}{loading ? 'Sending...' : 'Send Report'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Vitals Modal */}
      {showVitalsModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`font-bold text-gray-800 ${textSizeClasses.title}`}>Record Vital Signs</h2>
                <button onClick={() => setShowVitalsModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
              </div>
              <div className="mb-6 p-5 bg-teal-50 rounded-xl border border-teal-200">
                <p className={textSizeClasses.base}><strong>Patient:</strong> {selectedPatient.first_name} {selectedPatient.middle_name || ''} {selectedPatient.last_name}</p>
                <p className={`mt-2 ${textSizeClasses.base}`}><strong>Card:</strong> {selectedPatient.card_number}</p>
                <p className={`mt-2 ${textSizeClasses.base}`}><strong>Age/Gender:</strong> {selectedPatient.age} years / {selectedPatient.gender}</p>
              </div>
              <form onSubmit={handleSubmitVitals}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Blood Pressure <span className="text-red-500">*</span></label><input type="text" name="blood_pressure" value={vitalsData.blood_pressure} onChange={handleVitalsChange} required placeholder="120/80" className={`w-full p-3 border rounded-lg ${textSizeClasses.base} ${validationErrors.blood_pressure ? 'border-red-500' : 'border-gray-300'}`} /><p className="text-red-500 text-sm mt-1">{validationErrors.blood_pressure}</p></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Temperature (°C) <span className="text-red-500">*</span></label><input type="number" name="temperature" value={vitalsData.temperature} onChange={handleVitalsChange} required step="0.1" placeholder="36.6" className={`w-full p-3 border rounded-lg ${textSizeClasses.base} ${validationErrors.temperature ? 'border-red-500' : 'border-gray-300'}`} /><p className="text-red-500 text-sm mt-1">{validationErrors.temperature}</p></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Heart Rate (bpm) <span className="text-red-500">*</span></label><input type="number" name="heart_rate" value={vitalsData.heart_rate} onChange={handleVitalsChange} required placeholder="72" className={`w-full p-3 border rounded-lg ${textSizeClasses.base} ${validationErrors.heart_rate ? 'border-red-500' : 'border-gray-300'}`} /><p className="text-red-500 text-sm mt-1">{validationErrors.heart_rate}</p></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Respiratory Rate</label><input type="number" name="respiratory_rate" value={vitalsData.respiratory_rate} onChange={handleVitalsChange} placeholder="16" className="w-full p-3 border border-gray-300 rounded-lg" /></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>O2 Saturation (%) <span className="text-red-500">*</span></label><input type="number" name="oxygen_saturation" value={vitalsData.oxygen_saturation} onChange={handleVitalsChange} required placeholder="98" min="0" max="100" className={`w-full p-3 border rounded-lg ${textSizeClasses.base} ${validationErrors.oxygen_saturation ? 'border-red-500' : 'border-gray-300'}`} /><p className="text-red-500 text-sm mt-1">{validationErrors.oxygen_saturation}</p></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Pain Level (0-10)</label><input type="number" name="pain_level" value={vitalsData.pain_level} onChange={handleVitalsChange} min="0" max="10" placeholder="0" className="w-full p-3 border border-gray-300 rounded-lg" /></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Weight (kg)</label><input type="number" name="weight" value={vitalsData.weight} onChange={handleVitalsChange} step="0.1" placeholder="70" className="w-full p-3 border border-gray-300 rounded-lg" /></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Height (cm)</label><input type="number" name="height" value={vitalsData.height} onChange={handleVitalsChange} step="0.1" placeholder="170" className="w-full p-3 border border-gray-300 rounded-lg" /></div>
                  <div className="md:col-span-2"><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Consciousness Level</label><select name="consciousness" value={vitalsData.consciousness} onChange={handleVitalsChange} className="w-full p-3 border border-gray-300 rounded-lg"><option value="Alert">Alert</option><option value="Verbal">Verbal</option><option value="Pain">Pain</option><option value="Unresponsive">Unresponsive</option></select></div>
                  <div className="md:col-span-2"><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>BMI (calculated)</label><input type="text" value={calculateBMI() || '—'} disabled className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100" /></div>
                  {selectedPatient.gender === 'Female' && selectedPatient.age >= 15 && selectedPatient.age <= 50 && (
                    <>
                      <div className="md:col-span-2"><label className={`flex items-center gap-3 ${textSizeClasses.base}`}><input type="checkbox" name="is_pregnant" checked={vitalsData.is_pregnant} onChange={handleVitalsChange} className="w-5 h-5" /><span className="font-medium">Patient is pregnant</span></label></div>
                      {vitalsData.is_pregnant && (<div className="md:col-span-2"><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Weeks Pregnant</label><input type="number" name="weeks_pregnant" value={vitalsData.weeks_pregnant} onChange={handleVitalsChange} min="1" max="42" className="w-full p-3 border border-gray-300 rounded-lg" /></div>)}
                    </>
                  )}
                  <div className="md:col-span-2"><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Chief Complaint / Clinical Notes</label><textarea name="notes" value={vitalsData.notes} onChange={handleVitalsChange} rows="4" placeholder="Enter chief complaint or clinical notes..." className="w-full p-3 border border-gray-300 rounded-lg" /></div>
                  {checkCriticalVitals() && (<div className="md:col-span-2 bg-red-50 text-red-700 p-4 rounded-lg border border-red-500 text-center font-bold">🚨 CRITICAL VITALS DETECTED - Patient requires immediate attention! Recommended: EME Ward</div>)}
                  <div className="md:col-span-2 mt-5 pt-5 border-t-2 border-gray-200">
                    <h3 className={`font-bold mb-4 ${textSizeClasses.heading}`}>Assign Patient to Ward</h3>
                    <div className="flex gap-5 flex-wrap">
                      <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer flex-1 min-w-[140px] ${selectedWard === 'OPD' ? 'border-2 border-green-500 bg-green-50' : 'border border-gray-300 bg-white'}`}>
                        <input type="radio" name="ward" value="OPD" checked={selectedWard === 'OPD'} onChange={(e) => setSelectedWard(e.target.value)} className="w-5 h-5" />
                        <div><span className="font-bold text-green-700 text-lg">OPD</span><br /><span className="text-gray-500 text-sm">Outpatient</span></div>
                      </label>
                      <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer flex-1 min-w-[140px] ${selectedWard === 'EME' ? 'border-2 border-red-500 bg-red-50' : 'border border-gray-300 bg-white'}`}>
                        <input type="radio" name="ward" value="EME" checked={selectedWard === 'EME'} onChange={(e) => setSelectedWard(e.target.value)} className="w-5 h-5" />
                        <div><span className="font-bold text-red-700 text-lg">EME</span><br /><span className="text-gray-500 text-sm">Emergency</span></div>
                      </label>
                      <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer flex-1 min-w-[140px] ${selectedWard === 'ANC' ? 'border-2 border-purple-500 bg-purple-50' : 'border border-gray-300 bg-white'}`}>
                        <input type="radio" name="ward" value="ANC" checked={selectedWard === 'ANC'} onChange={(e) => setSelectedWard(e.target.value)} className="w-5 h-5" />
                        <div><span className="font-bold text-purple-700 text-lg">ANC</span><br /><span className="text-gray-500 text-sm">Antenatal</span></div>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-4">
                  <button type="button" onClick={() => setShowVitalsModal(false)} className={`px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition ${textSizeClasses.base}`}>Cancel</button>
                  <button type="submit" disabled={loading} className={`px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 ${textSizeClasses.base}`}>{loading ? <FaSpinner className="animate-spin inline mr-2" /> : null}{loading ? 'Processing...' : 'Complete Triage & Send to Ward'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {showReportDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>{selectedReport.title}</h2>
              <button onClick={() => setShowReportDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between flex-wrap gap-3">
                <div><p className={`text-gray-500 ${textSizeClasses.base}`}>From</p><p className={`font-semibold ${textSizeClasses.base}`}>{selectedReport.sender_full_name}</p></div>
                <div><p className={`text-gray-500 ${textSizeClasses.base}`}>Priority</p><span className={`px-3 py-1 rounded-full text-sm ${getPriorityBadge(selectedReport.priority)}`}>{getPriorityIcon(selectedReport.priority)} {selectedReport.priority}</span></div>
                <div><p className={`text-gray-500 ${textSizeClasses.base}`}>Date</p><p className={`${textSizeClasses.base}`}>{new Date(selectedReport.sent_at).toLocaleString()}</p></div>
              </div>
              <div className="bg-gray-50 p-5 rounded-xl"><p className={`text-gray-500 mb-2 ${textSizeClasses.base}`}>Message</p><p className={`whitespace-pre-wrap ${textSizeClasses.base}`}>{selectedReport.body}</p></div>
              {selectedReport.attachments?.length > 0 && (<div className="bg-gray-50 p-4 rounded-xl"><p className={`text-gray-500 mb-2 ${textSizeClasses.base}`}>Attachments</p>{selectedReport.attachments.map((att, idx) => (<div key={idx} className="flex items-center gap-2 text-teal-600"><FaPaperclip /><span>{att.name}</span></div>))}</div>)}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} className={`flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 ${textSizeClasses.base}`}><FaReply /> Reply</button>
                <button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className={`flex-1 px-4 py-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`}>Close</button>
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
              <h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>Reply to Report</h2>
              <button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <div className="mb-4 p-4 bg-gray-50 rounded-xl"><p className={`text-gray-500 ${textSizeClasses.base}`}>Original Report</p><p className={`font-medium ${textSizeClasses.base}`}>{selectedReport.title}</p><p className={`text-gray-400 mt-1 ${textSizeClasses.base}`}>From: {selectedReport.sender_full_name}</p></div>
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows="5" placeholder="Type your reply here..." className={`w-full p-3 border border-gray-300 rounded-xl resize-none ${textSizeClasses.base}`} />
            <div className="mt-3"><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Attachment (Optional)</label><input type="file" onChange={(e) => setReplyAttachment(e.target.files[0])} className={`w-full p-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`} /></div>
            <div className="flex gap-3 pt-4 mt-2">
              <button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className={`flex-1 px-4 py-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`}>Cancel</button>
              <button onClick={handleSendReply} disabled={loading} className={`flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 ${textSizeClasses.base}`}>{loading ? <FaSpinner className="animate-spin" /> : <FaReply />}{loading ? 'Sending...' : 'Send Reply'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>Change Password</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button>
            </div>
            <div className="space-y-4">
              <input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} />
              <input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} />
              <input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} />
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowPasswordModal(false)} className={`flex-1 px-4 py-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`}>Cancel</button>
                <button onClick={changePassword} className={`flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl ${textSizeClasses.base}`}>Change Password</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TriageDashboard;