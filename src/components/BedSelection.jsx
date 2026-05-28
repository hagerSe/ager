import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSpinner, FaBed, FaCheck, FaTools, FaUser, FaCalendarAlt, FaSync, FaHospital, FaBaby, FaAmbulance } from 'react-icons/fa';

const BedSelection = ({ ward, hospitalId, onBedSelect, selectedBed, title = "Select Bed" }) => {
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    if (ward && hospitalId) {
      fetchAvailableBeds();
    }
  }, [ward, hospitalId]);

  const fetchAvailableBeds = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      console.log(`🔍 Fetching available beds for ${ward} ward`);
      
      // ✅ CORRECTED: Use the same endpoint as BedManagementDashboard
      const res = await axios.get(`${API_URL}/beds/all`, {
        params: {
          ward: ward,
          hospital_id: hospitalId
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        // ✅ Filter only available beds
        const availableBeds = res.data.beds.filter(bed => bed.status === 'available');
        console.log(`✅ Found ${availableBeds.length} available beds in ${ward} ward`);
        setBeds(availableBeds);
        if (availableBeds.length === 0) {
          setError('No beds available in this ward');
        }
      } else {
        setError('Failed to load beds');
      }
    } catch (error) {
      console.error('❌ Error fetching beds:', error);
      setError(error.response?.data?.message || 'Could not load beds');
    } finally {
      setLoading(false);
    }
  };

  const getBedIcon = (status) => {
    switch(status) {
      case 'available': return <FaCheck className="text-green-500" />;
      case 'occupied': return <FaUser className="text-red-500" />;
      case 'maintenance': return <FaTools className="text-gray-500" />;
      case 'reserved': return <FaCalendarAlt className="text-blue-500" />;
      default: return <FaBed className="text-gray-400" />;
    }
  };

  // ✅ UPDATED: Bed type icons based on your wards (OPD, EME, ANC)
  const getBedTypeIcon = (type) => {
    const icons = {
      OPD: <FaHospital className="text-blue-500" />,
      EME: <FaAmbulance className="text-red-500" />,
      ANC: <FaBaby className="text-pink-500" />
    };
    return icons[type] || <FaBed className="text-gray-400" />;
  };

  // ✅ UPDATED: Bed type text based on your wards
  const getBedTypeText = (type) => {
    const types = {
      OPD: 'OPD Ward',
      EME: 'EME Ward',
      ANC: 'ANC Ward'
    };
    return types[type] || type;
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'border-green-200 hover:border-green-500 hover:bg-green-50',
      occupied: 'border-gray-200 opacity-50 cursor-not-allowed',
      maintenance: 'border-gray-200 opacity-50 cursor-not-allowed',
      reserved: 'border-blue-200 opacity-50 cursor-not-allowed'
    };
    return colors[status] || colors.available;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-2" />
        <p className="text-xs text-gray-500">Loading beds...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-red-500 mb-2">{error}</p>
        <button
          onClick={fetchAvailableBeds}
          className="text-xs text-emerald-500 hover:text-emerald-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (beds.length === 0) {
    return (
      <div className="text-center py-4">
        <FaBed className="text-2xl text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-500">No available beds in {ward} ward</p>
        <p className="text-xs text-gray-400 mt-1">Patient will be processed without bed assignment</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <p className="text-xs text-gray-500">Click on an available bed to select</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
        {beds.map(bed => {
          const isAvailable = bed.status === 'available';
          const isSelected = selectedBed === bed.id;
          
          return (
            <div
              key={bed.id}
              onClick={() => isAvailable && onBedSelect(bed.id)}
              className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
                  : isAvailable
                  ? getStatusColor(bed.status)
                  : 'border-gray-200 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getBedTypeIcon(bed.type)}
                  <span className="font-bold text-base text-gray-800">Bed {bed.number}</span>
                </div>
                <span className="text-lg">{getBedIcon(bed.status)}</span>
              </div>
              
              <div className="text-xs font-medium text-gray-500 mb-2">
                {getBedTypeText(bed.type)}
              </div>
              
              {bed.status === 'available' && (
                <div className="text-xs font-medium text-green-600 flex items-center gap-1 mt-1">
                  <FaCheck className="text-xs" /> Available
                </div>
              )}
              
              {bed.notes && bed.status === 'available' && (
                <div className="text-xs text-gray-400 mt-2 truncate">
                  {bed.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {beds.filter(b => b.status === 'available').length} bed(s) available
        </div>
        <button
          onClick={fetchAvailableBeds}
          className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition"
        >
          <FaSync className="text-xs" /> Refresh
        </button>
      </div>
    </div>
  );
};

export default BedSelection;