// src/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { callBackend } from './utils/moduleStructureAPI';
import Loader from './components/Loader';
import { Eye, EyeOff } from 'lucide-react';


function Login({setUser}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const loginStart = performance.now(); // ✅ start timer
    setLoading(true);
    setError('');

    try {
      const res = await callBackend('login',  { username, password });
      const loginEnd = performance.now(); // ✅ end timer

      console.log(`⏱ Login API took: ${(loginEnd - loginStart).toFixed(2)} ms`);
      const userData = {
            userid: res.userid,
            username: res.username,
            fullName: res.fullName,
            role: res.role,
            loginTimeMs: loginEnd - loginStart,
            };
      if (res.success) {
        sessionStorage.setItem('user', JSON.stringify(userData));
        setUser(userData); // navigate('/master/product'); // or default route
        setLoading(false);
        return;
      } else {
        setError(res.message || 'Login failed');
        setLoading(false); // keep loader off if failed
      }
    } catch (err) {
      setError('Something went wrong');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-r from-gray-50 to-gray-100">
      {loading ? (
        <Loader message="login" />
      ) : (
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-lg shadow-md w-96 space-y-4"
        >
          <h2 className="text-2xl font-bold text-center text-gray-800">Login</h2>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="input-field"
            />
          </div>

          <div className="relative">
            <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field pr-10"
            />
            <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-blue-600 focus:outline-none"
            >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>

          <button
            type="submit"
            className="btn-primary w-full"
          >
            Login
          </button>
        </form>
      )}
    </div>
  );
}

export default Login;
