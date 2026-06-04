import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import InvestorDashboard from './components/InvestorDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/investor-dashboard" element={<InvestorDashboard />} />
        
        <Route path="/" element={<Navigate to="/investor-dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;