import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ==================== USE SAME BACKEND URL AS LOGIN ====================
import { API_URL, BACKEND_URL } from '../config/api.js';

const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [debug, setDebug] = useState('');
  const [canRetry, setCanRetry] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log('🔍 Verification token from URL:', token);
        console.log('🔍 Backend URL:', BACKEND_URL);
        
        if (!token) {
          setStatus('error');
          setMessage('No verification token found in the link');
          setDebug('Token is missing from URL parameters');
          return;
        }
        
        setDebug(`Token received: ${token.substring(0, 20)}... (${token.length} chars)\n`);
        
        // ✅ FIXED: Use the SAME URL as your login component
        const verificationUrl = `${API_URL}/auth/verify-email/${token}`;
        
        setDebug(prev => prev + `\n📡 Attempting to connect to: ${verificationUrl}`);
        
        const response = await axios.get(verificationUrl, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📡 Response:', response.data);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || '✅ Email verified successfully! You can now login.');
          localStorage.setItem('email_verified', 'true');
          
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                verified: true, 
                message: 'Email verified! Please login.' 
              }
            });
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Verification failed');
          
          if (response.data.message?.toLowerCase().includes('expired')) {
            setCanRetry(true);
          }
        }
      } catch (error) {
        console.error('❌ Verification Error:', error);
        
        let errorMessage = '';
        
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Connection timeout. Server might be slow.';
        } else if (error.response) {
          switch (error.response.status) {
            case 400:
              errorMessage = error.response.data?.message || 'Invalid verification link';
              break;
            case 404:
              errorMessage = 'Verification link not found or already used';
              break;
            case 410:
              errorMessage = 'Verification link has expired';
              setCanRetry(true);
              break;
            default:
              errorMessage = error.response.data?.message || `Server error (${error.response.status})`;
          }
        } else if (error.request) {
          errorMessage = `Cannot connect to backend at ${BACKEND_URL}. Make sure backend is running.`;
        } else {
          errorMessage = `Error: ${error.message}`;
        }
        
        setStatus('error');
        setMessage(errorMessage);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendVerification = () => {
    navigate('/resend-verification', { 
      state: { 
        email: '', 
        fromVerify: true 
      }
    });
  };

  const handleRetry = () => {
    setStatus('verifying');
    setMessage('');
    setDebug('');
    setCanRetry(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-blue-50 to-gray-200 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        
        {status === 'verifying' && (
          <>
            <div className="inline-block">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Verifying Email...</h2>
            <p className="text-gray-600 mt-2">Please wait while we verify your email address.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-600">Email Verified!</h2>
            <p className="text-gray-700 mt-2">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Login Now
            </button>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600">Verification Failed</h2>
            <p className="text-gray-700 mt-2">{message}</p>
            
            <div className="mt-6 space-y-3">
              <button
                onClick={handleResendVerification}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Request New Verification Link
              </button>
              
              <button
                onClick={() => navigate('/login')}
                className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;