import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contracts from './pages/Contracts';
import Villas from './pages/Villas';
import Clients from './pages/Clients';
import Tickets from './pages/Tickets';
import Schedule from './pages/Schedule';
import Procurement from './pages/Procurement';
import Reports from './pages/Reports';
import RecycleBin from './pages/RecycleBin';

function PrivateRoute({ children }) {
  return localStorage.getItem('amc_token') ? children : <Navigate to="/login" />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="villas" element={<Villas />} />
        <Route path="clients" element={<Clients />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="procurement" element={<Procurement />} />
        <Route path="reports" element={<Reports />} />
        <Route path="recycle" element={<RecycleBin />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
