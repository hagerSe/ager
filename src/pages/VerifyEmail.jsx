import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

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
        console.log('🔍 Full URL:', window.location.href);
        
        if (!token) {
          setStatus('error');
          setMessage('No verification token found in the link');
          setDebug('Token is missing from URL parameters');
          return;
        }
        
        setDebug(`Token received: ${token.substring(0, 20)}... (${token.length} chars)\n`);
        
        // Validate token format (basic check)
        if (token.length < 10) {
          setDebug(prev => prev + `\n⚠️ Token seems too short: ${token.length} characters`);
        }
        
        // Try different URL patterns (your backend route might be different)
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const verificationUrl = `${backendUrl}/api/auth/verify-email/${token}`;
        
        setDebug(prev => prev + `\n📡 Attempting to connect to: ${verificationUrl}`);
        
        const response = await axios.get(verificationUrl, {
          timeout: 15000, // 15 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📡 Full Response:', response);
        console.log('📡 Response data:', response.data);
        setDebug(prev => prev + `\n✅ Response received (Status: ${response.status})`);
        setDebug(prev => prev + `\n📦 Response data: ${JSON.stringify(response.data, null, 2)}`);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || '✅ Email verified successfully! You can now login.');
          
          // Store verification status in localStorage
          localStorage.setItem('email_verified', 'true');
          
          // Redirect to login after 3 seconds
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
          setDebug(prev => prev + `\n❌ Verification failed: ${response.data.message}`);
          
          // Check if token might be expired
          if (response.data.message?.toLowerCase().includes('expired')) {
            setDebug(prev => prev + `\n⏰ Token appears to be expired. Request a new verification link.`);
            setCanRetry(true);
          }
        }
      } catch (error) {
        console.error('❌ Verification Error:', error);
        console.error('Error config:', error.config);
        console.error('Error response:', error.response);
        console.error('Error request:', error.request);
        
        let errorMessage = '';
        let debugInfo = debug;
        
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Connection timeout. Server might be slow or not responding.';
          debugInfo += `\n⏰ Connection timeout after ${error.config?.timeout || 'unknown'}ms`;
        } else if (error.response) {
          // Server responded with error status
          debugInfo += `\n❌ Server responded with status: ${error.response.status}`;
          debugInfo += `\n📄 Error data: ${JSON.stringify(error.response.data, null, 2)}`;
          
          switch (error.response.status) {
            case 400:
              errorMessage = error.response.data?.message || 'Invalid verification link format';
              break;
            case 404:
              errorMessage = 'Verification link not found or already used';
              debugInfo += `\n🔍 Token may be invalid or already verified`;
              break;
            case 410:
              errorMessage = 'Verification link has expired';
              debugInfo += `\n⏰ Token has expired. Please request a new verification email.`;
              setCanRetry(true);
              break;
            case 500:
              errorMessage = 'Server error. Please try again later.';
              debugInfo += `\n⚠️ Backend server error - check your backend logs`;
              break;
            default:
              errorMessage = error.response.data?.message || `Server error (${error.response.status})`;
          }
        } else if (error.request) {
          // Request made but no response
          errorMessage = 'Cannot connect to verification server. Make sure backend is running.';
          debugInfo += `\n🔌 No response from server. Request made but no reply.`;
          debugInfo += `\n🌐 Check if backend is running on http://localhost:5001`;
        } else {
          // Something else
          errorMessage = `Error: ${error.message}`;
          debugInfo += `\n⚠️ Unexpected error: ${error.message}`;
        }
        
        setStatus('error');
        setMessage(errorMessage);
        setDebug(debugInfo);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendVerification = () => {
    // Navigate to resend verification page or show modal
    navigate('/resend-verification', { 
      state: { 
        email: '', // User can enter email on next page
        fromVerify: true 
      }
    });
  };

  const handleRetry = () => {
    setStatus('verifying');
    setMessage('');
    setDebug('');
    setCanRetry(false);
    // Re-run verification
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
            
            {/* Debug info - only show in development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer">Debug Info</summary>
                <pre className="mt-2 text-xs text-left bg-gray-100 p-3 rounded overflow-auto max-h-48">
                  {debug || 'Waiting for response...'}
                </pre>
              </details>
            )}
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
            <div className="mt-4">
              <div className="animate-pulse">
                <p className="text-sm text-gray-500">Redirecting to login page...</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Login Now
              </button>
            </div>
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
            
            {/* Suggestion messages based on error */}
            {message.includes('expired') && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 Verification links expire after 24 hours. Please request a new link.
                </p>
              </div>
            )}
            
            {message.includes('already') && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Your email might already be verified. Try logging in.
                </p>
              </div>
            )}
            
            {message.includes('Cannot connect') && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">
                  💡 Make sure the backend server is running on port 5001
                </p>
              </div>
            )}
            
            {/* Debug info for developers */}
            {process.env.NODE_ENV === 'development' && debug && (
              <details className="mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer">Technical Details</summary>
                <pre className="mt-2 text-xs text-left bg-gray-100 p-3 rounded overflow-auto max-h-48">
                  {debug}
                </pre>
              </details>
            )}
            
            <div className="mt-6 space-y-3">
              {canRetry && (
                <button
                  onClick={handleRetry}
                  className="w-full px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  🔄 Retry Verification
                </button>
              )}
              
              <button
                onClick={handleResendVerification}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📧 Request New Verification Link
              </button>
              
              <button
                onClick={() => navigate('/login')}
                className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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