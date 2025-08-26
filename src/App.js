// src/App.js
import React from "react";
import { Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import Login from "./Login";
import Navigation from "./components/Navigation";

// Module screens
import Dashboard from "./modules/Dashboard";
import Production from "./modules/Production";
import Bottling from "./modules/Bottling";
import Inventory from "./modules/Inventory";
import Cash from "./modules/Cash";

function App() {
  const [user, setUser] = React.useState(() => {
    const stored = sessionStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  // If NOT logged in: only show Login
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Logged in: render app layout + module routes
  return (
    <Routes>
      <Route element={<AppLayout user={user} setUser={setUser} />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/production" element={<Production />} />
        <Route path="/bottling" element={<Bottling />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/cash" element={<Cash />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

function AppLayout({ user, setUser }) {
  const navigate = useNavigate();

  const logout = () => {
    sessionStorage.clear();
    setUser(null);
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation
        username={user?.fullName || user?.username}
        onLogout={logout}
      />
      <main className="container mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
