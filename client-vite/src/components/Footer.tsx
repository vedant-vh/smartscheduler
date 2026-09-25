// @ts-nocheck
import React from 'react';

function Footer() {
  return (
    <footer className="bg-gray-600 text-white py-8 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-green-400">Smart Scheduler</h3>
            <p className="text-gray-300 mb-4">
              Intelligent meeting coordination platform designed to simplify and automate team scheduling.
            </p>
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Smart Scheduler. All rights reserved.
            </p>
          </div>

          {/* Developer */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-green-400">Developed By</h3>
            <div className="space-y-2">
              <p className="text-gray-300">Vedant Hadap</p>
            </div>
          </div>

          {/* Connect With Us */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-green-400">Connect With Us</h3>
            <div className="flex items-center gap-2 mt-2">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a
                href="mailto:vedanthadap123@gmail.com"
                className="text-gray-300 hover:text-green-400 transition-colors duration-200"
              >
                vedanthadap123@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
