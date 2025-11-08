import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cameras from "./pages/Cameras";
import LiveViewer from "./pages/LiveViewer";
import Logs from "./pages/Logs";
import Watchlist from "./pages/Watchlist";
import Layout from "./components/Layout";
import "./App.css";

// Simple auth context for demo purposes
export const AuthContext = React.createContext({
  user: null,
  login: () => {},
  logout: () => {}
});

function App() {
  const [user, setUser] = React.useState(
    JSON.parse(localStorage.getItem('optiya-user') || 'null')
  );

  const login = (userData) => {
    console.log("AuthContext: login called with userData:", userData);
    setUser(userData);
    localStorage.setItem('optiya-user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('optiya-user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div className="min-h-screen bg-black text-white">
        <BrowserRouter>
          <Routes>
            {/* Landing Page - Public Route */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Auth Routes */}
            <Route 
              path="/login" 
              element={user ? <Navigate to="/app/dashboard" /> : <Login />} 
            />
            
            {/* Protected App Routes */}
            <Route 
              path="/app" 
              element={user ? <Layout /> : <Navigate to="/login" />}
            >
              <Route index element={<Navigate to="/app/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="cameras" element={<Cameras />} />
              <Route path="live/:cameraId?" element={<LiveViewer />} />
              <Route path="logs" element={<Logs />} />
              <Route path="watchlist" element={<Watchlist />} />
            </Route>
            
            {/* Catch all - redirect to landing */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </div>
    </AuthContext.Provider>
  );
}

export default App;
