// src/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { callBackend } from "./utils/moduleStructureAPI";
import Loader from "./components/Loader";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import logo from "./appImages/justpressedLogo.png";

import { Button } from "./packages/ui/button";
import { Input } from "./packages/ui/input";
import { Label } from "./packages/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./packages/ui/card";

function Login({ setUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const loginStart = performance.now();
    setLoading(true);
    setError("");

    try {
      const res = await callBackend("login", { username, password });
      const loginEnd = performance.now();

      console.log(`⏱ Login API took: ${(loginEnd - loginStart).toFixed(2)} ms`);
      const userData = {
        userid: res.userid,
        username: res.username,
        fullName: res.fullName,
        role: res.role,
        loginTimeMs: loginEnd - loginStart,
      };

      if (res.success) {
        sessionStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        setLoading(false);
        // go to dashboard (Figma flow)
        navigate('/dashboard', { replace: true });
        return;
      } else {
        setError(res.message || "Login failed");
        setLoading(false);
      }
    } catch (err) {
      setError("Something went wrong");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {loading ? (
        <Loader message="login" />
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            {/* Optional logo slot */}
            <div className="flex justify-center">
              <img src={logo} alt="Logo" className="h-20 w-auto" />
            </div>
            <div>
              <CardTitle className="text-2xl">Just Pressed Ops</CardTitle>
              <CardDescription className="mt-2">
                Sign in to access your daily operations dashboard
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Login;
