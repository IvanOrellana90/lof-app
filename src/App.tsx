import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';

import Navbar from './components/layout/Navbar';
import Home from './pages/Home'; 
import Bookings from './pages/Bookings';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import { SettingsProvider } from './context/SettingsContext';
import Settings from './pages/Settings';


// Placeholders temporales para las otras páginas
const Gastos = () => <div className="p-8"><h1 className="text-2xl font-bold">Gastos Comunes</h1></div>;

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  if (!user) return <Navigate to="/login" replace />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50">
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/*" element={
                <PrivateRoute>
                  <>
                    <Navbar />
                    <main className="max-w-5xl mx-auto">
                      <Routes>
                        {/* Rutas válidas */}
                        <Route path="/" element={<Home />} />
                        <Route path="/bookings" element={<Bookings />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/expenses" element={<Gastos />} />
                        <Route path="/admin/settings" element={<Settings />} />
                        
                        {/* --- AQUÍ ESTÁ EL CAMBIO --- */}
                        {/* Si escriben cualquier otra cosa, mostramos el 404 */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                  </>
                </PrivateRoute>
              } />
            </Routes>
            <Toaster position="top-center" richColors />
          </div>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;