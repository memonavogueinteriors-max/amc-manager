import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contracts from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import Villas from './pages/Villas';
import Clients from './pages/Clients';
import Tickets from './pages/Tickets';
import Schedule from './pages/Schedule';
import Reports from './pages/Reports';
import RecycleBin from './pages/RecycleBin';
import Packages from './pages/Packages';
import ServiceBookings from './pages/ServiceBookings';
import CustomerHistory from './pages/CustomerHistory';
import TechnicianJobCards from './pages/TechnicianJobCards';
import ServiceVisits from './pages/ServiceVisits';
import ClientTicket from './pages/ClientTicket';
import ClientBooking from './pages/ClientBooking';
import ServiceReports from './pages/ServiceReports';
import Users from './pages/Users';
import Commissions from './pages/Commissions';
import BackupStatus from './pages/BackupStatus';

function PrivateRoute({ children }) {
  return localStorage.getItem('amc_token')
    ? children
    : <Navigate to="/login" replace />;
}

function OwnerRoute({ children }) {
  const user = JSON.parse(
    localStorage.getItem('amc_user') || '{}'
  );

  return ['owner', 'admin'].includes(user.role)
    ? children
    : <Navigate to="/" replace />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<Login />} />
        <Route path="/ticket/:token" element={<ClientTicket />} />
        <Route path="/booking/:token" element={<ClientBooking />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />

          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/:id" element={<ContractDetail />} />

          <Route path="villas" element={<Villas />} />
          <Route path="clients" element={<Clients />} />
          <Route path="packages" element={<Packages />} />

          <Route
            path="service-bookings"
            element={<ServiceBookings />}
          />

          <Route
            path="customer-history"
            element={<CustomerHistory />}
          />

          <Route
            path="technician-job-cards"
            element={<TechnicianJobCards />}
          />

          <Route
            path="service-reports"
            element={<ServiceReports />}
          />

          <Route
            path="visits"
            element={<ServiceVisits />}
          />

          <Route
            path="tickets"
            element={<Tickets />}
          />

          <Route
            path="schedule"
            element={<Schedule />}
          />

          <Route
            path="backup-status"
            element={
              <OwnerRoute>
                <BackupStatus />
              </OwnerRoute>
            }
          />

          <Route
            path="reports"
            element={<Reports />}
          />

          <Route
            path="users"
            element={<Users />}
          />

          <Route
            path="commissions"
            element={<Commissions />}
          />

          <Route
            path="recycle"
            element={<RecycleBin />}
          />

        </Route>

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);