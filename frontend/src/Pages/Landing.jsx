import React from "react";
import Header from "./Header";
import Home from "./Home";
import Aboutus from "./Aboutus";
import Testimonials from "./Testimonials";
import Footer from "./Footer";
import Contact from "./Contact";


const Landing = () => {
  return (
    <div>
      <>
        <Header />
        <Home />
        <Aboutus />
        <Testimonials />
        <Contact/>
        <Footer />
       
      </>
    </div>
  );
};

export default Landing;
