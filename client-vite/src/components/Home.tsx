// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import heroImg from '../assets/new-coding-img.png';
import StepCards from './StepCards';

function Home() {
  return (
    <div>
      <div className="flex flex-col md:flex-row items-stretch justify-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-purple-50 mb-16">
        <div className="md:w-[45vw] w-full h-[350px] md:h-auto flex-shrink-0 flex items-stretch">
          <img
            src={heroImg}
            alt="Smart Scheduler illustration"
            className="w-full h-full object-cover md:rounded-none rounded-b-xl shadow-lg border-0"
            style={{ minHeight: 350, maxHeight: '100vh' }}
          />
        </div>
        <div className="md:w-[55vw] w-full flex flex-col items-center md:items-start justify-center px-6 py-10 md:py-0 gap-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 drop-shadow">Smart Scheduler</h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-xl">
            Smart Scheduler is an intelligent meeting coordination platform designed to simplify and automate team scheduling. By collecting availability from all participants and applying optimized algorithms, it suggests the top three time slots with maximum overlap. Users can finalize a slot and auto-generate a Google Meet link, making the entire process seamless. Built with a focus on productivity and collaboration, Smart Scheduler ensures efficient time management for teams, friends, or colleagues — without the back-and-forth.
          </p>
          <div className="flex gap-4 mt-2">
            <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition text-lg">Login</Link>
            <Link to="/register" className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg shadow transition text-lg">Sign Up</Link>
          </div>
        </div>
      </div>
      <div id="how-it-works">
        <StepCards />
      </div>
    </div>
  );
}

export default Home; 
