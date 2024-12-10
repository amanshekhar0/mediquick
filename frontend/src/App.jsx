import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./Pages/Landing.jsx"; // Ensure correct file paths
import Services from "./Pages/Services.jsx"; // Ensure correct file paths
import SearchPage from "./Pages/SearchPage.jsx"; // Ensure correct file paths
import UserSignUp from "./Pages/UserLogin/UserSignUp.jsx";
import AdminSignup from "./Pages/AdminLogin/AdminSignUp.jsx";
import AdminLogin from "./Pages/AdminLogin/AdminLogin.jsx";
import UserLoginpart from "./Pages/UserLogin/UserLoginpart.jsx";
import AdminDashBoard from "./Pages/AdminLogin/AdminDashBoard.jsx";
import EquipmentForm from "./Pages/AdminLogin/EquipmentForm.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* Define the routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/services" element={<Services />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="userlogin" element={<UserLoginpart />} />
        <Route path="usersignup" element={<UserSignUp />} />
        <Route path="hospitallogin" element={<AdminLogin />} />
        <Route path="hospitalsignup" element={<AdminSignup />} />
        <Route path="/dashboard" element={<AdminDashBoard />} />
        <Route path="/add-equipment" element={<EquipmentForm />} />
      </Routes>
    </Router>
  );
}


export default App;
