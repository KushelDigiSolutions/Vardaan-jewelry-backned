import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, RefreshCw, Eye, EyeOff } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Login toggles
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Password Recovery toggles
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.data.role !== 'admin') {
        throw new Error('Access Denied: Only admin accounts can log in here.');
      }

      onLoginSuccess(data.data.token, data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/otp-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      setOtpSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'OTP verification failed');
      }

      if (data.data.role !== 'admin') {
        throw new Error('Access Denied: Only admin accounts can log in here.');
      }

      onLoginSuccess(data.data.token, data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRecovery = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to request recovery code');
      }

      setRecoverySent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: recoveryCode, newPassword })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Password reset failed');
      }

      setRecoveryMode(false);
      setRecoverySent(false);
      alert('Password reset successfully. Please log in with your new password.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="card login-card">
        <div className="login-logo">
           Vardaan Jewellery
        </div>
        
        {error && (
          <div className="badge badge-danger" style={{ display: 'block', padding: '12px', marginBottom: '20px', borderRadius: '8px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* 1. Recovery Mode */}
        {recoveryMode ? (
          <div>
            <h3 style={{ marginBottom: '16px', fontFamily: 'var(--font-title)' }}>Recover Password</h3>
            {!recoverySent ? (
              <form onSubmit={handleRequestRecovery}>
                <div className="form-group">
                  <label>Admin Email</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    placeholder="Enter your Email"
                    // value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Requesting...' : 'Send Recovery Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label>Recovery Code (OTP)</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Enter code sent to email"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    required
                    className="form-control"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
            <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              Remember password? <span onClick={() => { setRecoveryMode(false); setRecoverySent(false); }} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Login here</span>
            </p>
          </div>
        ) : (
          /* 2. Authentication Login Forms */
          <div>
            {!useOtp ? (
              /* Password Login */
              <form onSubmit={handlePasswordLogin}>
                <div className="form-group">
                  <label>Admin Email</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    placeholder="Enter email"
                    // value={email}
                    autoComplete="off"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="form-control"
                      placeholder="••••••••"
                      value={password}
                      autoComplete="new-password"
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ width: '100%', paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0',
                        lineHeight: '1'
                      }}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {/* <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '20px' }}>
                  <span onClick={() => setUseOtp(true)} style={{ color: 'var(--secondary)', cursor: 'pointer' }}>
                    Login via OTP
                  </span>
                  <span onClick={() => setRecoveryMode(true)} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Forgot password?
                  </span>
                </div> */}
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                </button>
              </form>
            ) : (
              /* OTP Login */
              <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP}>
                <div className="form-group">
                  <label>Admin Email</label>
                  <input
                    type="email"
                    required
                    disabled={otpSent}
                    className="form-control"
                    placeholder="Enter your email"
                    // value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                {otpSent && (
                  <div className="form-group">
                    <label>6-Digit OTP Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      className="form-control"
                      placeholder="enter code "
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '20px' }}>
                  <span onClick={() => { setUseOtp(false); setOtpSent(false); }} style={{ color: 'var(--secondary)', cursor: 'pointer' }}>
                    Login via Password
                  </span>
                  {otpSent && (
                    <span onClick={handleSendOTP} style={{ color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={12} /> Resend OTP
                    </span>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Processing...' : (otpSent ? 'Verify & Sign In' : 'Send Verification OTP')}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
