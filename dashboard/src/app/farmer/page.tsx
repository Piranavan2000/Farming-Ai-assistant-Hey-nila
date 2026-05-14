'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mic, MicOff, Volume2, Check, ChevronRight } from 'lucide-react';
import styles from './farmer.module.css';

export default function FarmerPortal() {
  const router = useRouter();
  const [sensorData, setSensorData] = useState<any>(null);
  const [mlResult, setMlResult] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionDone, setActionDone] = useState<Record<string, boolean>>({});

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [nilaAnswer, setNilaAnswer] = useState('');
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

  const recognitionRef = useRef<any>(null);
  const micLockedRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const watchdogRef = useRef<any>(null);
  const isWaitingRef = useRef(false);
  const ttsTimeoutRef = useRef<any>(null);

  const FALLBACK_DATA = {
    nitrogen: 23, phosphorus: 99, potassium: 92,
    pH: 6.2, temperature: 24.4, humidity: 31.6,
    conductivity: 296, distance: 180
  };

  // ── Fetch sensor data ──────────────────────────────────────────────────────
  useEffect(() => {
    const safeFetch = async (url: string, opts?: RequestInit) => {
      try {
        const res = await fetch(url, opts);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return null;
        return await res.json();
      } catch { return null; }
    };

    const fetchData = async () => {
      // Fetch live sensor data
      const sensorJson = await safeFetch(`http://localhost:5000/api/thingspeak/live?_t=${Date.now()}`);
      if (sensorJson?.success && sensorJson.data?.latest) {
        setSensorData(sensorJson.data.latest);
      } else {
        setSensorData(FALLBACK_DATA);
      }

      // Fetch ML prediction
      const avgJson = await safeFetch(`http://localhost:5000/api/thingspeak/live/average?_t=${Date.now()}`);
      if (avgJson?.success && avgJson.data) {
        const mlJson = await safeFetch('http://localhost:5000/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenMinAverage: avgJson.data, tankHeight: 300, radius: 50 })
        });
        if (mlJson?.success) setMlResult(mlJson.data?.fertilizer || 'Optimal');
        else setMlResult('Optimal');
      } else {
        setMlResult('Optimal');
      }

      setLoading(false);
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── TTS helpers ────────────────────────────────────────────────────────────
  const sanitizeForTTS = (text: string): string =>
    text
      .replace(/mg\/kg/gi, 'milligrams per kilogram')
      .replace(/µS\/cm/gi, 'micro siemens per centimeter')
      .replace(/°C/g, 'degrees Celsius')
      .replace(/%/g, ' percent')
      .replace(/\bpH\b/g, 'P H')
      .replace(/\bppm\b/gi, 'parts per million')
      .replace(/N-P-K/gi, 'N P K');

  const getFemaleVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v =>
      v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') ||
      v.name.includes('Google UK English Female') || v.name.includes('Google US English')
    ) || null;
  };

  const speak = (text: string, onDone?: () => void) => {
    window.speechSynthesis.cancel();
    const clean = sanitizeForTTS(text);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'en-US';
    u.rate = 0.9;
    const v = getFemaleVoice();
    if (v) u.voice = v;
    isSpeakingRef.current = true;

    const done = () => {
      if (!isSpeakingRef.current) return;
      isSpeakingRef.current = false;
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      micLockedRef.current = false;
      onDone?.();
    };

    u.onend = done;
    u.onerror = done;
    const wordCount = clean.split(' ').length;
    ttsTimeoutRef.current = setTimeout(done, Math.max(4000, (wordCount / 2.5) * 1000 + 3000));
    window.speechSynthesis.speak(u);
  };

  // ── Handle voice question ──────────────────────────────────────────────────
  const handleQuestion = useCallback(async (text: string) => {
    setVoiceState('thinking');
    setVoiceText(text);
    setNilaAnswer('');

    const formData = new FormData();
    formData.append('textQuery', text);
    formData.append('role', 'farmer');

    try {
      const response = await fetch('http://localhost:5000/api/voice/ask', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setNilaAnswer(data.data.answer);
        setVoiceState('speaking');
        speak(data.data.answer, () => {
          setVoiceState('idle');
        });
      } else {
        setNilaAnswer('Sorry, try again.');
        setVoiceState('idle');
      }
    } catch {
      setNilaAnswer('Cannot connect to server.');
      setVoiceState('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Voice recognition engine ───────────────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();

    const WAKE_WORDS = [
      'hey nila','hay nila','hey neela','hi nila','he nila','hai nila','nila',
      'ey nila','a nila','hey leela','hey lila','hello nila','vanilla','hey nela',
      'enila','inila','anila','hey mela','he nela','hey nella'
    ];

    const tryStart = () => {
      if (isSpeakingRef.current || micLockedRef.current) return;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (_) {}
      }

      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-IN';
      recognitionRef.current = rec;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        micLockedRef.current = false;
        setIsListening(false);
      };

      rec.onerror = () => {
        micLockedRef.current = false;
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[event.resultIndex][0].transcript.toLowerCase().trim();

        let ww = '';
        for (const w of WAKE_WORDS) {
          if (transcript.includes(w)) { ww = w; break; }
        }

        if (ww) {
          const question = transcript.split(ww).pop()?.trim() || '';
          if (question.length > 2) {
            isWaitingRef.current = false;
            handleQuestion(question);
          } else {
            isWaitingRef.current = true;
            setVoiceState('listening');
            setVoiceText('');
            setNilaAnswer('');
            speak('Yes?', () => {});
          }
          return;
        }

        if (isWaitingRef.current && transcript.length > 2) {
          isWaitingRef.current = false;
          handleQuestion(transcript);
        }
      };

      micLockedRef.current = true;
      try { rec.start(); } catch (e) { micLockedRef.current = false; }
    };

    watchdogRef.current = setInterval(() => {
      if (!isSpeakingRef.current && !micLockedRef.current) {
        tryStart();
      }
    }, 1500);

    tryStart();

    return () => {
      clearInterval(watchdogRef.current);
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (_) {}
    };
  }, [handleQuestion]);

  // ── Circular progress component ────────────────────────────────────────────
  const CircleGauge = ({ value, max, label, unit, color }: {
    value: number; max: number; label: string; unit: string; color: string;
  }) => {
    const pct = Math.min(100, (value / max) * 100);
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;
    const level = pct < 30 ? 'LOW' : pct < 70 ? 'OK' : 'HIGH';
    const levelColor = pct < 30 ? '#ef4444' : pct < 70 ? '#22c55e' : '#f59e0b';

    return (
      <div className={styles.gaugeCard}>
        <svg viewBox="0 0 120 120" className={styles.gaugeSvg}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
          <text x="60" y="52" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800">
            {Math.round(value)}
          </text>
          <text x="60" y="70" textAnchor="middle" fill={levelColor} fontSize="13" fontWeight="700">
            {level}
          </text>
        </svg>
        <p className={styles.gaugeLabel}>{label}</p>
        <p className={styles.gaugeUnit}>{unit}</p>
      </div>
    );
  };

  // ── Prescription card ──────────────────────────────────────────────────────
  const getPrescription = () => {
    if (!sensorData) return null;
    const n = sensorData.nitrogen || 0;
    const p = sensorData.phosphorus || 0;
    const k = sensorData.potassium || 0;

    if (mlResult === 'Optimal') {
      return { action: 'NO FERTILIZER NEEDED', detail: 'All nutrients are in good range. Keep monitoring.', color: '#22c55e' };
    }
    if (n < 20) return { action: 'APPLY 12KG UREA NOW', detail: `Nitrogen is low (${n} mg/kg). Your paddy needs nitrogen fertilizer.`, color: '#FF6600' };
    if (p < 50) return { action: 'APPLY DAP FERTILIZER', detail: `Phosphorus is low (${p} mg/kg). Apply DAP for better root growth.`, color: '#FF6600' };
    if (k < 50) return { action: 'APPLY MOP FERTILIZER', detail: `Potassium is low (${k} mg/kg). Apply MOP for stronger stems.`, color: '#FF6600' };
    return { action: 'SOIL IS HEALTHY', detail: 'No action needed today. Keep watering on schedule.', color: '#22c55e' };
  };

  const prescription = getPrescription();

  if (loading) {
    return (
      <div className={styles.farmerPage}>
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading your farm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.farmerPage}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.headerTitle}>
          JAFFNA AGRI-SENSE <span className={styles.farmerBadge}>FARMER</span>
        </h1>
        <div className={styles.micIndicator}>
          {isListening ? <Mic size={20} className={styles.micActive} /> : <MicOff size={20} />}
        </div>
      </header>

      {/* Voice Status Bar */}
      {voiceState !== 'idle' && (
        <div className={styles.voiceBar}>
          <div className={styles.voiceOrb} data-state={voiceState} />
          <div className={styles.voiceInfo}>
            {voiceState === 'listening' && <p className={styles.voiceStatus}>🎤 Listening... speak now</p>}
            {voiceState === 'thinking' && <p className={styles.voiceStatus}>🤔 Thinking...</p>}
            {voiceState === 'speaking' && <p className={styles.voiceStatus}>🔊 Speaking...</p>}
            {voiceText && <p className={styles.voiceQuery}>&quot;{voiceText}&quot;</p>}
            {nilaAnswer && <p className={styles.voiceAnswer}>{nilaAnswer}</p>}
          </div>
        </div>
      )}

      {/* Prescription Card */}
      {prescription && (
        <div className={styles.prescriptionCard} style={{ borderColor: prescription.color }}>
          <div className={styles.prescriptionIcon}>🌿</div>
          <p className={styles.prescriptionLabel}>SOIL PRESCRIPTION</p>
          <h2 className={styles.prescriptionAction} style={{ color: prescription.color }}>
            ACTION: {prescription.action}
          </h2>
          <p className={styles.prescriptionDetail}>{prescription.detail}</p>
          <p className={styles.prescriptionMeta}>
            Plot: PLOT #08 - VALIKAMAM · Last Inspected: Just Now
          </p>
          {prescription.color === '#FF6600' && !actionDone['fertilizer'] && (
            <button
              className={styles.markDoneBtn}
              onClick={() => {
                setActionDone(prev => ({ ...prev, fertilizer: true }));
                speak('Great! Marked as done. I will remind you tomorrow.');
              }}
            >
              <Check size={20} /> MARK AS DONE
            </button>
          )}
          {actionDone['fertilizer'] && (
            <p className={styles.doneText}>✅ Done! Will remind tomorrow.</p>
          )}
        </div>
      )}

      {/* Nutrient Gauges */}
      <div className={styles.gaugesSection}>
        <h3 className={styles.sectionTitle}>YOUR SOIL STATUS</h3>
        <div className={styles.gaugesGrid}>
          <CircleGauge value={sensorData?.nitrogen || 0} max={60} label="NITROGEN" unit="mg/kg" color="#3B82F6" />
          <CircleGauge value={sensorData?.phosphorus || 0} max={150} label="PHOSPHORUS" unit="mg/kg" color="#10B981" />
          <CircleGauge value={sensorData?.potassium || 0} max={150} label="POTASSIUM" unit="mg/kg" color="#8B5CF6" />
        </div>
      </div>

      {/* Today's Prediction */}
      <div className={styles.predictionSection}>
        <h3 className={styles.sectionTitle}>TODAY&apos;S PREDICTION</h3>
        <div className={styles.predictionCard}>
          <div className={styles.predictionRow}>
            <span className={styles.predictionEmoji}>🤖</span>
            <div>
              <p className={styles.predictionLabel}>ML Model Says</p>
              <p className={styles.predictionValue} style={{ color: mlResult === 'Optimal' ? '#22c55e' : '#FF6600' }}>
                {mlResult || 'Optimal'}
              </p>
            </div>
          </div>
          <div className={styles.predictionDivider} />
          <div className={styles.predictionRow}>
            <span className={styles.predictionEmoji}>📊</span>
            <div>
              <p className={styles.predictionLabel}>Nutrient Balance</p>
              <p className={styles.predictionValue} style={{ color: '#38bdf8' }}>
                N:{sensorData?.nitrogen || 0} · P:{sensorData?.phosphorus || 0} · K:{sensorData?.potassium || 0}
              </p>
            </div>
          </div>
          <div className={styles.predictionDivider} />
          <div className={styles.predictionRow}>
            <span className={styles.predictionEmoji}>🌤️</span>
            <div>
              <p className={styles.predictionLabel}>Farm Conditions</p>
              <p className={styles.predictionValue} style={{ color: '#fbbf24' }}>
                {(sensorData?.temperature || 0) > 30 ? '🔥 Hot' : '✅ Good'} · {(sensorData?.humidity || 0) < 40 ? '💨 Dry' : '💧 Moist'} · pH {sensorData?.pH || '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className={styles.quickCards}>
        <div className={styles.quickCard}>
          <span className={styles.quickEmoji}>🌡️</span>
          <div>
            <p className={styles.quickLabel}>Temperature</p>
            <p className={styles.quickValue}>{sensorData?.temperature || '--'} °C</p>
          </div>
          <ChevronRight size={20} className={styles.quickArrow} />
        </div>
        <div className={styles.quickCard}>
          <span className={styles.quickEmoji}>💧</span>
          <div>
            <p className={styles.quickLabel}>Humidity</p>
            <p className={styles.quickValue}>{sensorData?.humidity || '--'} %</p>
          </div>
          <ChevronRight size={20} className={styles.quickArrow} />
        </div>
        <div className={styles.quickCard}>
          <span className={styles.quickEmoji}>⚗️</span>
          <div>
            <p className={styles.quickLabel}>pH Level</p>
            <p className={styles.quickValue}>{sensorData?.pH || '--'}</p>
          </div>
          <ChevronRight size={20} className={styles.quickArrow} />
        </div>
      </div>

      {/* Nila Voice Button */}
    </div>
  );
}
