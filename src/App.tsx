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
import PropertiesDashboard from './pages/PropertiesDashboard';
import PropertyGuard from './components/auth/PropertyGuard';


// Placeholders temporales para las otras páginas
import Expenses from './pages/Expenses';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  if (!user) return <Navigate to="/login" replace />;

  return children;
};

import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        {/* SettingsProvider se mueve abajo, dentro de la propiedad */}
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50">
            <Routes>
              {/* 1. Login (Público) */}
              <Route path="/login" element={<Login />} />

              {/* 2. Rutas Globales (Protegidas) */}
              <Route path="/" element={
                <PrivateRoute>
                  <>
                    <Navbar />
                    <PropertiesDashboard />
                  </>
                </PrivateRoute>
              } />

              <Route path="/profile" element={
                <PrivateRoute>
                  <>
                    <Navbar />
                    <Profile />
                  </>
                </PrivateRoute>
              } />

              {/* 3. Rutas de Propiedad Específica (Protegidas + Contexto de Configuración) */}
              <Route path="/property/:propertyId/*" element={
                <PrivateRoute>
                  <PropertyGuard>
                    <SettingsProvider>
                      <>
                        <Navbar />
                        <main className="max-w-5xl mx-auto">
                          <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="bookings" element={<Bookings />} />
                            <Route path="expenses" element={<Expenses />} />
                            <Route path="settings" element={
                              <PropertyGuard requireAdmin={true}>
                                <Settings />
                              </PropertyGuard>
                            } />
                            {/* Si ponen una ruta loca DENTRO de la propiedad, van al Home de la propiedad */}
                            <Route path="*" element={<Navigate to="" replace />} />
                          </Routes>
                        </main>
                      </>
                    </SettingsProvider>
                  </PropertyGuard>
                </PrivateRoute>
              } />

              {/* 4. Página 404 Global */}
              {/* Si ninguna de las anteriores coincide, mostramos NotFound */}
              <Route path="*" element={<NotFound />} />

            </Routes>
            <Toaster position="top-center" richColors />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;