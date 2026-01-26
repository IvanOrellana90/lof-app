import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home'; 
import { Toaster } from 'sonner';
import Bookings from './pages/Bookings';


// Placeholders temporales para las otras páginas
const Gastos = () => <div className="p-8"><h1 className="text-2xl font-bold">Gastos Comunes</h1></div>;

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        
        <main className="max-w-5xl mx-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/gastos" element={<Gastos />} />
          </Routes>
        </main>
        <Toaster position="top-center" richColors />
      </div>
    </BrowserRouter>
  );
}

export default App;