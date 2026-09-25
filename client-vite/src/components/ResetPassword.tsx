// @ts-nocheck
import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const passwordStrength = (pw) => {
  if (pw.length === 0) return null;
  if (pw.length < 8) return { label: "Too short", color: "#ef4444" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  if (hasUpper && hasSpecial) return { label: "Strong", color: "#22c55e" };
  if (hasUpper || hasSpecial) return { label: "Medium", color: "#f59e0b" };
  return { label: "Weak", color: "#f97316" };
};

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  const validate = () => {
    const errs = {};
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => navigate("/login"), 3000);
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
      errors[field] ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
    }`;

  const strength = passwordStrength(form.password);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
      <ToastContainer />
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {done ? (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Password reset!</h2>
            <p className="text-gray-600 text-sm mb-4">
              Your password has been updated. Redirecting to login in 3 seconds…
            </p>
            <Link to="/login" className="text-blue-600 hover:underline text-sm font-medium">
              Go to login now →
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-blue-700 mb-1">Set new password</h2>
            <p className="text-gray-500 text-sm mb-6">Choose a strong password for your account.</p>
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label className="block mb-1 font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className={inputClass("password")}
                />
                {strength && (
                  <p style={{ color: strength.color, fontSize: 13, marginTop: 4 }}>
                    Strength: <strong>{strength.label}</strong>
                  </p>
                )}
                {errors.password && (
                  <p style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{errors.password}</p>
                )}
              </div>
              <div className="mb-6">
                <label className="block mb-1 font-medium text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className={inputClass("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{errors.confirmPassword}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
              >
                {loading ? "Saving…" : "Reset password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
