import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { BiometriaProvider } from '@/context/BiometriaContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Router from '@/router';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <BiometriaProvider>
            <Router />
            <Toaster richColors position="top-right" />
          </BiometriaProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
