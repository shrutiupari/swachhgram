import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const STEPS = ["Upload Photo", "Location", "Submit"];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-2 ${i <= current ? "text-forest-700" : "text-gray-400"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              i < current  ? "bg-forest-600 border-forest-600 text-white" :
              i === current ? "bg-white border-forest-600 text-forest-700" :
                              "bg-white border-gray-200 text-gray-400"
            }`}>{i < current ? "✓" : i + 1}</div>
            <span className="text-xs font-semibold hidden sm:block">{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 rounded ${i < current ? "bg-forest-500" : "bg-gray-200"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ReportGarbage() {
  const navigate  = useNavigate();
  const fileRef   = useRef();
  const [step,         setStep]         = useState(0);
  const [file,         setFile]         = useState(null);
  const [preview,      setPreview]      = useState(null);
  const [uploadedKey,  setUploadedKey]  = useState(null);
  const [uploadedUrl,  setUploadedUrl]  = useState(null);
  const [aiResult,     setAiResult]     = useState(null);
  const [analyzing,    setAnalyzing]    = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [location,     setLocation]     = useState({ lat: null, lng: null, address: "", ward: "", village: "" });
  const [gpsLoading,   setGpsLoading]   = useState(false);
  const [description,  setDescription]  = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");

  // ── Step 0: Photo selection + upload + AI ────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please select an image file."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setUploadedKey(null);
    setUploadedUrl(null);
    setAiResult(null);
    setError("");
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const uploaded = await api.uploadLocalImage(file);
      setUploadedKey(uploaded.key);
      setUploadedUrl(uploaded.url);
      setAnalyzing(true);

      const result = await api.analyzeImage(uploaded.key);
      setAiResult(result);
      setStep(1);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  // ── Step 1: GPS location ─────────────────────────────────────────────────
  const getGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation((l) => ({ ...l, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setGpsLoading(false);
      },
      () => { setError("Unable to get location. Please enter manually."); setGpsLoading(false); }
    );
  };

  // ── Step 2: Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!uploadedKey) { setError("No photo uploaded."); return; }
    setSubmitting(true); setError("");
    try {
      await api.createReport({
        photoKey:    uploadedKey,
        photoUrl:    uploadedUrl,
        description,
        address:     location.address,
        latitude:    location.lat,
        longitude:   location.lng,
        ward:        location.ward,
        village:     location.village,
        severity:    aiResult?.severity || "MEDIUM",
        isGarbage:   aiResult?.isGarbage ?? true,
        aiConfidence:aiResult?.confidence || 0,
        aiLabels:    aiResult?.detectedLabels || [],
      });
      navigate("/my-reports");
    } catch (err) {
      setError(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const severityColor = {
    HIGH:   "bg-red-50 border-red-200 text-red-800",
    MEDIUM: "bg-yellow-50 border-yellow-200 text-yellow-800",
    LOW:    "bg-green-50 border-green-200 text-green-800",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">Report Garbage 📸</h1>
      <StepIndicator current={step} />

      {/* ── Step 0: Photo ── */}
      {step === 0 && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-gray-700">Upload a photo of the garbage</h2>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
              preview ? "border-forest-300 bg-forest-50" : "border-gray-200 hover:border-forest-300 hover:bg-gray-50"
            }`}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-56 mx-auto rounded-xl object-contain" />
            ) : (
              <>
                <p className="text-4xl mb-3">📷</p>
                <p className="text-gray-600 font-semibold">Click to select a photo</p>
                <p className="text-gray-400 text-sm mt-1">JPG, PNG, WebP supported</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-100">{error}</p>}

          <button
            onClick={handleUploadAndAnalyze}
            disabled={!file || uploading || analyzing}
            className="btn-primary w-full"
          >
            {uploading ? "Uploading…" : analyzing ? "🤖 AI is analyzing…" : "Upload & Analyze"}
          </button>
        </div>
      )}

      {/* ── Step 1: Location + AI result ── */}
      {step === 1 && (
        <div className="card space-y-5">
          {/* AI result banner */}
          {aiResult && (
            <div className={`border rounded-xl p-4 ${aiResult.isGarbage ? severityColor[aiResult.severity] : "bg-gray-50 border-gray-200 text-gray-700"}`}>
              <p className="font-semibold text-sm">
                {aiResult.isGarbage
                  ? `🤖 AI detected garbage — ${aiResult.severity} severity (${aiResult.confidence}% confidence)`
                  : "🤖 AI could not detect clear garbage — please describe below"}
              </p>
              {aiResult.detectedLabels?.length > 0 && (
                <p className="text-xs mt-1 opacity-80">
                  Detected: {aiResult.detectedLabels.map((l) => l.name).join(", ")}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <label className="label">Address / Landmark</label>
              <input
                type="text"
                value={location.address}
                onChange={(e) => setLocation((l) => ({ ...l, address: e.target.value }))}
                className="input"
                placeholder="e.g. Near temple, Main Road, Belagavi"
              />
            </div>
            <button onClick={getGPS} disabled={gpsLoading} className="btn-secondary mt-6 whitespace-nowrap">
              {gpsLoading ? "…" : "📍 GPS"}
            </button>
          </div>

          {location.lat && (
            <p className="text-xs text-forest-700 bg-forest-50 px-3 py-2 rounded-lg">
              📍 Location captured: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Ward (optional)</label>
              <input type="text" value={location.ward}
                onChange={(e) => setLocation((l) => ({ ...l, ward: e.target.value }))}
                className="input" placeholder="Ward no." />
            </div>
            <div>
              <label className="label">Village / Town</label>
              <input type="text" value={location.village}
                onChange={(e) => setLocation((l) => ({ ...l, village: e.target.value }))}
                className="input" placeholder="Village name" />
            </div>
          </div>

          <div>
            <label className="label">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Any additional details about the garbage…"
            />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-100">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="btn-secondary">← Back</button>
            <button onClick={() => setStep(2)} className="btn-primary flex-1">Review & Submit →</button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === 2 && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-gray-700">Review your report</h2>

          {preview && (
            <img src={preview} alt="Preview" className="w-full max-h-52 object-cover rounded-xl" />
          )}

          <div className="space-y-2 text-sm">
            <Row label="Location"   value={location.address || "Not specified"} />
            <Row label="Village"    value={location.village || "—"} />
            <Row label="Ward"       value={location.ward    || "—"} />
            <Row label="GPS"        value={location.lat ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Not captured"} />
            <Row label="AI Result"  value={aiResult?.isGarbage ? `Garbage detected (${aiResult.severity}, ${aiResult.confidence}%)` : "Not detected"} />
            {description && <Row label="Description" value={description} />}
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-100">{error}</p>}

          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-yellow-800">
            ⚠️ Gram Panchayat will be notified immediately after submission.
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Submitting…" : "🚀 Submit Report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50">
      <span className="text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}
