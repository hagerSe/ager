import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import SignaturePad from 'react-signature-canvas';
import BedSelection from './BedSelection';
import PharmacyStatus from './PharmacyStatus';
import DischargeList from './DischargeList';
import EthiopianHierarchySelector from './EthiopianHierarchySelector';
import ScheduleViewer from '../components/ScheduleViewer';
import { 
  FaSpinner, FaBaby, FaStethoscope, FaCalendarAlt, FaHeartbeat, FaRuler, FaWeight, 
  FaSyringe, FaNotesMedical, FaUserMd, FaPlus, FaEye, FaCheck, FaTimes, FaSync, 
  FaSearch, FaFileAlt, FaBabyCarriage, FaPrescription, FaDiagnoses, FaHospitalUser, 
  FaSignOutAlt, FaBed, FaArrowRight, FaArrowLeft, FaPrint, FaDownload, FaHistory,
  FaFlask, FaMicroscope, FaClock, FaUserCircle, FaChevronLeft, FaChevronRight,
  FaInbox, FaPaperPlane, FaEnvelope, FaEnvelopeOpen, FaReply, FaKey, FaEdit as FaEditIcon,
  FaSave, FaChartLine, FaBell, FaUserCheck, FaUserClock, FaBuilding, FaUsers, FaIdCard,
  FaTextHeight, FaUndo, FaTrash, FaPaperclip
} from 'react-icons/fa';

const MidwifeDashboard = ({ user, onLogout }) => {
  // ==================== STATE MANAGEMENT ====================
  const [patients, setPatients] = useState([]);
  const [queuePatients, setQueuePatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [activeTab, setActiveTab] = useState('antenatal');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [notification, setNotification] = useState(null);
  const [realTimeNotification, setRealTimeNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [searchTerm, setSearchTerm] = useState('');
  const [showScheduleView, setShowScheduleView] = useState(false);
  
  // ==================== TEXT SIZE STATE ====================
  const [textSize, setTextSize] = useState('xlarge');
  const [showTextSizeMenu, setShowTextSizeMenu] = useState(false);
  
  // ==================== LOGOUT CONFIRMATION ====================
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // ==================== HISTORY FOR BACK NAVIGATION ====================
  const [tabHistory, setTabHistory] = useState(['antenatal']);
  const [reportMainTab, setReportMainTab] = useState('antenatal');
  
  // ==================== TEXT SIZE STYLES ====================
  const getTextSizeClasses = () => {
    switch(textSize) {
      case 'small':
        return { base: 'text-sm', heading: 'text-base', title: 'text-lg', large: 'text-sm' };
      case 'normal':
        return { base: 'text-base', heading: 'text-lg', title: 'text-xl', large: 'text-base' };
      case 'large':
        return { base: 'text-lg', heading: 'text-xl', title: 'text-2xl', large: 'text-lg' };
      case 'xlarge':
        return { base: 'text-xl', heading: 'text-2xl', title: 'text-3xl', large: 'text-xl' };
      default:
        return { base: 'text-xl', heading: 'text-2xl', title: 'text-3xl', large: 'text-xl' };
    }
  };
  
  const textSizeClasses = getTextSizeClasses();
  
  // Apply text size to body
  useEffect(() => {
    document.documentElement.style.fontSize = 
      textSize === 'small' ? '13px' : 
      textSize === 'normal' ? '15px' : 
      textSize === 'large' ? '17px' : '19px';
  }, [textSize]);
  
  // ==================== BACK NAVIGATION HANDLER ====================
  const handleTabChange = (tab, isSchedule = false) => {
    if (tab !== reportMainTab || isSchedule !== showScheduleView) {
      setTabHistory(prev => [...prev, reportMainTab]);
      setReportMainTab(tab);
      setShowScheduleView(isSchedule);
    }
  };
  
  const handleGoBack = () => {
    if (tabHistory.length > 0) {
      const previousTab = tabHistory[tabHistory.length - 1];
      setTabHistory(prev => prev.slice(0, -1));
      setReportMainTab(previousTab);
      setShowScheduleView(previousTab === 'schedule');
    }
  };
  
  // ==================== GOOGLE SEARCH STATE ====================
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  
  // ==================== REFERRAL STATE ====================
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralType, setReferralType] = useState('internal');
  const [selectedInternalWard, setSelectedInternalWard] = useState('');
  const [externalReferralData, setExternalReferralData] = useState(null);
  const [referralSelectedBed, setReferralSelectedBed] = useState('');
  
  // ==================== DISCHARGE STATE ====================
  const [showDischargeLocationModal, setShowDischargeLocationModal] = useState(false);
  const [dischargeLocation, setDischargeLocation] = useState('');
  const [showDischargeList, setShowDischargeList] = useState(false);
  const [dischargedPatients, setDischargedPatients] = useState([]);
  
  // ==================== BED MANAGEMENT STATE ====================
  const [showBedListNotification, setShowBedListNotification] = useState(false);
  const [availableBedsList, setAvailableBedsList] = useState([]);
  const [selectedBed, setSelectedBed] = useState('');
  
  // ==================== PRESCRIPTION STATE ====================
  const [prescriptions, setPrescriptions] = useState([]);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    route: 'oral',
    notes: ''
  });
  
  // ==================== DIAGNOSIS STATE ====================
  const [diagnosis, setDiagnosis] = useState({
    primary: '',
    icd10: '',
    secondary: '',
    notes: ''
  });
  
  // ==================== LAB STATE ====================
  const [labRequests, setLabRequests] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [newLabRequest, setNewLabRequest] = useState({
    testType: 'blood',
    testName: '',
    priority: 'routine',
    notes: ''
  });
  
  // ==================== ANC SPECIFIC STATES ====================
  const [antenatalData, setAntenatalData] = useState({
    gestational_weeks: '',
    edd: '',
    lmp: '',
    gravida: '',
    para: '',
    high_risk: false,
    risk_factors: []
  });
  
  const [vitalSigns, setVitalSigns] = useState({
    blood_pressure: '',
    heart_rate: '',
    temperature: '',
    weight: '',
    height: '',
    fundal_height: '',
    fetal_heart_rate: '',
    fetal_movement: 'normal'
  });
  
  const [visitNotes, setVisitNotes] = useState({
    complaints: '',
    examination: '',
    advice: '',
    next_appointment: ''
  });
  
  const [antenatalVisits, setAntenatalVisits] = useState([]);
  const [deliveryRecords, setDeliveryRecords] = useState([]);
  const [postnatalPatients, setPostnatalPatients] = useState([]);
  const [highRiskPatients, setHighRiskPatients] = useState([]);
  
  const [stats, setStats] = useState({
    antenatal: 0,
    postnatal: 0,
    deliveries: 0,
    highRisk: 0,
    upcomingAppointments: 0,
    dueThisWeek: 0,
    pendingPharmacy: 0,
    completedToday: 0
  });

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
    department: 'Midwife'
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
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
  const [doctors, setDoctors] = useState([]);
  const [pharmacyStaff, setPharmacyStaff] = useState([]);
  const [labStaff, setLabStaff] = useState([]);
  const [sendReportForm, setSendReportForm] = useState({
    recipient_type: 'hospital_admin',
    recipient_id: '',
    title: '',
    body: '',
    priority: 'medium',
    attachments: []
  });
  const [attachmentPreview, setAttachmentPreview] = useState([]);
  const fileInputRef = useRef(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Refs
  const signaturePad = useRef(null);
  const socket = useRef(null);
  const navigate = useNavigate();

  // API Configuration
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5001';
  
  // Internal wards for referral
  const internalWards = ['OPD', 'EME', 'ANC'];
  
  // Discharge location options
  const dischargeLocations = [
    'Home',
    'Home with Follow-up',
    'Home with Medications',
    'Home Health Care',
    'Rehabilitation Center',
    'Nursing Home',
    'Hospice',
    'Against Medical Advice (AMA)',
    'Transfer to Another Facility',
    'Deceased'
  ];

  // Ward configuration for Midwife
  const currentWard = {
    title: 'Antenatal Care Dashboard',
    primaryColor: '#8b5cf6',
    secondaryColor: '#a78bfa',
    accentColor: '#7c3aed',
    bgGradient: 'from-violet-600/70 to-purple-500/70',
    queueTitle: 'Antenatal Patients',
    icon: '🤰',
    sidebarIcon: '👶',
    statusFilter: 'in_anc'
  };

  // ==================== HELPER FUNCTIONS ====================
  const formatFullName = (staffMember) => {
    if (!staffMember) return 'Unknown';
    const firstName = staffMember.first_name || '';
    const middleName = staffMember.middle_name ? ` ${staffMember.middle_name}` : '';
    const lastName = staffMember.last_name || '';
    return `${firstName}${middleName} ${lastName}`.trim();
  };

  const getRiskLevelColor = (isHighRisk) => {
    return isHighRisk ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  };

  const getRiskLevelText = (isHighRisk) => {
    return isHighRisk ? '⚠️ High Risk' : '✅ Normal';
  };

  // ==================== CONNECTION STATUS BANNER ====================
  const ConnectionStatusBanner = () => {
    if (connectionStatus === 'connected') return null;
    return (
      <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-2 rounded-full shadow-lg flex items-center gap-3 ${
        connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
      } text-white ${textSizeClasses.base}`}>
        <span>{connectionStatus === 'connecting' ? '🔄 Connecting...' : '⚠️ Disconnected'}</span>
        <button 
          onClick={() => {
            fetchPatients();
            fetchStats();
          }}
          className="ml-2 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30"
        >
          Retry
        </button>
      </div>
    );
  };

  // ==================== REAL TIME NOTIFICATION ====================
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
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-purple-100">
                {realTimeNotification.type === 'reply' ? '💬' : realTimeNotification.type === 'lab_result' ? '🔬' : '👶'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className={`font-bold text-gray-900 ${textSizeClasses.heading}`}>{realTimeNotification.title}</p>
                <span className="text-xs text-gray-400 ml-2">{realTimeNotification.priority === 'urgent' ? '🔴' : '🟡'}</span>
              </div>
              <p className={`text-gray-600 mb-2 ${textSizeClasses.base}`}>{realTimeNotification.message}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
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
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
        <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
        <span className={`text-xs text-gray-600 ${textSizeClasses.base}`}>{config.icon} {config.text}</span>
      </div>
    );
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
      console.log('✅ Midwife socket connected');
      setConnectionStatus('connected');
      socket.current.emit('join', `hospital_${user?.hospital_id}_ward_ANC`);
    });

    socket.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('disconnected');
    });

    socket.current.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    // Listen for new ANC patients from triage
    socket.current.on('new_anc_patient', (data) => {
      console.log('🤰 New ANC patient:', data);
      setRealTimeNotification({
        id: Date.now(),
        type: 'new_patient',
        title: 'New Patient',
        message: `🆕 New antenatal patient: ${data.patient_name}`,
        priority: 'medium',
        timestamp: new Date()
      });
      fetchPatients();
      fetchStats();
      setTimeout(() => setRealTimeNotification(null), 6000);
    });

    // Listen for referred patients to ANC
    socket.current.on('patient_referred_to_anc', (data) => {
      console.log('📋 Patient referred to ANC:', data);
      setRealTimeNotification({
        id: Date.now(),
        type: 'referral',
        title: 'Patient Referred',
        message: `📋 Patient referred to ANC: ${data.patient_name}`,
        priority: 'medium',
        timestamp: new Date()
      });
      fetchPatients();
      fetchStats();
      setTimeout(() => setRealTimeNotification(null), 6000);
    });
  };

  // ==================== API CALLS ====================
  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.get(`${API_URL}/midwife/patients`, {
        params: {
          hospital_id: user?.hospital_id,
          ward: 'ANC',
          midwife_id: user?.id
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        const patientsList = res.data.patients || [];
        setPatients(patientsList);
        setQueuePatients(patientsList.filter(p => p.status === 'in_anc'));
        setHighRiskPatients(patientsList.filter(p => p.antenatal_data?.high_risk));
        setPostnatalPatients(patientsList.filter(p => p.status === 'postnatal'));
        
        setStats(prev => ({
          ...prev,
          antenatal: patientsList.filter(p => p.status === 'in_anc').length,
          postnatal: patientsList.filter(p => p.status === 'postnatal').length,
          highRisk: patientsList.filter(p => p.antenatal_data?.high_risk).length
        }));
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/midwife/stats`, {
        params: { hospital_id: user?.hospital_id, midwife_id: user?.id },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStats(prev => ({ ...prev, ...res.data.stats }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchDischargedPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/midwife/discharged-patients`, {
        params: { hospital_id: user?.hospital_id, ward: 'ANC' },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setDischargedPatients(res.data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching discharged patients:', error);
    }
  };

  // ==================== REPORT FUNCTIONS ====================
  const fetchReportsInbox = async () => {
    try {
      setReportsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/midwife/reports/inbox`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setReportsInbox(res.data.reports);
        setUnreadReportsCount(res.data.unreadCount);
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
      const res = await axios.get(`${API_URL}/midwife/reports/outbox`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setReportsOutbox(res.data.reports);
      }
    } catch (error) {
      console.error('Error fetching reports outbox:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchHospitalAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/midwife/hospital-admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHospitalAdmins(res.data.admins);
      }
    } catch (error) {
      console.error('Error fetching hospital admins:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/midwife/doctors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setDoctors(res.data.doctors);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchPharmacyStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/midwife/pharmacy-staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPharmacyStaff(res.data.staff);
      }
    } catch (error) {
      console.error('Error fetching pharmacy staff:', error);
    }
  };

  const fetchLabStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/midwife/lab-staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setLabStaff(res.data.staff);
      }
    } catch (error) {
      console.error('Error fetching lab staff:', error);
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
      formData.append('recipient_type', sendReportForm.recipient_type);
      formData.append('recipient_id', sendReportForm.recipient_id);
      
      sendReportForm.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
      
      const res = await axios.post(`${API_URL}/midwife/reports/send`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Report sent successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setShowSendReportModal(false);
        setSendReportForm({
          recipient_type: 'hospital_admin',
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
      console.error('Error sending report:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error sending report' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const markReportAsRead = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/midwife/reports/${reportId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReportsInbox();
    } catch (error) {
      console.error('Error marking report as read:', error);
    }
  };

  const viewReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportDetailModal(true);
    if (!report.is_opened) {
      markReportAsRead(report.id);
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
      if (replyAttachment) {
        formData.append('attachment', replyAttachment);
      }
      
      const res = await axios.post(`${API_URL}/midwife/reports/${selectedReport.id}/reply`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
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
      console.error('Error sending reply:', error);
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
      const res = await axios.get(`${API_URL}/midwife/profile`, {
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
          department: staff.department || 'Midwife'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/midwife/profile`, profileData, {
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
      const res = await axios.put(`${API_URL}/midwife/change-password`, {
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

  // ==================== PATIENT HANDLING ====================
  const handleTakePatient = async (patient) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await axios.post(`${API_URL}/midwife/assign-patient`, {
        patient_id: patient.id,
        midwife_id: user?.id,
        midwife_name: user?.full_name,
        hospital_id: user?.hospital_id
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setSelectedPatient(res.data.patient);
        setShowPatientModal(true);
        setActiveTab('antenatal');
        setMessage({ type: 'success', text: 'Patient assigned successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error taking patient:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error assigning patient' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };
  
  const handleConfirmLogout = () => {
    if (socket.current) socket.current.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
  };
  
  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // ==================== GOOGLE SEARCH HANDLER ====================
  const handleGoogleSearch = () => {
    if (searchQuery.trim()) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' midwifery obstetric medical reference')}`;
      window.open(url, "_blank");
      setSearchQuery('');
      setShowSearchBar(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleGoogleSearch();
    }
  };

  // Calculate weeks helper function
  const calculateWeeks = (lmp) => {
    if (!lmp) return '';
    const lmpDate = new Date(lmp);
    const today = new Date();
    const diffTime = Math.abs(today - lmpDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  };

  // Filtered patients based on active tab
  const getFilteredPatients = () => {
    switch(reportMainTab) {
      case 'antenatal':
        return queuePatients.filter(p => p.status === 'in_anc');
      case 'postnatal':
        return postnatalPatients;
      case 'high-risk':
        return highRiskPatients;
      case 'deliveries':
        return patients.filter(p => p.status === 'delivered');
      default:
        return queuePatients;
    }
  };

  const filteredPatients = getFilteredPatients().filter(patient =>
    patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.card_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    if (!user?.hospital_id) return;

    initializeSocket();
    fetchPatients();
    fetchStats();
    fetchDischargedPatients();
    fetchReportsInbox();
    fetchReportsOutbox();
    fetchHospitalAdmins();
    fetchDoctors();
    fetchPharmacyStaff();
    fetchLabStaff();
    fetchProfile();

    const interval = setInterval(() => {
      fetchPatients();
      fetchStats();
      if (showDischargeList) {
        fetchDischargedPatients();
      }
      fetchReportsInbox();
    }, 30000);

    return () => {
      if (socket.current) socket.current.disconnect();
      clearInterval(interval);
    };
  }, [user?.hospital_id, showDischargeList]);

  // ==================== RENDER ====================
  return (
    <div className={`min-h-screen bg-gradient-to-br from-violet-50/50 to-purple-50/50 flex ${textSizeClasses.base}`}>
      <RealTimeNotification />
      <ConnectionStatusBanner />

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
              <p className={`text-gray-600 mb-8 ${textSizeClasses.base}`}>Are you sure you want to logout?</p>
              <div className="flex gap-4">
                <button onClick={handleCancelLogout} className={`flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium ${textSizeClasses.base}`}>No, Stay</button>
                <button onClick={handleConfirmLogout} className={`flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium ${textSizeClasses.base}`}>Yes, Logout</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ==================== SIDEBAR ==================== */}
      <div className={`${sidebarCollapsed ? 'w-24' : 'w-72'} bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col h-screen sticky top-0 shadow-2xl z-50`}>
        {/* Sidebar Header */}
        <div className={`${sidebarCollapsed ? 'py-5 px-0' : 'p-6'} border-b border-slate-700/50 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-violet-500/70 to-purple-500/70 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">{currentWard.sidebarIcon}</span>
              </div>
              <div>
                <h3 className={`m-0 font-semibold ${textSizeClasses.base}`}>Midwife</h3>
                <p className={`mt-0.5 text-slate-400 ${textSizeClasses.base}`}>{user?.full_name || formatFullName(user)}</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-10 h-10 bg-gradient-to-r from-violet-500/70 to-purple-500/70 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">{currentWard.sidebarIcon}</span>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="bg-slate-700/50 hover:bg-slate-600 rounded-lg p-2 transition">
            {sidebarCollapsed ? <FaChevronRight size={20} /> : <FaChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation Menu */}
        <div className={`flex-1 ${sidebarCollapsed ? 'py-4 px-0' : 'p-4'}`}>
          <div onClick={() => { setShowDischargeList(false); handleTabChange('antenatal', false); }} 
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 rounded-xl ${reportMainTab === 'antenatal' && !showDischargeList && !showScheduleView ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">🤰</span>
            {!sidebarCollapsed && (<><span className={`flex-1 font-medium ${textSizeClasses.base}`}>Antenatal Care</span><span className="px-2 py-0.5 rounded-full text-xs bg-white/20">{stats.antenatal}</span></>)}
          </div>

          <div onClick={() => { setShowDischargeList(false); handleTabChange('postnatal', false); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'postnatal' && !showDischargeList && !showScheduleView ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">👶</span>
            {!sidebarCollapsed && (<><span className={`flex-1 font-medium ${textSizeClasses.base}`}>Postnatal Care</span><span className="px-2 py-0.5 rounded-full text-xs bg-green-500/80">{stats.postnatal}</span></>)}
          </div>

          <div onClick={() => { setShowDischargeList(false); handleTabChange('high-risk', false); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'high-risk' && !showDischargeList && !showScheduleView ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">⚠️</span>
            {!sidebarCollapsed && (<><span className={`flex-1 font-medium ${textSizeClasses.base}`}>High Risk</span><span className="px-2 py-0.5 rounded-full text-xs bg-red-500 animate-pulse">{stats.highRisk}</span></>)}
          </div>

          <div onClick={() => { setShowDischargeList(false); handleTabChange('deliveries', false); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'deliveries' && !showDischargeList && !showScheduleView ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">🏥</span>
            {!sidebarCollapsed && (<><span className={`flex-1 font-medium ${textSizeClasses.base}`}>Deliveries</span><span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/80">{stats.deliveries}</span></>)}
          </div>

          <div className="h-px bg-slate-700/50 my-3 mx-3"></div>

          <div onClick={() => { setShowDischargeList(!showDischargeList); if (!showDischargeList) fetchDischargedPatients(); }} 
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${showDischargeList ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">📋</span>
            {!sidebarCollapsed && <span className={`flex-1 font-medium ${textSizeClasses.base}`}>Discharge List</span>}
          </div>

          <div className="h-px bg-slate-700/50 my-3 mx-3"></div>

          <div onClick={() => { setShowDischargeList(false); handleTabChange('schedule', true); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${showScheduleView ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">📅</span>
            {!sidebarCollapsed && <span className={`flex-1 font-medium ${textSizeClasses.base}`}>My Schedule</span>}
          </div>

          <div onClick={() => { setShowDischargeList(false); handleTabChange('inbox', false); fetchReportsInbox(); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'inbox' && !showDischargeList && !showScheduleView ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all relative`}>
            <span className="text-xl">📬</span>
            {!sidebarCollapsed && (<><span className={`flex-1 font-medium ${textSizeClasses.base}`}>Inbox</span>{unreadReportsCount > 0 && (<span className="px-2 py-0.5 rounded-full text-xs bg-red-500 animate-pulse">{unreadReportsCount}</span>)}</>)}
            {sidebarCollapsed && unreadReportsCount > 0 && (<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center">{unreadReportsCount}</span>)}
          </div>

          <div onClick={() => { setShowDischargeList(false); handleTabChange('outbox', false); fetchReportsOutbox(); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'outbox' && !showDischargeList && !showScheduleView ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">📤</span>
            {!sidebarCollapsed && <span className={`flex-1 font-medium ${textSizeClasses.base}`}>Sent Reports</span>}
          </div>

          <div onClick={() => { setShowDischargeList(false); handleTabChange('stats', false); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'stats' && !showDischargeList && !showScheduleView ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">📊</span>
            {!sidebarCollapsed && <span className={`flex-1 font-medium ${textSizeClasses.base}`}>Statistics</span>}
          </div>

          <div onClick={() => { setShowDischargeList(false); handleTabChange('profile', false); }}
               className={`${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} mx-2 mt-2 rounded-xl ${reportMainTab === 'profile' && !showDischargeList && !showScheduleView ? 'bg-gradient-to-r from-violet-600/70 to-purple-600/70 shadow-lg' : 'bg-slate-800/50 hover:bg-slate-700'} flex items-center gap-3 cursor-pointer transition-all`}>
            <span className="text-xl">👤</span>
            {!sidebarCollapsed && <span className={`flex-1 font-medium ${textSizeClasses.base}`}>Profile</span>}
          </div>
        </div>

        {/* Logout Button */}
        <div className={`${sidebarCollapsed ? 'py-4 px-0' : 'p-5'} border-t border-slate-700/50`}>
          <button onClick={handleLogoutClick} className={`w-full ${sidebarCollapsed ? 'py-3 px-0 justify-center' : 'py-3 px-4'} bg-transparent border border-slate-600 rounded-xl text-red-400 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 transition-all hover:bg-red-500/10 ${textSizeClasses.base}`}>
            <span className="text-lg">🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className={`bg-gradient-to-r ${currentWard.bgGradient} backdrop-blur-sm py-8 px-10 shadow-xl sticky top-0 z-40`}>
          <div className="max-w-[1600px] mx-auto flex justify-between items-center flex-wrap gap-5">
            <div className="flex items-center gap-5">
              {tabHistory.length > 0 && (
                <button onClick={handleGoBack} className="bg-white/20 backdrop-blur p-3 rounded-xl text-white hover:bg-white/30 transition-all duration-200 shadow-lg flex items-center gap-2 group">
                  <FaUndo className="text-white text-lg" />
                  <span className={`hidden sm:inline ${textSizeClasses.base}`}>Back</span>
                </button>
              )}
              <div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                    <span>{currentWard.icon}</span>
                  </div>
                  <div>
                    <h1 className={`font-bold text-white m-0 drop-shadow-md tracking-tight ${textSizeClasses.title}`}>
                      {showScheduleView ? 'My Work Schedule' : 
                       reportMainTab === 'inbox' ? 'Reports - Inbox' :
                       reportMainTab === 'outbox' ? 'Reports - Sent' :
                       reportMainTab === 'stats' ? 'Midwife Statistics' :
                       reportMainTab === 'profile' ? 'My Profile' :
                       currentWard.title}
                    </h1>
                    <p className={`text-white/90 mt-2 flex items-center gap-3 flex-wrap ${textSizeClasses.base}`}>
                      <span>{formatFullName(user)}</span>
                      <span className="text-white/50 text-lg">•</span>
                      <span>{user?.hospital_name}</span>
                      <span className="bg-white/20 px-4 py-1 rounded-full text-sm font-medium backdrop-blur">Midwife - ANC Ward</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative">
                <button onClick={() => setShowTextSizeMenu(!showTextSizeMenu)} className="bg-white/20 backdrop-blur px-4 py-3 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition shadow-lg">
                  <FaTextHeight className="text-lg" />
                  <span className={`hidden md:inline ${textSizeClasses.base}`}>Text Size</span>
                </button>
                {showTextSizeMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                    <button onClick={() => { setTextSize('small'); setShowTextSizeMenu(false); }} className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition ${textSize === 'small' ? 'bg-purple-50 text-purple-600' : 'text-gray-700'} ${textSizeClasses.base}`}>Small {textSize === 'small' && <FaCheck className="float-right text-purple-500" />}</button>
                    <button onClick={() => { setTextSize('normal'); setShowTextSizeMenu(false); }} className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition ${textSize === 'normal' ? 'bg-purple-50 text-purple-600' : 'text-gray-700'} ${textSizeClasses.base}`}>Normal {textSize === 'normal' && <FaCheck className="float-right text-purple-500" />}</button>
                    <button onClick={() => { setTextSize('large'); setShowTextSizeMenu(false); }} className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition ${textSize === 'large' ? 'bg-purple-50 text-purple-600' : 'text-gray-700'} ${textSizeClasses.base}`}>Large {textSize === 'large' && <FaCheck className="float-right text-purple-500" />}</button>
                    <button onClick={() => { setTextSize('xlarge'); setShowTextSizeMenu(false); }} className={`w-full px-5 py-3 text-left hover:bg-gray-50 transition ${textSize === 'xlarge' ? 'bg-purple-50 text-purple-600' : 'text-gray-700'} ${textSizeClasses.base}`}>Extra Large {textSize === 'xlarge' && <FaCheck className="float-right text-purple-500" />}</button>
                  </div>
                )}
              </div>

              <button onClick={() => setShowSearchBar(!showSearchBar)} className="bg-white/20 backdrop-blur px-5 py-3 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition shadow-lg font-medium">
                <FaSearch /> <span className="hidden sm:inline">Medical Search</span>
              </button>

              <button onClick={() => { setShowSendReportModal(true); fetchHospitalAdmins(); fetchDoctors(); fetchPharmacyStaff(); fetchLabStaff(); }} className="bg-white/20 backdrop-blur px-5 py-3 rounded-xl text-white flex items-center gap-2 hover:bg-white/30 transition shadow-lg font-medium">
                <FaPaperPlane /> <span className="hidden sm:inline">Send Report</span>
              </button>
              
              <SocketStatusIndicator />
              
              <div className="flex gap-5 bg-white/10 backdrop-blur py-3 px-6 rounded-full">
                <div className="text-center"><div className={`font-bold text-white ${textSizeClasses.title}`}>{stats.antenatal}</div><div className="text-xs text-white/70 uppercase tracking-wider mt-1">Antenatal</div></div>
                <div className="w-px h-10 bg-white/30" />
                <div className="text-center"><div className={`font-bold text-white ${textSizeClasses.title}`}>{stats.postnatal}</div><div className="text-xs text-white/70 uppercase tracking-wider mt-1">Postnatal</div></div>
                <div className="w-px h-10 bg-white/30" />
                <div className="text-center"><div className={`font-bold text-white ${textSizeClasses.title}`}>{stats.deliveries}</div><div className="text-xs text-white/70 uppercase tracking-wider mt-1">Deliveries</div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearchBar && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white shadow-xl p-6 border-b border-gray-100">
              <div className="max-w-2xl mx-auto flex gap-4">
                <input type="text" placeholder="Search midwifery and obstetric medical information on Google..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={handleKeyPress} className={`flex-1 px-5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${textSizeClasses.base}`} />
                <button onClick={handleGoogleSearch} className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-medium">Search Google</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Toast */}
        {message.text && (
          <div className={`fixed bottom-8 right-8 z-[1000] ${message.type === 'error' ? 'bg-red-100 text-red-800 border-red-400' : 'bg-green-100 text-green-800 border-green-400'} py-3 px-6 rounded-lg shadow-md border-l-4 ${textSizeClasses.base}`}>
            {message.text}
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto p-10">
          {/* Schedule View */}
          {showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-violet-500/70 to-purple-500/70 rounded-xl flex items-center justify-center shadow-lg">
                    <FaCalendarAlt className="text-white text-xl" />
                  </div>
                  <div><h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>My Work Schedule</h2><p className={`text-gray-500 ${textSizeClasses.base}`}>View your upcoming shifts and weekly schedule</p></div>
                </div>
                <button onClick={() => { const event = new CustomEvent('refreshSchedule'); window.dispatchEvent(event); }} className={`px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium flex items-center gap-2 ${textSizeClasses.base}`}><FaSync className="text-sm" /> Refresh</button>
              </div>
              <ScheduleViewer user={user} compact={false} />
            </div>
          )}

          {/* Discharge List */}
          {showDischargeList && !showScheduleView && (
            <DischargeList hospitalId={user?.hospital_id} ward="ANC" dischargedPatients={dischargedPatients} onRefresh={fetchDischargedPatients} />
          )}

          {/* Patient List Views */}
          {(reportMainTab === 'antenatal' || reportMainTab === 'postnatal' || reportMainTab === 'high-risk' || reportMainTab === 'deliveries') && !showDischargeList && !showScheduleView && (
            <>
              <div className="mb-6 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search by patient name or card number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white ${textSizeClasses.base}`} />
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>
                    {reportMainTab === 'antenatal' && '🤰 Antenatal Care Patients'}
                    {reportMainTab === 'postnatal' && '👶 Postnatal Care Patients'}
                    {reportMainTab === 'high-risk' && '⚠️ High Risk Pregnancies'}
                    {reportMainTab === 'deliveries' && '🏥 Recent Deliveries'}
                  </h2>
                  <button onClick={() => { fetchPatients(); fetchStats(); }} className={`px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 flex items-center gap-2 ${textSizeClasses.base}`}><FaSpinner className={loading ? 'animate-spin' : ''} /> Refresh</button>
                </div>
                
                {filteredPatients.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <span className="text-6xl block mb-4">🤰</span>
                    <p className={`text-gray-500 ${textSizeClasses.base}`}>No patients found</p>
                  </div>
                ) : (
                  <div className="grid gap-5">
                    {filteredPatients.map(patient => {
                      const isHighRisk = patient.antenatal_data?.high_risk;
                      const weeks = patient.antenatal_data?.gestational_weeks || (patient.antenatal_data?.lmp ? calculateWeeks(patient.antenatal_data.lmp) : 'N/A');
                      return (
                        <div key={patient.id} className="border border-gray-200 rounded-xl p-6 flex justify-between items-center shadow-sm hover:shadow-lg transition-all bg-white">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ${textSizeClasses.base}`}>{weeks} weeks</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(isHighRisk)} ${textSizeClasses.base}`}>{getRiskLevelText(isHighRisk)}</span>
                              {patient.antenatal_data?.edd && (<span className={`px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${textSizeClasses.base}`}>EDD: {new Date(patient.antenatal_data.edd).toLocaleDateString()}</span>)}
                            </div>
                            <h3 className={`font-bold text-gray-800 ${textSizeClasses.title}`}>{patient.first_name} {patient.middle_name} {patient.last_name}</h3>
                            <p className={`text-gray-500 mt-1 ${textSizeClasses.base}`}>Card: {patient.card_number} • Age: {patient.age} yrs • G{patient.antenatal_data?.gravida || '?'} P{patient.antenatal_data?.para || '?'}</p>
                          </div>
                          <button onClick={() => handleTakePatient(patient)} disabled={loading} className={`py-3 px-8 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold ml-5 ${textSizeClasses.base}`}><FaEye className="inline mr-2" /> View Care</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Reports Inbox */}
          {reportMainTab === 'inbox' && !showScheduleView && (
            <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>📬 Reports Inbox</h2>
                <button onClick={fetchReportsInbox} className={`px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 flex items-center gap-2 ${textSizeClasses.base}`}><FaSpinner className={reportsLoading ? 'animate-spin' : ''} /> Refresh</button>
              </div>
              {reportsInbox.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><span className="text-6xl block mb-4">📭</span><p className={`text-gray-500 ${textSizeClasses.base}`}>No reports in inbox</p></div>
              ) : (
                <div className="grid gap-5">
                  {reportsInbox.map(report => (
                    <div key={report.id} className={`border rounded-xl p-6 cursor-pointer hover:shadow-md transition-all ${!report.is_opened ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`} onClick={() => viewReportDetails(report)}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">{!report.is_opened ? <FaEnvelope className="text-purple-500 text-lg" /> : <FaEnvelopeOpen className="text-gray-400 text-lg" />}<h3 className={`font-semibold text-gray-800 ${textSizeClasses.heading}`}>{report.title}</h3></div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${report.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{report.priority}</span>
                      </div>
                      <p className={`text-gray-600 mb-3 line-clamp-2 ${textSizeClasses.base}`}>{report.body}</p>
                      <div className={`flex justify-between items-center text-gray-500 ${textSizeClasses.base}`}><span>From: {report.sender_full_name}</span><span>{new Date(report.sent_at).toLocaleString()}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sent Reports */}
          {reportMainTab === 'outbox' && !showScheduleView && (
            <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100">
              <div className="flex justify-between items-center mb-6"><h2 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>📤 Sent Reports</h2><button onClick={fetchReportsOutbox} className={`px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 ${textSizeClasses.base}`}>Refresh</button></div>
              {reportsOutbox.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><span className="text-6xl block mb-4">📪</span><p className={`text-gray-500 ${textSizeClasses.base}`}>No sent reports</p></div>
              ) : (
                <div className="grid gap-5">
                  {reportsOutbox.map(report => (
                    <div key={report.id} className="border border-gray-200 rounded-xl p-6 cursor-pointer hover:shadow-md bg-white" onClick={() => viewReportDetails(report)}>
                      <div className="flex justify-between items-start mb-4"><h3 className={`font-semibold text-gray-800 ${textSizeClasses.heading}`}>{report.title}</h3><span className={`px-3 py-1 rounded-full text-sm font-semibold ${report.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{report.priority}</span></div>
                      <p className={`text-gray-600 mb-3 line-clamp-2 ${textSizeClasses.base}`}>{report.body}</p>
                      <div className={`flex justify-between items-center text-gray-500 ${textSizeClasses.base}`}><span>To: {report.recipient_full_name}</span><span>Sent: {new Date(report.sent_at).toLocaleString()}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Statistics */}
          {reportMainTab === 'stats' && !showScheduleView && (
            <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100">
              <h2 className={`font-bold text-gray-800 mb-6 ${textSizeClasses.heading}`}>📊 Midwife Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                <div className="bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl p-5 text-white shadow-lg"><p className={`text-sm opacity-90 mb-1 ${textSizeClasses.base}`}>Active Patients</p><p className={`font-bold ${textSizeClasses.title}`}>{stats.antenatal + stats.postnatal}</p></div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg"><p className={`text-sm opacity-90 mb-1 ${textSizeClasses.base}`}>Total Deliveries</p><p className={`font-bold ${textSizeClasses.title}`}>{stats.deliveries}</p></div>
                <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-5 text-white shadow-lg"><p className={`text-sm opacity-90 mb-1 ${textSizeClasses.base}`}>High Risk</p><p className={`font-bold ${textSizeClasses.title}`}>{stats.highRisk}</p></div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg"><p className={`text-sm opacity-90 mb-1 ${textSizeClasses.base}`}>Due This Week</p><p className={`font-bold ${textSizeClasses.title}`}>{stats.dueThisWeek}</p></div>
              </div>
            </div>
          )}

          {/* Profile */}
          {reportMainTab === 'profile' && !showScheduleView && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600/70 to-purple-600/70 px-10 py-12">
                <div className="flex items-center gap-8">
                  <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-xl"><FaUserCircle className="text-violet-600 text-7xl" /></div>
                  <div className="text-white"><h2 className={`font-bold mb-2 ${textSizeClasses.title}`}>{profileData.first_name} {profileData.middle_name ? profileData.middle_name + ' ' : ''}{profileData.last_name}</h2><p className={`text-violet-100 flex items-center gap-3 ${textSizeClasses.base}`}><FaBaby className="text-lg" /> {profileData.department || 'Midwife'} • ANC Ward</p><p className={`text-violet-100 mt-2 opacity-80 ${textSizeClasses.base}`}>{user?.hospital_name}</p></div>
                </div>
              </div>
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className={`font-bold text-gray-800 ${textSizeClasses.heading}`}>Professional Information</h3>
                  {!isEditingProfile ? <button onClick={() => setIsEditingProfile(true)} className={`flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition font-medium ${textSizeClasses.base}`}><FaEditIcon /> Edit Profile</button> : <div className="flex gap-3"><button onClick={() => setIsEditingProfile(false)} className={`px-5 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition ${textSizeClasses.base}`}>Cancel</button><button onClick={updateProfile} className={`flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition ${textSizeClasses.base}`}><FaSave /> Save</button></div>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gray-50 rounded-xl p-6"><h4 className={`font-semibold text-violet-600 mb-5 flex items-center gap-2 ${textSizeClasses.base}`}><FaUserCircle /> Personal Info</h4><div className="space-y-4"><div><label className={`text-gray-500 ${textSizeClasses.base}`}>First Name</label>{isEditingProfile ? <input type="text" value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} /> : <p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.first_name || 'Not set'}</p>}</div><div><label className={`text-gray-500 ${textSizeClasses.base}`}>Last Name</label>{isEditingProfile ? <input type="text" value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} /> : <p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.last_name || 'Not set'}</p>}</div><div><label className={`text-gray-500 ${textSizeClasses.base}`}>Phone</label>{isEditingProfile ? <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className={`w-full px-4 py-2 border rounded-lg ${textSizeClasses.base}`} /> : <p className={`text-gray-800 ${textSizeClasses.base}`}>{profileData.phone || 'Not set'}</p>}</div></div></div>
                  <div className="bg-gray-50 rounded-xl p-6"><h4 className={`font-semibold text-violet-600 mb-5 flex items-center gap-2 ${textSizeClasses.base}`}><FaKey /> Account Settings</h4><button onClick={() => setShowPasswordModal(true)} className={`flex items-center gap-2 px-6 py-3 border border-violet-600 text-violet-600 rounded-xl hover:bg-violet-50 transition ${textSizeClasses.base}`}><FaKey /> Change Password</button><div className="mt-6 pt-4 border-t border-gray-200"><h5 className={`text-sm font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Account Info</h5><div className={`space-y-2 ${textSizeClasses.base}`}><div className="flex justify-between"><span className="text-gray-500">Role:</span><span className="text-gray-800 font-medium">Midwife</span></div><div className="flex justify-between"><span className="text-gray-500">Department:</span><span className="text-gray-800">{profileData.department || 'Midwife'}</span></div><div className="flex justify-between"><span className="text-gray-500">Ward:</span><span className="text-gray-800">ANC</span></div><div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="text-green-600">● Active</span></div></div></div></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Send Report Modal */}
        <AnimatePresence>
          {showSendReportModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSendReportModal(false)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-5"><h2 className={`font-bold text-gray-800 flex items-center gap-2 ${textSizeClasses.title}`}><FaPaperPlane className="text-purple-500" /> Send Report</h2><button onClick={() => setShowSendReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
                <form onSubmit={handleSendReport} className="space-y-5">
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Recipient Type</label><div className="grid grid-cols-2 gap-2"><label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer"><input type="radio" value="hospital_admin" checked={sendReportForm.recipient_type === 'hospital_admin'} onChange={(e) => setSendReportForm({...sendReportForm, recipient_type: e.target.value, recipient_id: ''})} /><span>🏢 Hospital Admin</span></label><label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer"><input type="radio" value="doctor" checked={sendReportForm.recipient_type === 'doctor'} onChange={(e) => setSendReportForm({...sendReportForm, recipient_type: e.target.value, recipient_id: ''})} /><span>👨‍⚕️ Doctor</span></label><label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer"><input type="radio" value="pharmacy" checked={sendReportForm.recipient_type === 'pharmacy'} onChange={(e) => setSendReportForm({...sendReportForm, recipient_type: e.target.value, recipient_id: ''})} /><span>💊 Pharmacy</span></label><label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer"><input type="radio" value="lab" checked={sendReportForm.recipient_type === 'lab'} onChange={(e) => setSendReportForm({...sendReportForm, recipient_type: e.target.value, recipient_id: ''})} /><span>🔬 Lab</span></label></div></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Recipient *</label><select value={sendReportForm.recipient_id} onChange={(e) => setSendReportForm({...sendReportForm, recipient_id: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 ${textSizeClasses.base}`} required><option value="">Select Recipient...</option>{sendReportForm.recipient_type === 'hospital_admin' && hospitalAdmins.map(admin => <option key={admin.id} value={admin.id}>{admin.full_name} - {admin.hospital_name}</option>)}{sendReportForm.recipient_type === 'doctor' && doctors.map(doc => <option key={doc.id} value={doc.id}>Dr. {doc.full_name} - {doc.specialization || doc.ward} Ward</option>)}{sendReportForm.recipient_type === 'pharmacy' && pharmacyStaff.map(pharm => <option key={pharm.id} value={pharm.id}>{pharm.full_name} - Pharmacy</option>)}{sendReportForm.recipient_type === 'lab' && labStaff.map(lab => <option key={lab.id} value={lab.id}>{lab.full_name} - Lab</option>)}</select></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Priority</label><select value={sendReportForm.priority} onChange={(e) => setSendReportForm({...sendReportForm, priority: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`}><option value="low">🟢 Low</option><option value="medium">🟡 Medium</option><option value="high">🟠 High</option><option value="urgent">🔴 Urgent</option></select></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Title *</label><input type="text" value={sendReportForm.title} onChange={(e) => setSendReportForm({...sendReportForm, title: e.target.value})} placeholder="e.g., Weekly ANC Report" className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} required /></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Message *</label><textarea value={sendReportForm.body} onChange={(e) => setSendReportForm({...sendReportForm, body: e.target.value})} rows="5" placeholder="Enter report details..." className={`w-full p-3 border border-gray-300 rounded-xl resize-none ${textSizeClasses.base}`} required /></div>
                  <div><label className={`block font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Attachments</label><input type="file" ref={fileInputRef} onChange={(e) => { const files = Array.from(e.target.files); setSendReportForm(prev => ({ ...prev, attachments: [...prev.attachments, ...files] })); files.forEach(file => { if (file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = (e) => setAttachmentPreview(prev => [...prev, { name: file.name, url: e.target.result }]); reader.readAsDataURL(file); } else { setAttachmentPreview(prev => [...prev, { name: file.name, url: null }]); } }); }} multiple accept="image/*,.pdf" className={`w-full p-2 border border-gray-300 rounded-xl file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 ${textSizeClasses.base}`} /></div>
                  <div className="flex gap-3 pt-5"><button type="button" onClick={() => setShowSendReportModal(false)} className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition ${textSizeClasses.base}`}>Cancel</button><button type="submit" disabled={loading} className={`flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${textSizeClasses.base}`}>{loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}{loading ? 'Sending...' : 'Send Report'}</button></div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Detail Modal */}
        {showReportDetailModal && selectedReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200"><div className="flex items-center gap-3">{!selectedReport.is_opened ? <FaEnvelope className="text-purple-500 text-xl" /> : <FaEnvelopeOpen className="text-gray-400 text-xl" />}<h2 className={`font-bold text-gray-800 ${textSizeClasses.title}`}>{selectedReport.title}</h2></div><button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
              <div className="space-y-5">
                <div className="flex justify-between"><div><p className={`text-sm text-gray-500 ${textSizeClasses.base}`}>From</p><p className={`font-semibold text-gray-800 ${textSizeClasses.base}`}>{selectedReport.sender_full_name}</p></div><div className="text-right"><p className={`text-sm text-gray-500 ${textSizeClasses.base}`}>Priority</p><span className={`px-3 py-1 rounded-full text-sm ${selectedReport.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{selectedReport.priority}</span></div></div>
                <div><p className={`text-sm text-gray-500 ${textSizeClasses.base}`}>Date Received</p><p className={`text-gray-700 ${textSizeClasses.base}`}>{new Date(selectedReport.sent_at).toLocaleString()}</p></div>
                <div className="bg-gray-50 p-5 rounded-xl"><p className={`text-sm text-gray-500 mb-2 ${textSizeClasses.base}`}>Message</p><p className={`whitespace-pre-wrap text-gray-800 ${textSizeClasses.base}`}>{selectedReport.body}</p></div>
                <div className="flex gap-3 pt-4 border-t border-gray-200"><button onClick={() => { setShowReportDetailModal(false); setShowReplyModal(true); }} className={`flex-1 px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2 ${textSizeClasses.base}`}><FaReply /> Reply</button><button onClick={() => { setShowReportDetailModal(false); setSelectedReport(null); }} className={`flex-1 px-5 py-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`}>Close</button></div>
              </div>
            </div>
          </div>
        )}

        {/* Reply Modal */}
        {showReplyModal && selectedReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
              <div className="flex justify-between items-center mb-5"><h2 className={`font-bold text-gray-800 flex items-center gap-2 ${textSizeClasses.title}`}><FaReply className="text-purple-500" /> Reply to Report</h2><button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
              <div className="mb-4 p-4 bg-gray-50 rounded-xl"><p className={`text-xs text-gray-500 mb-1 ${textSizeClasses.base}`}>Original Report</p><p className={`font-medium text-gray-800 ${textSizeClasses.base}`}>{selectedReport.title}</p><p className={`text-xs text-gray-400 mt-1 ${textSizeClasses.base}`}>From: {selectedReport.sender_full_name}</p></div>
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows="5" placeholder="Type your reply here..." className={`w-full p-3 border border-gray-300 rounded-xl resize-none ${textSizeClasses.base}`} />
              <div className="mt-4"><label className={`block text-sm font-medium text-gray-700 mb-2 ${textSizeClasses.base}`}>Attachment (Optional)</label><input type="file" onChange={(e) => setReplyAttachment(e.target.files[0])} accept="image/*,.pdf" className={`w-full p-2 border border-gray-300 rounded-xl ${textSizeClasses.base}`} /></div>
              <div className="flex gap-3 pt-5 mt-2"><button onClick={() => { setShowReplyModal(false); setReplyText(''); setReplyAttachment(null); }} className={`flex-1 px-5 py-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`}>Cancel</button><button onClick={handleSendReply} disabled={loading} className={`flex-1 px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2 ${textSizeClasses.base}`}>{loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}{loading ? 'Sending...' : 'Send Reply'}</button></div>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              <div className="flex justify-between items-center mb-5"><h2 className={`font-bold text-gray-800 ${textSizeClasses.title}`}>Change Password</h2><button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-2xl">×</button></div>
              <div className="space-y-5"><input type="password" placeholder="Current Password" value={passwordData.current_password} onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} /><input type="password" placeholder="New Password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} /><input type="password" placeholder="Confirm New Password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} className={`w-full p-3 border border-gray-300 rounded-xl ${textSizeClasses.base}`} /><div className="flex gap-4 pt-5"><button onClick={() => setShowPasswordModal(false)} className={`flex-1 px-5 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition ${textSizeClasses.base}`}>Cancel</button><button onClick={changePassword} className={`flex-1 px-5 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition ${textSizeClasses.base}`}>Change Password</button></div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MidwifeDashboard;