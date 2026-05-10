import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp, confirmSignUp } from "aws-amplify/auth";

export default function Register() {
  const navigate = useNavigate();
  const [step,     setStep]     = useState("form"); // "form" | "verify"
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [phone,    setPhone]    = useState("");
  const [code,     setCode]     = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
            phone_number: phone || undefined,
            "custom:role": "citizen",   // Default role; admin assigns GP staff
          },
        },
      });
      setStep("verify");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      navigate("/login");
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🌿</span>
          <h1 className="font-display text-3xl font-bold text-forest-900 mt-3">SwachhGram</h1>
          <p className="text-gray-500 mt-1 text-sm">Join the clean village initiative</p>
        </div>

        <div className="card shadow-lg">
          {step === "form" ? (
            <>
              <h2 className="text-xl font-display font-bold text-gray-800 mb-6">Create your account</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="label">Full name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="input" placeholder="Ramesh Kumar" required />
                </div>
                <div>
                  <label className="label">Email address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="input" placeholder="you@example.com" required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="input" placeholder="Minimum 8 characters" minLength={8} required />
                </div>
                <div>
                  <label className="label">Phone number <span className="text-gray-400 font-normal">(optional, for SMS alerts)</span></label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="input" placeholder="+91XXXXXXXXXX" />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-display font-bold text-gray-800 mb-2">Verify your email</h2>
              <p className="text-sm text-gray-500 mb-6">We sent a 6-digit code to <strong>{email}</strong></p>
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="label">Verification code</label>
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                    className="input text-center text-xl tracking-widest font-mono" maxLength={6}
                    placeholder="000000" required />
                </div>
                {error && (
                  <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
                )}
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "Verifying…" : "Verify & Login"}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-forest-700 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
