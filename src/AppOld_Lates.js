// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { fetchAppModules } from './utils/moduleStructureAPI';
import ModuleManagement from './ModuleManagement';
import LogManagement from './LogManagement';
import ComingSoon from './components/comingSoon';
import Loader from './components/Loader';
import Login from './Login';
import PrivateRoute from './PrivateRoute';

function App() {
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [appModules, setAppModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const userId = user?.userid;
  const currentPathKey = location.pathname.split('/')[2] || '';

  const userIdPopoverRef = useRef();
  const [showUserIdPopover, setShowUserIdPopover] = useState(false);

//   if (userId && location.pathname === '/login') {
//   return <Navigate to="/dashboard" replace />;
// }

  useEffect(() => {
    if (userId && appModules.length === 0) {
      setModulesLoading(true);
      const start = performance.now();
      fetchAppModules()
        .then((data) => {
          const end = performance.now();
          console.log(`📦 Module fetch took ${(end - start).toFixed(2)} ms`);
          setAppModules(data);
        })
        .catch((err) => {
          console.error("Failed to fetch app module structure:", err);
        })
        .finally(() => setModulesLoading(false));
    }
  }, [userId]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userIdPopoverRef.current && !userIdPopoverRef.current.contains(e.target)) {
        setShowUserIdPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLinkClick = () => isMobileView && setIsNavCollapsed(true);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  const findModuleLabel = (moduleKey, modulesData) => {
    for (let parent of modulesData) {
      const found = parent.modules.find(mod => mod.module === moduleKey);
      if (found) return found.label;
    }
    return null;
  };

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }


  if (modulesLoading && appModules.length === 0) {
    return <Loader message="appBeingReady" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="header-bg flex justify-between items-center px-4 py-2">
        <div className="flex items-center">
          <button
            onClick={() => setIsNavCollapsed(!isNavCollapsed)}
            className="p-2 mr-4 rounded-md hover:bg-blue-700"
          >
            <img src="/logo192.png" alt="Menu" className="h-8 w-8" />
          </button>
          <h1 className="header-title capitalize">
            {findModuleLabel(currentPathKey, appModules) || 'Dashboard'}
          </h1>
        </div>

        {user?.fullName && (
          <div className="flex items-center gap-4 text-white">
            <span className="text-sm font-medium">{user.fullName}</span>
            <button
              onClick={handleLogout}
              title="Logout"
              className="hover:text-red-300 transition"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </header>

      {/* Layout */}
      <div className="flex flex-1 relative">
        {isMobileView && !isNavCollapsed && (
          <div className="mobile-nav-overlay" onClick={() => setIsNavCollapsed(true)} />
        )}

        {/* Sidebar */}
        <nav className={`nav-sidebar ${isNavCollapsed ? 'nav-collapsed' : 'nav-expanded'}`}>
          <ul className="nav-list">
            {appModules.map(({ parentModule, title, modules }) => (
              <li key={parentModule}>
                {!isNavCollapsed && <div className="nav-group-title">{title}</div>}
                {modules.map(({ module, label }) => (
                  <Link
                    key={`${parentModule}_${module}`}
                    to={`/${parentModule}/${module}`}
                    className={`nav-button ${location.pathname.includes(`/${parentModule}/${module}`) ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    {isNavCollapsed ? label?.[0]?.toUpperCase() : label}
                  </Link>
                ))}
              </li>
            ))}
          </ul>
        </nav>

        {/* Main */}
        <main className="flex-grow container main-content-area" style={{ minWidth: 0 }}>
          <Routes>
            <Route path="/login" element={<Login />} />

            {appModules.length > 0 && (
              <Route
                path="/"
                element={<Navigate to={`/${appModules[0].parentModule}/${appModules[0].modules[0].module}`} replace />}
              />
            )}

            {appModules.flatMap(({ parentModule, modules }) =>
                modules.map(({ module, sheetId, label }) => (
                  <Route
                    key={`${parentModule}_${module}`}
                    path={`/${parentModule}/${module}`}
                    element={
                      <PrivateRoute>
                        {parentModule === 'master' ? (
                          <ModuleManagement module={module} />
                        ) : parentModule === 'logData' ? (
                          <LogManagement module={module} />
                        ) : (
                          <ComingSoon moduleLabel={label || module} />
                        )}
                      </PrivateRoute>
                    }
                  />
                ))
              )}

            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
