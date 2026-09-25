// @ts-nocheck
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import heroImg from "../assets/hero-user-coding.jpg";

const passwordStrength = (pw) => {
  if (pw.length === 0) return null;
  if (pw.length < 8) return { label: "Too short", color: "#ef4444" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  if (hasUpper && hasSpecial) return { label: "Strong", color: "#22c55e" };
  if (hasUpper || hasSpecial) return { label: "Medium", color: "#f59e0b" };
  return { label: "Weak", color: "#f97316" };
};

const validate = (form) => {
  const errs = {};
  if (!form.name.trim() || form.name.trim().length < 2)
    errs.name = "Name must be at least 2 characters";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errs.email = "Enter a valid email address";
  if (form.password.length < 8)
    errs.password = "Password must be at least 8 characters";
  if (form.password !== form.confirmPassword)
    errs.confirmPassword = "Passwords do not match";
  return errs;
};

const FieldError = ({ msg }) =>
  msg ? <p style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{msg}</p> : null;

const Register = ({ onRegister }) => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
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
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Registration successful! Redirecting...");
        if (onRegister) {
          onRegister({ name: data.user.name, email: data.user.email, _id: data.user._id, token: data.token });
        }
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        // Map server error back to field if possible
        if (data.message?.toLowerCase().includes("email")) {
          setErrors({ email: data.message });
        } else {
          toast.error(data.message || "Registration failed");
        }
      }
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(form.password);
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
          <h2 className="text-2xl font-bold mb-1 text-blue-700">Create account</h2>
          <p className="text-gray-500 text-sm mb-6">Join Smart Scheduler to start scheduling meetings.</p>

          <div className="mb-4">
            <label className="block mb-1 font-medium text-gray-700">Full Name</label>
            <input
              type="text" name="name" value={form.name}
              onChange={handleChange} onBlur={handleBlur}
              autoComplete="name"
              className={inputClass("name")}
              placeholder="Jane Doe"
            />
            <FieldError msg={touched.name && errors.name} />
          </div>

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

          <div className="mb-4">
            <label className="block mb-1 font-medium text-gray-700">Password</label>
            <input
              type="password" name="password" value={form.password}
              onChange={handleChange} onBlur={handleBlur}
              autoComplete="new-password"
              className={inputClass("password")}
              placeholder="Min. 8 characters"
            />
            {strength && (
              <p style={{ color: strength.color, fontSize: 13, marginTop: 4 }}>
                Password strength: <strong>{strength.label}</strong>
              </p>
            )}
            <FieldError msg={touched.password && errors.password} />
          </div>

          <div className="mb-6">
            <label className="block mb-1 font-medium text-gray-700">Confirm Password</label>
            <input
              type="password" name="confirmPassword" value={form.confirmPassword}
              onChange={handleChange} onBlur={handleBlur}
              autoComplete="new-password"
              className={inputClass("confirmPassword")}
              placeholder="Re-enter your password"
            />
            <FieldError msg={touched.confirmPassword && errors.confirmPassword} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Register"}
          </button>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
