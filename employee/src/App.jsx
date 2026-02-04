import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { EmployeeAuthProvider } from './context/EmployeeAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <EmployeeAuthProvider>
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={2000} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navbar />
              </ProtectedRoute>
            }
          >
            <Route index element={<Properties />} />
            <Route path="properties" element={<Properties />} />
            <Route path="property/:propertyId" element={<PropertyDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </EmployeeAuthProvider>
  );
}

export default App;
