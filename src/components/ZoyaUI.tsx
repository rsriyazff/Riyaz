import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Power, Globe, Sparkles, Volume2, Radio, Camera, CameraOff, X, ZoomIn, ZoomOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Clapperboard, Play, Download, Loader2, Key, Sun, Moon, Heart, Zap, Monitor, MonitorOff, ShieldAlert, ExternalLink, SwitchCamera, Share2, Info, FileText, Shield, Brain, Image } from 'lucide-react';
import { AudioStreamer } from '../lib/audio-streamer';
import { LiveSession, SessionState } from '../lib/live-session';
import { geminiService } from '../lib/gemini-service';

const MOODS = [
  { id: 'happy', label: 'Happy', icon: Sun, color: 'text-yellow-400' },
  { id: 'dark', label: 'Dark', icon: Moon, color: 'text-indigo-400' },
  { id: 'emotional', label: 'Emotional', icon: Heart, color: 'text-rose-400' },
  { id: 'energetic', label: 'Energetic', icon: Zap, color: 'text-zoya-cyan' }
];

export default function ZoyaUI() {
  const [state, setState] = useState<SessionState>('disconnected');
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [failedPermissionType, setFailedPermissionType] = useState<'camera' | 'screen' | 'mic' | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showPreview, setShowPreview] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>(() => localStorage.getItem('ZOYA_USER_API_KEY') || '');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempKey, setTempKey] = useState('');
  
  const [pointer, setPointer] = useState<{ x: number, y: number, label?: string } | null>(null);
  const [interaction, setInteraction] = useState<{ action: string, x: number, y: number, text?: string } | null>(null);
  const pointerTimeoutRef = useRef<any>(null);
  const interactionTimeoutRef = useRef<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveApiKey = (key: string) => {
    localStorage.setItem('ZOYA_USER_API_KEY', key);
    setUserApiKey(key);
    setIsKeyModalOpen(false);
    setConnectionError(null);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomBg(url);
    }
  };
  const [isScreenShared, setIsScreenShared] = useState(false);
  
  // Video Generation States
  const [isDirectorMode, setIsDirectorMode] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [selectedMood, setSelectedMood] = useState('energetic');
  const [isMuted, setIsMuted] = useState(false);

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bars, setBars] = useState<number[]>(new Array(20).fill(10));
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const [isSyncAlertOpen, setIsSyncAlertOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Initialize AudioStreamer
  useEffect(() => {
    audioStreamerRef.current = new AudioStreamer((base64Data) => {
      if (liveSessionRef.current) {
        liveSessionRef.current.sendAudio(base64Data);
      }
    });

    return () => {
      audioStreamerRef.current?.stopRecording();
      liveSessionRef.current?.disconnect();
      stopCamera();
      stopScreenSync();
    };
  }, []);

  const startCamera = async (mode = facingMode) => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: { ideal: mode }
        } 
      });
      cameraStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsCameraOn(true);
      setIsSidebarOpen(true);
      setShowPreview(true);
      setConnectionError(null);
    } catch (err: any) {
      console.error("Failed to start camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setConnectionError("Listen Yaar, Zoya needs camera access to see you! Please click the 'Lock' icon in your browser address bar and set Camera to 'Allow'.");
        setFailedPermissionType('camera');
        setIsSyncAlertOpen(true); 
      } else {
        setConnectionError(`Arre! Zoya couldn't wake up your camera (${err.name}). Check your connection or hardware.`);
      }
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (isCameraOn) {
      startCamera(newMode);
    }
  };

  const takeScreenshot = () => {
    const video = isScreenShared ? screenVideoRef.current : videoRef.current;
    if (!video || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = 1920;
    canvas.height = 1080;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Zoya_Screenshot_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Screenshot failed:", err);
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  // Ensure camera stream is attached to video element whenever it's rendered
  useEffect(() => {
    if (isCameraOn && videoRef.current && cameraStreamRef.current) {
      if (videoRef.current.srcObject !== cameraStreamRef.current) {
        videoRef.current.srcObject = cameraStreamRef.current;
      }
    }
  }, [isCameraOn, isSidebarOpen, facingMode]);

  // Ensure screen stream is attached to video element whenever it's rendered
  useEffect(() => {
    if (isScreenShared && screenVideoRef.current && screenStreamRef.current) {
      if (screenVideoRef.current.srcObject !== screenStreamRef.current) {
        screenVideoRef.current.srcObject = screenStreamRef.current;
      }
    }
  }, [isScreenShared, isSidebarOpen]);

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const startScreenSync = async () => {
    // Attempt to start screen share directly first
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isSecure = window.isSecureContext;

      // Check if API is available at all
      if (!navigator.mediaDevices?.getDisplayMedia) {
        if (!isSecure) {
          throw new Error("INSECURE_CONTEXT");
        }
        if (isMobile) {
          throw new Error("MOBILE_UNSUPPORTED");
        }
        throw new Error("API_MISSING");
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { cursor: "always" } as any,
        audio: false 
      });
      
      screenStreamRef.current = stream;
      setIsScreenShared(true);
      setIsSidebarOpen(true);
      setFailedPermissionType(null);

      stream.getVideoTracks()[0].onended = () => {
        stopScreenSync();
      };

      // Notify Zoya persona about visual sync
      if (isPowerOn) {
        console.log("Visual Sync Established.");
      }
    } catch (err: any) {
      const isIframe = window.self !== window.top;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isExpectedError = ["API_MISSING", "MOBILE_UNSUPPORTED", "INSECURE_CONTEXT", "NotAllowedError", "SecurityError"].includes(err.message) || ["NotAllowedError", "SecurityError"].includes(err.name);

      if (!isExpectedError) {
        console.error("Failed to start screen sync:", err);
      }
      
      if (err.message === "MOBILE_UNSUPPORTED" || (err.message === "API_MISSING" && isMobile)) {
        console.warn("Screen Sharing is not supported on mobile devices.");
        return;
      }

      if (err.message === "INSECURE_CONTEXT") {
        console.warn("Screen Sync requires an HTTPS connection.");
        return;
      }

      // If it failed because of browser policy (iframe) or missing API
      if (isIframe || err.message === "API_MISSING" || err.name === "NotAllowedError" || err.name === "SecurityError") {
        setFailedPermissionType('screen');
        setIsSyncAlertOpen(true);
      }
    }
  };

  const stopScreenSync = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    setIsScreenShared(false);
  };

  // Video frame capture loop
  useEffect(() => {
    let interval: any;
    if (isPowerOn && liveSessionRef.current && (isCameraOn || isScreenShared)) {
      interval = setInterval(() => {
        const sourceVideo = isScreenShared ? screenVideoRef.current : videoRef.current;
        
        if (sourceVideo && canvasRef.current && sourceVideo.srcObject) {
          const canvas = canvasRef.current;
          const video = sourceVideo;
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = 320; // Lower resolution for API
            canvas.height = 240;
            
            context.save();
            if (!isScreenShared) {
              // Apply zoom and pan only to camera, not screen share
              context.translate(canvas.width / 2, canvas.height / 2);
              context.scale(zoom, zoom);
              context.translate((pan.x / 100) * canvas.width, (pan.y / 100) * canvas.height);
              context.translate(-canvas.width / 2, -canvas.height / 2);
            }
            
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            context.restore();
            
            const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
            liveSessionRef.current?.sendVideo(base64Data);
          }
        }
      }, 1000); // 1 frame per second
    }
    return () => clearInterval(interval);
  }, [isCameraOn, isScreenShared, isPowerOn]);

  // Check for API key on mount and show welcome
  useEffect(() => {
    const checkKey = async () => {
      const win = window as any;
      if (win.aistudio?.hasSelectedApiKey) {
        try {
          const hasKey = await win.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } catch (e) {
          console.error("Error checking API key:", e);
        }
      }
    };
    checkKey();
  }, []);

  const handleReconnect = () => {
    if (isPowerOn) {
      handleTogglePower(); // Turn off
      setTimeout(() => handleTogglePower(), 500); // Turn back on
    }
  };

  const handleSelectKey = async () => {
    const win = window as any;
    if (win.aistudio?.openSelectKey) {
      await win.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const generateCinematicMoment = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsGeneratingVideo(true);
    setGenerationProgress("Capturing current scene...");
    
    try {
      // Capture high-res frame for video generation
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      if (!context) throw new Error("Could not get canvas context");
      
      canvas.width = 1920;
      canvas.height = 1080;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
      
      setGenerationProgress("Identifying cinematic potential...");
      const description = await geminiService.describeImage(base64Data, "image/jpeg");
      
      setGenerationProgress("Directing AI camera crew...");
      // Constructing the prompt based on user instructions and selected mood
      const videoPrompt = `
        Create a masterpiece cinematic video from the given image.
        Scene description: ${description}
        Visuals: Ultra-high definition, 4K aesthetics, sharp details, rich textures, and professional grade color grading.
        Motion: Add sophisticated, natural motion. Include realistic movements like a slow cinematic push-in/pull-out, gentle handheld camera breathing, and fluid subject movement.
        Camera: 35mm film aesthetic, shallow depth of field where appropriate, smooth parallax, and dynamic perspective.
        Lighting: Cinematic lighting with soft highlights, deep shadows, and atmospheric glow matching the mood.
        Style: Photo-realistic cinematic masterpiece
        Mood: ${selectedMood}
        Duration: 6 seconds
        Extra constraints: Professional quality, zero artifacts, consistent physics, and flawless frame-to-frame coherence.
      `;

      let operation = await geminiService.generateCinematicVideo({ data: base64Data, mimeType: "image/jpeg" }, videoPrompt);
      
      setGenerationProgress("Rendering cinematic vision...");
      
      // Polling
      while (!operation.done) {
        await new Promise(r => setTimeout(r, 5000));
        operation = await geminiService.getOperationStatus(operation);
        if (operation.error) throw new Error(String(operation.error.message || "Unknown generation error"));
      }
      
      setGenerationProgress("Finalizing visuals...");
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("No video URI returned");
      
      const blob = await geminiService.fetchVideoBlob(downloadLink);
      const url = URL.createObjectURL(blob);
      setGeneratedVideoUrl(url);
      setGenerationProgress("");
    } catch (error: any) {
      console.error("Video generation failed:", error);
      setGenerationProgress(`Error: ${error.message}`);
      setTimeout(() => setGenerationProgress(""), 5000);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const shareZoya = () => {
    navigator.clipboard.writeText(window.location.href);
    setConnectionError("Link for Zoya Copied Successfully! 😉");
    setTimeout(() => setConnectionError(null), 3000);
  };

  const handleTogglePower = async () => {
    if (isPowerOn) {
      // Turn off
      setIsPowerOn(false);
      setConnectionError(null);
      audioStreamerRef.current?.stopRecording();
      liveSessionRef.current?.disconnect();
      stopCamera();
      stopScreenSync();
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      // Turn on
      // Prefer user-provided key, then environment keys safely
      let apiKey = userApiKey || "";
      
      try {
        const envKey = (typeof process !== 'undefined' && process.env) ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : null;
        if (envKey && envKey !== 'MY_GEMINI_API_KEY' && envKey !== 'undefined') {
          apiKey = apiKey || envKey;
        }
        
        // Vite meta env check
        const metaKey = (import.meta as any).env?.VITE_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
        if (metaKey && metaKey !== 'MY_GEMINI_API_KEY' && metaKey !== 'undefined') {
          apiKey = apiKey || metaKey;
        }
      } catch (e) {
        console.warn("Env access failed:", e);
      }
      
      if (!apiKey || apiKey === '' || apiKey === 'undefined' || apiKey.length < 5) {
        const win = window as any;
        if (win.aistudio?.openSelectKey) {
          setConnectionError("Authorization Required. Opening API Key Selector...");
          await win.aistudio.openSelectKey();
          // After returning from dialog, check again
          const hasKey = await win.aistudio.hasSelectedApiKey?.();
          if (hasKey) {
            setHasApiKey(true);
            setConnectionError("Key Verified. Please click wake button again to start.");
          }
          return;
        }
        
        // If we're here, it means we're likely in a shared app/Chrome and the key wasn't baked in.
        setConnectionError("System Warning: No API Key found. For shared apps, please add GEMINI_API_KEY to your AI Studio Secrets before sharing.");
        setIsPowerOn(false);
        return;
      }

      setIsPowerOn(true);
      setConnectionError(null);
      
      liveSessionRef.current = new LiveSession(
        apiKey,
        (audioChunk) => {
          audioStreamerRef.current?.playAudioChunk(audioChunk);
        },
        (newState) => {
          setState(newState);
        },
        () => {
          audioStreamerRef.current?.stopPlayback();
        },
        () => {
          // No-op: visual insights removed
        },
        (enabled) => {
          if (enabled) startCamera();
          else stopCamera();
        },
        (enabled) => {
          setIsMuted(enabled);
          if (enabled) audioStreamerRef.current?.stopRecording();
          else {
            audioStreamerRef.current?.startRecording().then(success => {
              if (!success) {
                setIsMuted(true);
              }
            });
          }
        },
        () => {
          toggleCamera();
        },
        () => {
          takeScreenshot();
        },
        () => {
          handleTogglePower();
        },
        (enabled) => {
          if (enabled) {
            if (!isScreenShared) startScreenSync();
          } else {
            if (isScreenShared) stopScreenSync();
          }
        },
        (error) => {
          let errMsg = error;
          if (errMsg.toLowerCase().includes("quota exceeded")) {
            errMsg = "Gemini API Quota Exceeded. Please try again later.";
          }
          setConnectionError(errMsg);
          if (state === 'connecting') {
            setIsPowerOn(false);
          }
        },
        (x, y, label) => {
          setPointer({ x, y, label });
          if (pointerTimeoutRef.current) clearTimeout(pointerTimeoutRef.current);
          pointerTimeoutRef.current = setTimeout(() => setPointer(null), 5000);
        },
        (action, x, y, text) => {
          setInteraction({ action, x, y, text });
          setPointer({ x, y }); // Move pointer to interaction point
          if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
          interactionTimeoutRef.current = setTimeout(() => setInteraction(null), 2000);
          if (pointerTimeoutRef.current) clearTimeout(pointerTimeoutRef.current);
          pointerTimeoutRef.current = setTimeout(() => setPointer(null), 3000);
        }
      );

      try {
        // Request microphone permission immediately on user action
        const micEnabled = await audioStreamerRef.current?.startRecording();
        
        // Connect to Gemini Live Session
        await liveSessionRef.current.connect();
      } catch (err: any) {
        console.error("Critical Connection Error:", err);
        let errMsg = err.message || "Failed to establish link.";
        
        if (errMsg.toLowerCase().includes("quota exceeded")) {
          errMsg = "Gemini API Quota Exceeded. Please try again later.";
        }
        
        setConnectionError(errMsg);
        setIsPowerOn(false); // Turn off so user can retry correctly
        setState('disconnected');
      }
    }
  };

  // Simulate waveform bars based on state
  useEffect(() => {
    let interval: any;
    if (state === 'speaking' || state === 'listening') {
      interval = setInterval(() => {
        setBars(prev => prev.map(() => Math.random() * (state === 'speaking' ? 60 : 30) + 10));
      }, 100);
    } else {
      setBars(new Array(20).fill(4));
    }
    return () => clearInterval(interval);
  }, [state]);

  const stateColors = {
    disconnected: 'text-gray-500',
    connecting: 'text-yellow-400',
    connected: 'text-zoya-cyan',
    listening: 'text-zoya-cyan',
    speaking: 'text-zoya-pink',
  };

  const stateLabels = {
    disconnected: 'Offline',
    connecting: 'Waking up...',
    connected: 'Ready for you',
    listening: 'I\'m listening...',
    speaking: 'Zoya is talking',
  };

  return (
    <div className="relative h-screen w-full flex flex-col items-stretch justify-between bg-zoya-dark overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleBgUpload} 
        accept="image/*" 
        className="hidden" 
      />
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zoya-purple/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zoya-cyan/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Full-Screen Background Character Avatar */}
      <AnimatePresence>
        {isPowerOn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
          >
            {/* Background Image Container */}
            <motion.div
              animate={{ 
                scale: state === 'speaking' ? [1, 1.02, 1] : 1,
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="relative w-full h-full"
            >
              <img 
                src={customBg || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=2000&auto=format&fit=crop"} 
                alt="Zoya Background"
                className="w-full h-full object-cover object-center opacity-40 transition-opacity duration-1000"
                referrerPolicy="no-referrer"
              />
              
              {/* Dynamic Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-zoya-dark via-zoya-dark/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-zoya-dark/60 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-zoya-dark/20 mix-blend-overlay" />

              {/* Animated Particles/Glitch Effect when speaking */}
              <AnimatePresence>
                {state === 'speaking' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,242,255,0.1)_0%,transparent_70%)]"
                  />
                )}
              </AnimatePresence>
            </motion.div>

            {/* Ambient Lighting Glows */}
            <motion.div 
              animate={{ 
                opacity: state === 'speaking' ? [0.3, 0.5, 0.3] : [0.1, 0.2, 0.1],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute top-1/4 left-1/4 w-[60%] h-[60%] bg-zoya-cyan/10 blur-[150px] rounded-full"
            />
            <motion.div 
              animate={{ 
                opacity: state === 'speaking' ? [0.2, 0.4, 0.2] : [0.1, 0.15, 0.1],
              }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              className="absolute bottom-1/4 right-1/4 w-[50%] h-[50%] bg-zoya-pink/5 blur-[150px] rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>




      {/* API Key Modal */}
      <AnimatePresence>
        {isKeyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md glass-panel p-8 border-white/10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zoya-cyan/20 rounded-lg">
                    <Key className="w-5 h-5 text-zoya-cyan" />
                  </div>
                  <h3 className="text-xl font-medium">Gemini API Key</h3>
                </div>
                <button onClick={() => setIsKeyModalOpen(false)} className="opacity-40 hover:opacity-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-400 mb-6">
                Enter your <span className="text-zoya-cyan">Google AI Studio</span> API key to enable Zoya outside of the preview environment.
              </p>
              
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="Paste API key here..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-zoya-cyan outline-none transition-colors mb-6"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => saveApiKey(tempKey)}
                  className="flex-1 py-3 bg-zoya-cyan text-black font-bold rounded-xl hover:bg-white transition-colors"
                >
                  Save Key
                </button>
                {userApiKey && (
                  <button
                    onClick={() => {
                      saveApiKey('');
                      setTempKey('');
                    }}
                    className="flex-1 py-3 bg-red-500/20 text-red-400 font-bold rounded-xl hover:bg-red-500/40 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              <p className="mt-6 text-[10px] text-center text-gray-500 uppercase tracking-widest leading-relaxed">
                Keys are stored locally in your browser only.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-between p-8 relative">
        {/* Header */}
        <div className="z-10 w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && isCameraOn && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg glass-panel hover:bg-white/5 text-zoya-cyan transition-colors mr-2"
                title="Expand Visual Monitor"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            <div className={`flex flex-col sm:flex-row sm:items-center gap-2 max-w-[50vw] sm:max-w-none`}>
              <div className="flex items-center gap-2 group relative">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  connectionError ? 'bg-red-500' : 
                  (isPowerOn ? (state === 'connecting' ? 'bg-yellow-400' : (state === 'disconnected' ? 'bg-gray-500' : 'bg-zoya-cyan')) : 'bg-gray-600')
                }`} />
                <span className={`text-[10px] font-mono tracking-widest uppercase transition-colors whitespace-nowrap ${connectionError ? 'text-red-400 cursor-pointer' : 'opacity-60'}`}>
                  {connectionError ? 'System Halt' : (isPowerOn ? stateLabels[state] : 'Deep Sleep')}
                </span>
                {connectionError?.includes("denied") && (
                  <>
                    <Info className="w-3 h-3 text-red-500 cursor-help" />
                    <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-black/90 border border-white/20 rounded-xl backdrop-blur-xl opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity z-50 pointer-events-none">
                      <p className="text-[9px] text-white/80 font-sans normal-case leading-relaxed">
                        <strong className="text-zoya-cyan block mb-1">How to fix permissions:</strong>
                        1. Tap the **Lock icon** in your browser address bar.<br/>
                        2. Go to **"Site settings"** or **"Permissions"**.<br/>
                        3. Set **Camera** and **Microphone** to **Allow**.<br/>
                        4. Refresh page and click Reconnect.
                      </p>
                    </div>
                  </>
                )}
              </div>
              {connectionError && (
                <span className="text-[9px] font-mono text-red-400/70 uppercase leading-tight sm:border-l sm:border-white/10 sm:pl-2 line-clamp-2">
                  {connectionError}
                </span>
              )}
              {!connectionError && (
                <span className="text-[10px] font-mono tracking-widest uppercase opacity-40 hidden sm:inline">
                  : {stateLabels[state]}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="p-2 rounded-lg glass-panel hover:bg-white/5 text-white/40 hover:text-zoya-cyan transition-all"
              title="Intelligence Manifest"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={shareZoya}
              className="px-3 py-1.5 rounded-lg glass-panel hover:bg-white/5 text-white/40 hover:text-white transition-all flex items-center gap-2"
              title="Share Zoya Link"
            >
              <Share2 className="w-3 h-3" />
              <span className="text-[9px] font-bold tracking-widest uppercase">Share</span>
            </button>
            {state === 'disconnected' && isPowerOn && (
              <button 
                onClick={handleReconnect}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Reconnect</span>
              </button>
            )}
            {isPowerOn && (
              <button 
                onClick={() => setIsDirectorMode(!isDirectorMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border transition-all ${isDirectorMode ? 'border-zoya-cyan text-zoya-cyan' : 'border-white/10 text-white/40 hover:text-white'}`}
              >
                <Clapperboard className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Director Mode</span>
              </button>
            )}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  setTempKey(userApiKey);
                  setIsKeyModalOpen(true);
                }}
                className={`p-2 rounded-xl glass-panel border-white/5 hover:bg-white/10 transition-colors ${userApiKey ? 'text-zoya-cyan' : 'opacity-60'}`}
                title="API Settings"
              >
                <Key className="w-4 h-4" />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl glass-panel border-white/5 hover:bg-white/10 transition-colors"
                title="Change Background"
              >
                <Image className="w-4 h-4 opacity-60" />
              </button>
              <Globe className="w-4 h-4 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" />
            </div>
          </div>
        </div>

        {/* Main Interaction Area */}
        <div className="z-10 flex flex-col items-center justify-center flex-1 w-full gap-12">
          {/* Visualizer / Video Preview */}
          <div className="relative flex items-center justify-center w-full min-h-[300px]">
            <AnimatePresence mode="wait">
              {isDirectorMode && generatedVideoUrl ? (
                <motion.div
                  key="video"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="relative group max-w-4xl w-full aspect-video rounded-3xl overflow-hidden glass-panel border border-zoya-cyan/30 shadow-[0_0_50px_rgba(0,242,255,0.15)] bg-black"
                >
                  <video 
                    src={generatedVideoUrl} 
                    autoPlay 
                    loop 
                    controls 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <a 
                      href={generatedVideoUrl} 
                      download="zoya-cinematic.mp4"
                      className="p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 hover:border-zoya-cyan text-white hover:text-zoya-cyan transition-all"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                    <button 
                      onClick={() => setGeneratedVideoUrl(null)}
                      className="p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 hover:border-zoya-pink text-white hover:text-zoya-pink transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ) : isGeneratingVideo ? (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-zoya-cyan/20 blur-3xl rounded-full animate-pulse" />
                    <Loader2 className="w-20 h-20 text-zoya-cyan animate-spin relative z-10" />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-mono uppercase tracking-[0.3em] text-zoya-cyan animate-pulse">Rendering Reality</h2>
                    <p className="text-xs font-mono text-white/40 italic">{generationProgress}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="visualizer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-end justify-center gap-1 h-32 w-full"
                >
                  {bars.map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 4 }}
                      animate={{ height }}
                      className={`w-1.5 rounded-full ${state === 'speaking' ? 'bg-zoya-pink' : 'bg-zoya-cyan'} opacity-80`}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Central Button or Action Button */}
          <div className="relative group">

            
            {isDirectorMode ? (
              <div className="flex flex-col items-center gap-8">
                {!hasApiKey ? (
                  <button
                    onClick={handleSelectKey}
                    className="flex items-center gap-3 px-8 py-4 rounded-full bg-zoya-cyan text-black font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(0,242,255,0.4)]"
                  >
                    <Key className="w-5 h-5" />
                    Connect Studio Key
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-8">
                    {/* Mood Selector */}
                    <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl backdrop-blur-md border border-white/10">
                      {MOODS.map((mood) => {
                        const Icon = mood.icon;
                        const isSelected = selectedMood === mood.id;
                        return (
                          <button
                            key={mood.id}
                            onClick={() => setSelectedMood(mood.id)}
                            className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all relative ${
                              isSelected 
                                ? 'bg-white/10 text-white shadow-xl' 
                                : 'text-white/40 hover:text-white/60'
                            }`}
                          >
                            {isSelected && (
                              <motion.div 
                                layoutId="mood-bg" 
                                className="absolute inset-0 bg-white/5 rounded-xl -z-10" 
                              />
                            )}
                            <Icon className={`w-5 h-5 ${isSelected ? mood.color : ''}`} />
                            <span className="text-[9px] uppercase tracking-wider font-bold">{mood.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {!navigator.mediaDevices?.getDisplayMedia && window.self !== window.top && (
                      <button
                        onClick={openInNewTab}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zoya-cyan/10 text-zoya-cyan border border-zoya-cyan/20 hover:bg-zoya-cyan/20 transition-all text-[10px] uppercase tracking-widest font-black"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Launch Studio in New Tab
                      </button>
                    )}

                    <button
                      onClick={generateCinematicMoment}
                      disabled={isGeneratingVideo}
                      className={`group relative flex items-center gap-3 px-10 py-5 rounded-full bg-white text-black font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl overflow-hidden ${isGeneratingVideo ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-zoya-cyan via-zoya-pink to-zoya-purple opacity-0 group-hover:opacity-20 transition-opacity" />
                      {isGeneratingVideo ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 fill-current" />}
                      Capture Cinematic Moment
                    </button>
                  </div>
                )}
                
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
                  {hasApiKey ? "Veo-3.1 Lite Cinema Engine Ready" : "Paid API Key Required for Video Generation"}
                </p>
              </div>
            ) : (
              <div className="relative">
                {!isPowerOn && !connectionError && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-zoya-cyan blur-2xl rounded-full"
                  />
                )}
                <button
                  onClick={handleTogglePower}
                  className={`relative z-20 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 glass-panel
                    ${isPowerOn ? 'border-zoya-cyan shadow-[0_0_30px_rgba(0,242,255,0.3)]' : 'border-white/10 hover:border-white/30'}
                    hover:scale-105 active:scale-95 group`}
                >
                  {isPowerOn ? (
                    <div className="flex flex-col items-center gap-1">
                      {state === 'speaking' ? (
                        <Volume2 className="w-10 h-10 text-zoya-pink animate-pulse" />
                      ) : (
                        <Radio className="w-10 h-10 text-zoya-cyan animate-pulse" />
                      )}
                    </div>
                  ) : (
                    <Power className={`w-10 h-10 transition-all duration-300 ${connectionError ? 'text-red-500' : 'text-white/20 group-hover:text-zoya-cyan group-hover:opacity-100'}`} />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Personality Tagline */}
          {!isGeneratingVideo && !generatedVideoUrl && (
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                {isDirectorMode ? "STUDIO ZOYA" : "ZOYA"}
              </h1>
              <p className="text-sm font-mono text-white/40 max-w-[200px] mx-auto italic">
                {isDirectorMode 
                  ? "Lights, camera, and try not to look boring." 
                  : '"Don\'t just stand there, say something smart."'}
              </p>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="z-10 w-full flex justify-center gap-6 pb-4">
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={() => isCameraOn ? stopCamera() : startCamera()}
              className={`p-4 rounded-full glass-panel transition-colors ${isCameraOn ? 'text-zoya-cyan border-zoya-cyan/40' : 'text-white/20'}`}
            >
              {isCameraOn ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
            </button>
            <span className="text-[10px] uppercase tracking-widest opacity-40">Camera</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={toggleCamera}
              className={`p-4 rounded-full glass-panel transition-colors ${isCameraOn ? 'text-white/60 border-white/20' : 'text-white/20 pointer-events-none opacity-40'}`}
              disabled={!isCameraOn}
            >
              <SwitchCamera className="w-6 h-6" />
            </button>
            <span className="text-[10px] uppercase tracking-widest opacity-40">Flip</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button 
              id="shareBtn"
              onClick={() => isScreenShared ? stopScreenSync() : startScreenSync()}
              className={`p-4 rounded-full glass-panel transition-colors ${isScreenShared ? 'text-zoya-cyan border-zoya-cyan/40' : 'text-white/20 hover:text-white/40'}`}
            >
              {isScreenShared ? <Monitor className="w-6 h-6" /> : <MonitorOff className="w-6 h-6" />}
            </button>
            <span className="text-[10px] uppercase tracking-widest opacity-40">Visual Sync</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={async () => {
                const newMute = !isMuted;
                setIsMuted(newMute);
                if (newMute) audioStreamerRef.current?.stopRecording();
                else {
                  const success = await audioStreamerRef.current?.startRecording();
                  if (!success) {
                    setIsMuted(true);
                    setFailedPermissionType('mic');
                    setIsSyncAlertOpen(true);
                  }
                }
              }}
              className={`p-4 rounded-full glass-panel transition-colors ${state === 'listening' && !isMuted ? 'text-zoya-cyan border-zoya-cyan/40 shadow-[0_0_20px_rgba(0,255,255,0.2)]' : 'text-white/20'}`}
            >
              <Mic className={`w-6 h-6 transition-transform ${isMuted ? 'scale-0 opacity-0 absolute' : 'scale-100 opacity-100'}`} />
              <MicOff className={`w-6 h-6 transition-transform ${!isMuted ? 'scale-0 opacity-0 absolute' : 'scale-100 opacity-100 text-rose-500'}`} />
            </button>
            <span className="text-[10px] uppercase tracking-widest opacity-40">{isMuted ? 'Muted' : 'Mic'}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={takeScreenshot}
              className="p-4 rounded-full glass-panel text-white/20 hover:text-white/40 transition-colors"
            >
              <Download className="w-6 h-6" />
            </button>
            <span className="text-[10px] uppercase tracking-widest opacity-40">Snap</span>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Camera Feed (Moved from Left Sidebar) */}
      <AnimatePresence>
        {(isCameraOn || isScreenShared) && isSidebarOpen && (
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            className="z-30 w-full h-auto glass-panel border-t border-white/5 flex flex-col sm:flex-row p-4 gap-4 relative overflow-hidden"
          >
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex flex-col gap-2 min-w-[120px]">
                <div className="flex items-center gap-2">
                  {isScreenShared ? (
                    <Monitor className="w-4 h-4 text-zoya-cyan" />
                  ) : (
                    <Camera className="w-4 h-4 text-zoya-cyan" />
                  )}
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-60">
                    {isScreenShared ? 'Visual Sync' : 'Visual Input'}
                  </span>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-fit px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[9px] uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                >
                  Hide Monitor
                </button>
              </div>

              <div className="relative w-full max-w-[280px] aspect-video rounded-xl overflow-hidden border border-zoya-cyan/20 shadow-2xl group bg-black/40">
                <div className="w-full h-full overflow-hidden relative">
                  <video
                    ref={screenVideoRef}
                    id="zoyaScreen"
                    autoPlay
                    playsInline
                    className={`w-full h-full object-contain transition-transform duration-200 ${isScreenShared ? 'block' : 'hidden'}`}
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x}%, ${pan.y}%)`,
                    }}
                  />
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover grayscale brightness-125 contrast-125 transition-transform duration-200 ${!isScreenShared ? 'block' : 'hidden'}`}
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x}%, ${pan.y}%) ${facingMode === 'user' ? 'scaleX(-1)' : ''}`,
                    }}
                  />
                  
                  {/* Virtual Interaction Overlay */}
                  <AnimatePresence>
                    {pointer && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="absolute z-40 pointer-events-none"
                        style={{
                          left: `${pointer.x / 10}%`,
                          top: `${pointer.y / 10}%`,
                          marginTop: '-8px',
                          marginLeft: '-8px',
                        }}
                      >
                        <div className="relative">
                          <div className="w-4 h-4 bg-zoya-cyan rounded-full shadow-[0_0_10px_rgba(0,255,255,0.8)] border-2 border-white" />
                          <motion.div
                            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="absolute inset-0 w-4 h-4 bg-zoya-cyan rounded-full"
                          />
                          {pointer.label && (
                            <div className="absolute top-6 left-0 px-2 py-1 bg-black/80 rounded-md border border-zoya-cyan/40 whitespace-nowrap">
                              <span className="text-[8px] font-mono text-zoya-cyan uppercase tracking-tighter">
                                {pointer.label}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {interaction && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 3, 4] }}
                        exit={{ opacity: 0 }}
                        className="absolute z-50 pointer-events-none"
                        style={{
                          left: `${interaction.x / 10}%`,
                          top: `${interaction.y / 10}%`,
                          marginTop: '-24px',
                          marginLeft: '-24px',
                        }}
                      >
                        <div className="w-12 h-12 rounded-full border-2 border-zoya-cyan/60 flex items-center justify-center">
                          <div className="w-2 h-2 bg-zoya-cyan rounded-full" />
                          <span className="absolute -top-6 text-[8px] bg-zoya-cyan text-black px-1 font-bold rounded">
                            {interaction.action.toUpperCase()}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 bg-zoya-cyan/5 pointer-events-none" />
                
                {/* Camera Controls Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="grid grid-cols-3 gap-1 p-2 bg-black/60 rounded-xl backdrop-blur-sm pointer-events-auto">
                    <div />
                    <button onClick={() => setPan(p => ({ ...p, y: p.y + 10 }))} className="p-1 hover:text-zoya-cyan transition-colors"><ChevronUp className="w-4 h-4" /></button>
                    <div />
                    
                    <button onClick={() => setPan(p => ({ ...p, x: p.x + 10 }))} className="p-1 hover:text-zoya-cyan transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1 hover:text-zoya-cyan transition-colors"><RefreshCw className="w-4 h-4" /></button>
                    <button onClick={() => setPan(p => ({ ...p, x: p.x - 10 }))} className="p-1 hover:text-zoya-cyan transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    
                    <button onClick={() => setZoom(z => Math.max(1, z - 0.2))} className="p-1 hover:text-zoya-cyan transition-colors"><ZoomOut className="w-4 h-4" /></button>
                    <button onClick={() => setPan(p => ({ ...p, y: p.y - 10 }))} className="p-1 hover:text-zoya-cyan transition-colors"><ChevronDown className="w-4 h-4" /></button>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1 hover:text-zoya-cyan transition-colors"><ZoomIn className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex flex-col gap-2 max-w-[200px]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Live Feed Active</span>
                </div>
                <p className="text-[9px] text-white/20 leading-relaxed font-mono italic">
                  Systems OK. Processing visual frames.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Sidebar: Visual Insights - REMOVED */}

      {/* Sync Alert Modal */}
      <AnimatePresence>
        {isSyncAlertOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl text-white">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-[32px] max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-zoya-cyan/20 blur-[80px]" />
              
              <div className="relative z-10 flex flex-col items-center text-center gap-6">
                <div className="w-20 h-20 rounded-full bg-zoya-cyan/10 flex items-center justify-center border border-zoya-cyan/20">
                  <ShieldAlert className="w-10 h-10 text-zoya-cyan" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight text-white">
                    {failedPermissionType === 'camera' ? "Camera Access Blocked" : 
                     failedPermissionType === 'mic' ? "Microphone Restricted" :
                     /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "Mobile Sync Restricted" : "System Access Blocked"}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {failedPermissionType === 'camera' 
                      ? "\"Arre listen! Zoya is blind without your camera. Please click the Lock icon in browser bar and Allow Camera.\""
                      : failedPermissionType === 'mic'
                      ? "\"Listen Yaar, I can't hear you! Please check your microphone permissions and make sure you hit Allow.\""
                      : /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) 
                        ? "\"Mobile devices don't allow deep screen sharing. Use my Camera Mode to show me your screen instead!\""
                        : "\"Chrome requires a direct connection for deep system sync. Step out of the preview frame to initiate Visual Sync.\""}
                  </p>
                </div>

                <div className="flex flex-col w-full gap-3">
                  <button
                    onClick={() => {
                      openInNewTab();
                      setIsSyncAlertOpen(false);
                    }}
                    className="w-full py-4 rounded-2xl bg-zoya-cyan text-black font-black uppercase tracking-widest text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Launch in New Tab
                  </button>
                  <button
                    onClick={() => {
                      setIsSyncAlertOpen(false);
                      setFailedPermissionType(null);
                    }}
                    className="w-full py-4 rounded-2xl bg-white/5 text-white/40 font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all underline decoration-white/10"
                  >
                    I'll stay here for now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zoya Intelligence Manifest Modal */}
      <AnimatePresence>
        {isInfoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40"
            onClick={() => setIsInfoModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative max-w-2xl w-full glass-panel border border-white/20 rounded-[2rem] p-8 md:p-12 shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 p-8">
                <button 
                  onClick={() => setIsInfoModalOpen(false)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-zoya-cyan">
                    <Sparkles className="w-8 h-8" />
                    <h2 className="text-3xl font-mono uppercase tracking-[0.4em]">Zoya Manifest</h2>
                  </div>
                  <p className="text-sm font-mono text-white/40 leading-relaxed uppercase tracking-widest">
                    Version 3.1-Beta // Neural Assistant & Cinematic Director
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-white">
                      <Brain className="w-5 h-5 opacity-50" />
                      <h3 className="text-sm font-bold uppercase tracking-widest">Capabilities</h3>
                    </div>
                    <ul className="space-y-4">
                      {[
                        { title: "Multimodal Perception", desc: "Native voice, vision, and screen context awareness." },
                        { title: "Live Scene Analysis", desc: "Real-time perception of your environment and workspace." },
                        { title: "Director Suite", desc: "Cinematic moments powered by neuro-visual synthesis." }
                      ].map((item, i) => (
                        <li key={i} className="space-y-1">
                          <h4 className="text-xs font-mono text-zoya-cyan uppercase">{item.title}</h4>
                          <p className="text-[10px] text-white/40 leading-relaxed">{item.desc}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-white">
                        <Monitor className="w-5 h-5 opacity-50" />
                        <h3 className="text-sm font-bold uppercase tracking-widest">Core Engines</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <p className="text-[10px] font-mono text-white/60 mb-1">REAL-TIME PERCEPTION</p>
                          <p className="text-xs font-bold text-zoya-cyan tracking-wider uppercase text-nowrap">Gemini 3.1 Flash</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <p className="text-[10px] font-mono text-white/60 mb-1">VISUAL SYNTHESIS</p>
                          <p className="text-xs font-bold text-zoya-pink tracking-wider uppercase text-nowrap">Veo 3.1 Cinema</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-white">
                        <Shield className="w-5 h-5 opacity-50" />
                        <h3 className="text-sm font-bold uppercase tracking-widest">Privacy Protocol</h3>
                      </div>
                      <p className="text-[10px] text-white/40 leading-relaxed font-sans italic">
                        All visual and auditory data is processed for direct agent interaction. Assets are stored only when capturing Cinematic Moments. Zoya adheres to Google AI Studio regulatory standards for developer experimentation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">
                      Developed by Mr. Riyaz // 2026
                    </p>
                  </div>
                  <div className="flex gap-4">
                     <Globe className="w-4 h-4 text-white/20" />
                     <ShieldAlert className="w-4 h-4 text-white/20" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanline Effect */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%] z-50 opacity-20" />
    </div>
  );
}
