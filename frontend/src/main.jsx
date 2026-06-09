import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}
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
import Packages from './pages/Packages';
import ServiceVisits from './pages/ServiceVisits';
import Expenses from './pages/Expenses';
import ClientTicket from './pages/ClientTicket';
import ClientBooking from './pages/ClientBooking';

function PrivateRoute({ children }) {
  return localStorage.getItem('amc_token') ? children : <Navigate to="/login" />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/ticket/:token" element={<ClientTicket />} />
      <Route path="/booking/:token" element={<ClientBooking />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="villas" element={<Villas />} />
        <Route path="clients" element={<Clients />} />
        <Route path="packages" element={<Packages />} />
        <Route path="visits" element={<ServiceVisits />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="procurement" element={<Procurement />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="reports" element={<Reports />} />
        <Route path="recycle" element={<RecycleBin />} />
      </Route>
    </Routes>
  </BrowserRouter>
);