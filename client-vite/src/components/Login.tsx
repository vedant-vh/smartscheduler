// @ts-nocheck
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import heroImg from "../assets/hero-user-coding.jpg";

const validate = (form) => {
  const errs = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errs.email = "Enter a valid email address";
  if (!form.password)
    errs.password = "Password is required";
  return errs;
};

const FieldError = ({ msg }) =>
  msg ? <p style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{msg}</p> : null;

const Login = ({ onLogin }) => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    setServerError("");
    if (touched[e.target.name]) {
      setErrors(validate(updated));
    }
  };

  const handleBlur = (e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
    setErrors(validate(form));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setServerError("");
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Login successful! Redirecting...");
        if (onLogin) onLogin(data);
      } else {
        setServerError(data.message || "Login failed");
      }
    } catch {
      setServerError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
      errors[field] && touched[field]
        ? "border-red-400 focus:ring-red-200"
        : "border-gray-300 focus:ring-blue-200"
    }`;

  return (
    <div className="flex flex-col md:flex-row items-stretch justify-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-purple-50">
      <ToastContainer />
      <div className="md:w-[45vw] w-full h-[300px] md:h-auto flex-shrink-0 flex items-stretch">
        <img
          src={heroImg}
          alt="Smart Scheduler illustration"
          className="w-full h-full object-cover md:rounded-none rounded-b-xl shadow-lg border-0"
          style={{ minHeight: 300, maxHeight: "100vh" }}
        />
      </div>
      <div className="md:w-[55vw] w-full flex flex-col items-center justify-center px-6 py-10 md:py-0">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md" noValidate>
          <h2 className="text-2xl font-bold mb-1 text-blue-700">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-6">Log in to your Smart Scheduler account.</p>

          {serverError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <div className="mb-4">
            <label className="block mb-1 font-medium text-gray-700">Email</label>
            <input
              type="email" name="email" value={form.email}
              onChange={handleChange} onBlur={handleBlur}
              autoComplete="email"
              className={inputClass("email")}
              placeholder="jane@example.com"
            />
            <FieldError msg={touched.email && errors.email} />
          </div>

          <div className="mb-2">
            <label className="block mb-1 font-medium text-gray-700">Password</label>
            <input
              type="password" name="password" value={form.password}
              onChange={handleChange} onBlur={handleBlur}
              autoComplete="current-password"
              className={inputClass("password")}
              placeholder="Your password"
            />
            <FieldError msg={touched.password && errors.password} />
          </div>

          <div className="flex justify-end mb-6">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>

          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
