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
  // ==================== HELPER: Get Hospital ID (IMPROVED) ====================
  const getHospitalId = () => {
    console.log('=== TRIAGE DEBUG - getHospitalId ===');
    console.log('user object:', user);
    
    // Try multiple sources
    let id = user?.hospital_id || 
            user?.hospitalId || 
            localStorage.getItem('hospital_id');
    
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
    localStorage.removeItem('hospital_id');
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
      const response = await axios.get(`${API_URL}/api/triage/my-schedule`, {
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

  // ==================== FETCH DATA ====================
  const fetchTriageQueue = async () => {
    const hospitalId = getHospitalId();
    if (!hospitalId) {
      console.error('No hospital_id for fetchTriageQueue');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/triage/queue`, {
        params: { hospital_id: hospitalId },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTriageQueue(response.data.patients || []);
        setStats(prev => ({ ...prev, waiting: response.data.patients?.length || 0 }));
      }
    } catch (error) {
      console.error('Error fetching triage queue:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error loading queue' });
    }
  };

  const fetchTriagedPatients = async () => {
    const hospitalId = getHospitalId();
    if (!hospitalId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/triage/triaged`, {
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
      const response = await axios.get(`${API_URL}/api/triage/stats`, {
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

  // ==================== REPORT FUNCTIONS ====================
  const fetchReportsInbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/triage/reports/inbox`, {
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
      const res = await axios.get(`${API_URL}/api/triage/reports/outbox`, {
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
      const res = await axios.get(`${API_URL}/api/triage/hospital-admins`, {
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
      
      const res = await axios.post(`${API_URL}/api/triage/reports/send`, formData, {
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
      await axios.put(`${API_URL}/api/triage/reports/${reportId}/read`, {}, {
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
      
      const res = await axios.post(`${API_URL}/api/triage/reports/${selectedReport.id}/reply`, formData, {
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
      const res = await axios.get(`${API_URL}/api/triage/profile`, {
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
      const res = await axios.put(`${API_URL}/api/triage/profile`, profileData, {
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
      const res = await axios.put(`${API_URL}/api/triage/change-password`, {
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

      const response = await axios.post(`${API_URL}/api/triage/send-to-ward`, {
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

  // ==================== INITIAL LOAD (FIXED - WITH DEPENDENCIES) ====================
  useEffect(() => {
    const hospitalId = getHospitalId();
    console.log('useEffect - hospitalId:', hospitalId);
    
    if (!hospitalId) {
      console.warn('No hospital_id available on initial load');
      // Store hospital_id if found in token for next time
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload?.hospital_id) {
            localStorage.setItem('hospital_id', payload.hospital_id);
            console.log('Saved hospital_id from token to localStorage:', payload.hospital_id);
          }
        }
      } catch (e) {}
      return;
    }

    // Store hospital_id for backup
    localStorage.setItem('hospital_id', hospitalId);
    
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
  }, []); // Run once on mount, but getHospitalId will check token

  // ==================== RENDER ====================
  return (
    // ... rest of your JSX remains exactly the same
    <div className={`min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex ${textSizeClasses.base}`}>
      {/* ... all your existing JSX ... */}
    </div>
  );
};

export default TriageDashboard;