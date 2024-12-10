import React from 'react';
import Slider from 'react-slick';
import { FaStar } from 'react-icons/fa';
import '../App.css'; // Import the CSS file
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import p1 from "../assets/p1.jpeg";
import p2 from "../assets/p2.jpeg";
import p3 from "../assets/p3.jpeg";
import p4 from "../assets/p4.jpeg";
import p5 from "../assets/p5.jpeg";
import p7 from "../assets/p7.jpeg";
import p8 from "../assets/p8.jpeg";


const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      image: p1,
      name: 'John Doe',
      text: 'This platform helped me find medical equipment in my area quickly and easily!',
      rating: 5,
    },
    {
      id: 2,
      image: p2,
      name: 'Jane Smith',
      text: 'I was able to find the equipment I needed in just a few minutes. Great service!',
      rating: 4,
    },
    {
      id: 3,
      image: p3,
      name: 'David Brown',
      text: 'A very user-friendly platform that made my search for medical supplies stress-free.',
      rating: 5,
    },
    {
      id: 4,
      image: p4,
      name: 'Sarah Lee',
      text: 'Amazing service! I found what I was looking for in no time.',
      rating: 4,
    },
    {
      id: 5,
      image: p5,
      name: 'Michael Johnson',
      text: 'Great website! Helped me to find medical equipment in my locality with ease.',
      rating: 5,
    },
    {
      id: 6,
      image: p7,
      name: 'Emily Wilson',
      text: 'I was able to find my required items very quickly. Highly recommend!',
      rating: 4,
    },
    {
      id: 7,
      image: p8,
      name: 'Chris Parker',
      text: 'Super easy to use and very reliable in providing up-to-date information.',
      rating: 5,
    },
    {
      id: 8,
      image: p5,
      name: 'Nina Patel',
      text: 'Fantastic platform for healthcare equipment! Very happy with the service.',
      rating: 5,
    },
    {
      id: 9,
      image: 'https://via.placeholder.com/100',
      name: 'Tom Harris',
      text: 'Very convenient and helpful. I found everything I needed in no time.',
      rating: 4,
    },
  ];

  // Carousel settings for 2 items displayed at a time
  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 2, // Display 2 cards at a time
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 1000, // 2 seconds
    responsive: [
      {
        breakpoint: 768, // For mobile devices
        settings: {
          slidesToShow: 1, // Show 1 card on smaller screens
        },
      },
    ],
  };

  return (
    <section id="testimonials" className="testimonials-container">
      <h1 className="testimonials-heading">What Our Users Say</h1>

      {/* Carousel */}
      <Slider {...settings}>
        {testimonials.map((testimonial) => (
          <div className="testimonial-card" key={testimonial.id}>
            <div className="testimonial-content">
              {/* User Image */}
              <img src={testimonial.image} alt={testimonial.name} className="testimonial-image" />
              <div className="testimonial-text">
                <p className="testimonial-name">{testimonial.name}</p>
                <div className="testimonial-rating">
                  {/* Star Rating aligned horizontally */}
                  {[...Array(5)].map((_, index) => (
                    <FaStar key={index} color={index < testimonial.rating ? "#FFD700" : "#d3d3d3"} />
                  ))}
                </div>
                <p className="testimonial-description">{testimonial.text}</p>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </section>
  );
};

export default Testimonials;
