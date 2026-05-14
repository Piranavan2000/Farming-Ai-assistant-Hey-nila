'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X } from 'lucide-react';
import styles from './VoiceAssistant.module.css';

export default function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [answer, setAnswer] = useState('');
  const [nilaState, setNilaState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

  const isWaitingForCommandRef = useRef(false);
  const autoCloseTimerRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const watchdogRef = useRef<any>(null);
  const ttsTimeoutRef = useRef<any>(null);
  // This flag prevents watchdog from thrashing: true from start() call until onend/onerror
  const micLockedRef = useRef(false);

  // ── TTS helpers ────────────────────────────────────────────────────────────
  const sanitizeForTTS = (text: string): string =>
    text
      .replace(/mg\/kg/gi, 'milligrams per kilogram')
      .replace(/mg\/l/gi, 'milligrams per liter')
      .replace(/µS\/cm/gi, 'micro siemens per centimeter')
      .replace(/°C/g, 'degrees Celsius')
      .replace(/°F/g, 'degrees Fahrenheit')
      .replace(/%/g, ' percent')
      .replace(/\bpH\b/g, 'P H')
      .replace(/\bppm\b/gi, 'parts per million')
      .replace(/N-P-K/gi, 'N P K');

  const getFemaleVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v =>
      v.name.includes('Female') || v.name.includes('Zira') ||
      v.name.includes('Samantha') || v.name.includes('Victoria') ||
      v.name.includes('Karen') || v.name.includes('Google UK English Female') ||
      v.name.includes('Google US English')
    ) || null;
  };

  // ── Handle question ────────────────────────────────────────────────────────
  const handleQuestion = useCallback(async (text: string) => {
    setIsProcessing(true);
    setNilaState('thinking');
    setTranscribedText(text);
    setAnswer('');

    const formData = new FormData();
    formData.append('textQuery', text);
    formData.append('role', 'technician');

    try {
      const response = await fetch('http://localhost:5000/api/voice/ask', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setTranscribedText(data.data.question);
        setAnswer(data.data.answer);
        setIsProcessing(false);
        setNilaState('speaking');

        window.speechSynthesis.cancel();
        const cleanText = sanitizeForTTS(data.data.answer);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        const voice = getFemaleVoice();
        if (voice) utterance.voice = voice;

        isSpeakingRef.current = true;

        const wordCount = cleanText.split(' ').length;
        const estimatedMs = Math.max(4000, (wordCount / 2.5) * 1000 + 3000);

        const finishSpeaking = () => {
          if (!isSpeakingRef.current) return;
          if (ttsTimeoutRef.current) { clearTimeout(ttsTimeoutRef.current); ttsTimeoutRef.current = null; }
          isSpeakingRef.current = false;
          micLockedRef.current = false; // CRITICAL: force-unlock so watchdog can restart mic
          console.log('[Nila] ✅ Done speaking, unlocking mic, auto-closing in 2s');
          autoCloseTimerRef.current = setTimeout(() => {
            setIsOpen(false);
            setTranscribedText('');
            setAnswer('');
            setNilaState('idle');
            setIsRecording(false);
            micLockedRef.current = false; // Double-ensure unlock after auto-close
          }, 2000);
        };

        utterance.onend = finishSpeaking;
        utterance.onerror = finishSpeaking;
        ttsTimeoutRef.current = setTimeout(finishSpeaking, estimatedMs);

        window.speechSynthesis.speak(utterance);
      } else {
        setAnswer('Sorry, please try again.');
        setIsProcessing(false);
        setNilaState('idle');
      }
    } catch {
      setAnswer('Error connecting to server.');
      setIsProcessing(false);
      setNilaState('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recognition engine ─────────────────────────────────────────────────────
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

    // ── Try to start recognition (called by watchdog) ────────────────────────
    const tryStart = () => {
      // Don't start if TTS is playing or mic is already locked
      if (isSpeakingRef.current || micLockedRef.current) return;

      // Kill previous instance completely
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
        setIsListeningForWakeWord(true);
        console.log('[Nila] 🎙 Mic is live');
      };

      rec.onend = () => {
        micLockedRef.current = false;
        setIsListeningForWakeWord(false);
        console.log('[Nila] 🔇 Mic died — watchdog will revive');
      };

      rec.onerror = (e: any) => {
        console.log('[Nila] ⚠️ Mic error:', e.error);
        micLockedRef.current = false;
        setIsListeningForWakeWord(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[event.resultIndex][0].transcript
          .toLowerCase().trim();
        console.log('[Nila] 👂 Heard:', transcript);

        let ww = '';
        for (const w of WAKE_WORDS) {
          if (transcript.includes(w)) { ww = w; break; }
        }

        if (ww) {
          // Cancel any pending auto-close
          if (autoCloseTimerRef.current) {
            clearTimeout(autoCloseTimerRef.current);
            autoCloseTimerRef.current = null;
          }

          const question = transcript.split(ww).pop()?.trim() || '';

          if (question.length > 2) {
            // Wake word + question in one breath
            isWaitingForCommandRef.current = false;
            setIsRecording(false);
            setIsOpen(true);
            handleQuestion(question);
          } else {
            // Just wake word — open UI and wait for question
            window.speechSynthesis.cancel();
            isSpeakingRef.current = false;
            setIsOpen(true);
            setTranscribedText('');
            setAnswer('');
            setIsProcessing(false);
            isWaitingForCommandRef.current = true;
            setIsRecording(true);
            setNilaState('listening');

            setTimeout(() => {
              const u = new SpeechSynthesisUtterance('Yes?');
              u.lang = 'en-US';
              const v = getFemaleVoice();
              if (v) u.voice = v;
              isSpeakingRef.current = true;
              u.onend = () => { isSpeakingRef.current = false; };
              u.onerror = () => { isSpeakingRef.current = false; };
              setTimeout(() => { isSpeakingRef.current = false; }, 2000); // hard fallback
              window.speechSynthesis.speak(u);
            }, 100);
          }
          return;
        }

        // Waiting for command after wake word
        if (isWaitingForCommandRef.current && transcript.length > 2) {
          isWaitingForCommandRef.current = false;
          setIsRecording(false);
          handleQuestion(transcript);
        }
      };

      // Lock BEFORE calling start() — prevents watchdog from double-firing
      micLockedRef.current = true;
      try {
        rec.start();
        console.log('[Nila] 🚀 start() called');
      } catch (e) {
        console.log('[Nila] ❌ start() failed:', e);
        micLockedRef.current = false; // Unlock so watchdog can retry
      }
    };

    // ── Watchdog: checks every 1.5s if mic needs restarting ──────────────────
    watchdogRef.current = setInterval(() => {
      if (isSpeakingRef.current) return;   // Don't fight TTS
      if (micLockedRef.current) return;    // Already started or starting

      console.log('[Nila] 🐕 Watchdog: mic is dead, restarting...');
      tryStart();
    }, 1500);

    // Initial boot
    tryStart();

    // First-click fallback for browser autoplay policy
    const handleClick = () => {
      if (!micLockedRef.current && !isSpeakingRef.current) tryStart();
      window.removeEventListener('click', handleClick);
    };
    window.addEventListener('click', handleClick);

    return () => {
      clearInterval(watchdogRef.current);
      window.removeEventListener('click', handleClick);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, [handleQuestion]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const getOrbClass = () => {
    if (nilaState === 'listening') return `${styles.siriOrb} ${styles.orbListening}`;
    if (nilaState === 'thinking') return `${styles.siriOrb} ${styles.orbThinking}`;
    if (nilaState === 'speaking') return `${styles.siriOrb} ${styles.orbSpeaking}`;
    return styles.siriOrb;
  };

  if (!isOpen) {
    return (
      <div className={styles.fabContainer}>
        {isListeningForWakeWord && (
          <div className={styles.listeningIndicator} title="Listening for 'Hey Nila'" />
        )}
        <button className={styles.fabBtn} onClick={() => setIsOpen(true)} title="Open Nila AI">
          <Bot size={28} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.assistantCard}>
      <button className={styles.closeBtn} onClick={() => {
        setIsOpen(false);
        setTranscribedText('');
        setAnswer('');
        setNilaState('idle');
        window.speechSynthesis.cancel();
        isSpeakingRef.current = false;
        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      }}>
        <X size={18} />
      </button>

      <div className={getOrbClass()} />

      {nilaState === 'idle' && !transcribedText && <p className={styles.siriHint}>Say &quot;Hey Nila&quot;</p>}
      {nilaState === 'listening' && <p className={styles.siriStatus}>Listening...</p>}
      {nilaState === 'thinking' && <p className={styles.siriStatus}>Thinking...</p>}

      {transcribedText && <p className={styles.siriQuery}>&quot;{transcribedText}&quot;</p>}
      {answer && !isProcessing && (
        <div className={styles.siriAnswer}>
          {answer.split('\n').map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}
    </div>
  );
}
