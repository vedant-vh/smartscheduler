// @ts-nocheck
import React, { useState, useEffect } from 'react';

function StepCards() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: 1,
      title: "Add Friends",
      description: "Start by adding friends and colleagues to your network. Search for users and send connection requests to build your team.",
      icon: "👥",
      color: "from-blue-500 to-blue-600"
    },
    {
      step: 2,
      title: "Accept Requests",
      description: "Review and accept incoming connection requests from other users. This creates a two-way connection for scheduling meetings.",
      icon: "✅",
      color: "from-green-500 to-green-600"
    },
    {
      step: 3,
      title: "Schedule Meet",
      description: "Create a new meeting, invite your friends, and let our intelligent algorithm find the best time slots for everyone.",
      icon: "📅",
      color: "from-purple-500 to-purple-600"
    },
    {
      step: 4,
      title: "Get Meeting Link",
      description: "Once a time slot is finalized, automatically generate a Google Meet link and share it with all participants.",
      icon: "🔗",
      color: "from-orange-500 to-orange-600"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Follow these simple steps to start scheduling meetings efficiently with Smart Scheduler
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className={`relative group cursor-pointer transition-all duration-500 transform ${
                activeStep === index 
                  ? 'scale-105 shadow-2xl' 
                  : 'scale-100 shadow-lg hover:scale-105'
              }`}
              onClick={() => setActiveStep(index)}
            >
              {/* Animated border */}
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${step.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              
              <div className="relative bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-transparent transition-all duration-300">
                {/* Step number */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r ${step.color} text-white font-bold text-lg mb-4 transition-transform duration-300 group-hover:scale-110`}>
                  {step.step}
                </div>

                {/* Icon */}
                <div className="text-4xl mb-4 transition-transform duration-300 group-hover:scale-110">
                  {step.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>

                {/* Active indicator */}
                {activeStep === index && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>

              {/* Connection line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-gray-300 to-transparent transform -translate-y-1/2"></div>
              )}
            </div>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center mt-8 space-x-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveStep(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                activeStep === index 
                  ? 'bg-blue-600 scale-125' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default StepCards; 
