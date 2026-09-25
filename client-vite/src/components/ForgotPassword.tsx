// @ts-nocheck
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
      <ToastContainer />
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {submitted ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-2xl font-bold text-blue-700 mb-2">Check your inbox</h2>
            <p className="text-gray-600 text-sm mb-6">
              If <strong>{email}</strong> is registered, we've sent a password reset link. 
              It expires in <strong>1 hour</strong>.
            </p>
            <p className="text-gray-500 text-xs mb-4">Didn't get it? Check your spam folder.</p>
            <Link to="/login" className="text-blue-600 hover:underline text-sm font-medium">
              ← Back to login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-blue-700 mb-1">Forgot password?</h2>
            <p className="text-gray-500 text-sm mb-6">
              Enter your email and we'll send you a secure reset link.
            </p>
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-5">
                <label className="block mb-1 font-medium text-gray-700">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  autoComplete="email"
                  placeholder="jane@example.com"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    emailError ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
                  }`}
                />
                {emailError && (
                  <p style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{emailError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-5">
              Remember it?{" "}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">Log in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
