import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Power, Globe, Sparkles, Volume2, Radio, Camera, CameraOff, X, ZoomIn, ZoomOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Clapperboard, Play, Download, Loader2, Key, Sun, Moon, Heart, Zap, Monitor, MonitorOff, ShieldAlert, ExternalLink, SwitchCamera, Share2, Info, FileText, Shield, Brain, Image, Maximize2, Code2, ShieldCheck, Mail, Calendar, FileBox, LogOut, Smartphone } from 'lucide-react';
import { AudioStreamer } from '../lib/audio-streamer';
import { LiveSession, SessionState } from '../lib/live-session';
import { geminiService } from '../lib/gemini-service';
import { initAuth, googleSignIn, logout } from '../lib/auth';
import { User } from 'firebase/auth';

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
  const [isMobileBuildGuideOpen, setIsMobileBuildGuideOpen] = useState(false);
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

  // New Video Generation Custom States
  const [videoPromptText, setVideoPromptText] = useState<string>("");
  const [videoSourceType, setVideoSourceType] = useState<'text' | 'camera' | 'upload'>('text');
  const [videoUploadBase64, setVideoUploadBase64] = useState<string | null>(null);
  const [videoUploadMime, setVideoUploadMime] = useState<string | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bars, setBars] = useState<number[]>(new Array(20).fill(10));
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const [isSyncAlertOpen, setIsSyncAlertOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Authentication State
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Initialize Auth
    const unsubscribeAuth = initAuth(
      (user, token) => {
        setAuthUser(user);
        setAuthToken(token);
        setNeedsAuth(false);
      },
      () => {
        setAuthUser(null);
        setAuthToken(null);
        setNeedsAuth(true);
      }
    );

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setAuthToken(result.accessToken);
        setAuthUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuthUser(null);
    setAuthToken(null);
    setNeedsAuth(true);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setIsInstallModalOpen(false);
    } else {
      // Logic for iOS or regular browser
      setIsInstallModalOpen(true);
    }
  };

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
        console.log("Screen Share Established.");
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
    setIsGeneratingVideo(true);
    setGenerationProgress("Starting Cinema Engine...");
    
    try {
      let imagePart: { data: string; mimeType: string } | null = null;
      let finalPrompt = videoPromptText.trim();

      if (videoSourceType === 'camera') {
        if (!videoRef.current || !canvasRef.current || !isCameraOn) {
          throw new Error("Your camera must be turned on to capture a scene. Otherwise, please upload an image or select 'Pure Text' mode.");
        }
        setGenerationProgress("Capturing current scene from camera...");
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Could not get canvas context for snapshot");
        
        canvas.width = 1280;
        canvas.height = 720;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Data = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        imagePart = { data: base64Data, mimeType: "image/jpeg" };
      } else if (videoSourceType === 'upload') {
        if (!videoUploadBase64) {
          throw new Error("Please upload an image first, or choose 'Pure Text' mode to generate immediately.");
        }
        imagePart = { data: videoUploadBase64, mimeType: videoUploadMime || "image/jpeg" };
      }

      // If user provided no prompt but has an image, let's describe it dynamically so they don't get stuck!
      if (!finalPrompt && imagePart) {
        setGenerationProgress("Analyzing seed image composition...");
        const description = await geminiService.describeImage(imagePart.data, imagePart.mimeType);
        finalPrompt = `Create a cinematic masterpiece based on this scene description: ${description}. Ultra high quality, smooth fluid motion, professional 16:9 cinematic shot, slow zoom, perfect lighting.`;
      }

      if (!finalPrompt) {
        throw new Error("Please type a description of what you want to generate in the text prompt area.");
      }

      setGenerationProgress("Sending directions to Zoya Studio...");
      
      let operation = await geminiService.generateCinematicVideo(
        finalPrompt,
        imagePart,
        videoAspectRatio,
        videoResolution
      );
      
      const reassuringMessages = [
        "Connecting to Google Veo 3.1 Neural Engines...",
        "Analyzing prompt and sketching structural frames...",
        "Simulating light paths and volumetric shadows...",
        "Regulating temporal stability and realistic physics...",
        "Refining micro-details and texture enhancements...",
        "Synthesizing motion vectors and consistent frames...",
        "Up-scaling video streams and standardizing resolution...",
        "Combining cinematic rendering pipelines..."
      ];
      
      let progressIdx = 0;
      
      // Polling
      while (!operation.done) {
        setGenerationProgress(reassuringMessages[progressIdx % reassuringMessages.length]);
        progressIdx++;
        
        await new Promise(r => setTimeout(r, 6000));
        operation = await geminiService.getOperationStatus(operation);
        if (operation.error) {
          throw new Error(String(operation.error.message || "Unknown rendering error"));
        }
      }
      
      setGenerationProgress("Compiling and mastering final output stream...");
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Could not retrieve video download link from Veo.");
      
      const blob = await geminiService.fetchVideoBlob(downloadLink);
      const url = URL.createObjectURL(blob);
      setGeneratedVideoUrl(url);
      setGenerationProgress("");
    } catch (error: any) {
      console.error("Video generation failed:", error);
      setGenerationProgress(`Rendering Interrupted: ${error.message}`);
      setTimeout(() => setGenerationProgress(""), 7000);
    } finally {
      setIsGeneratingVideo(false);
    }
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

      {/* Mobile Build Guide Modal */}
      <AnimatePresence>
        {isMobileBuildGuideOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl glass-panel p-6 border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-zoya-cyan/20 rounded-xl">
                    <Smartphone className="w-5 h-5 text-zoya-cyan" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold uppercase tracking-wider text-white font-mono">Zoya AI APK Build Guide</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Mobile & PC Compile Options</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileBuildGuideOpen(false)} 
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notice */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl mb-6 text-[11px] leading-relaxed text-yellow-300/90 font-sans">
                ⚠️ <strong>Note:</strong> Safe sandbox security rules prevent compile tools like <code>gradle</code> from running inside this live preview container. Please follow the guides below to build your APK.
              </div>

              <div className="space-y-6">
                {/* Mobile section (No PC) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zoya-cyan font-bold text-xs uppercase tracking-wider font-mono">
                    <span>📱 OPTION 1: Android Mobile Se Build Karein (No PC/Laptop)</span>
                  </div>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4 text-xs text-white/70">
                    <div className="space-y-2">
                      <h4 className="font-bold text-white text-[13px] text-zoya-cyan/90">Step 1: Code Ko GitHub Par Export/Push Karein</h4>
                      <p className="leading-relaxed pl-4 border-l-2 border-zoya-cyan/20 font-sans">
                        Zoya UI ke top-right bar mein <strong>Settings (Gear icon)</strong> par click karein. Phir <strong>"Export to GitHub"</strong> ya push workflow use kar ke apne GitHub account se repository connect karein aur code upload kar dein.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-white text-[13px] text-zoya-cyan/90">Step 2: Auto-Build GitHub Run Shuru Hoga</h4>
                      <p className="leading-relaxed pl-4 border-l-2 border-zoya-cyan/20 font-sans">
                        Jaise hi code GitHub par push hoga, humara pre-configured <strong>GitHub Actions Workflow</strong> (jo humne aapke folder me `.github/workflows/android.yml` me set up kiya hai) automatic aapki secure APK build karna shuru kar dega. Apne mobile browser par GitHub repository ko open karke <strong>"Actions"</strong> tab mein check karein!
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-white text-[13px] text-zoya-cyan/90">Step 3: Direct APK Download Karein</h4>
                      <p className="leading-relaxed pl-4 border-l-2 border-zoya-cyan/20 font-sans">
                        Lagbhag 2-3 minute ke baad build complete hone par green checkmark aate hi <strong>Actions build</strong> par click karein. Sabse niche <strong>Artifacts</strong> section mein <strong>`zoya-ai-debug-apk`</strong> zip file milegi. Use download karke extract karein, uske andar aapko <strong>app-debug.apk</strong> mil jayega! Isko direct apne phone mein install kar lein.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PC/Laptop Option */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zoya-purple font-bold text-xs uppercase tracking-wider font-mono">
                    <span>💻 OPTION 2: PC / Laptop Se Build Karein</span>
                  </div>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4 text-xs text-white/70 font-sans">
                    <p className="leading-relaxed">
                      If you have access to a computer:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 leading-relaxed">
                      <li>Download the project files by clicking <strong>"Download ZIP"</strong> in AI Studio's top-right Settings menu.</li>
                      <li>Extract the downloaded folder on your computer.</li>
                      <li>Open the <strong>"android"</strong> directory in <strong>Android Studio</strong>.</li>
                      <li>Go to <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>.</li>
                      <li>Find your output file at: <code>android/app/build/outputs/apk/debug/app-debug.apk</code></li>
                    </ol>
                  </div>
                </div>

                {/* Termux Advanced */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zoya-pink font-bold text-xs uppercase tracking-wider font-mono">
                    <span>⚙️ OPTION 3: Advanced Mobile Build (Termux App)</span>
                  </div>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5 text-[11px] space-y-2 font-mono text-white/60 leading-relaxed">
                    <p>Aap Termux app play store se download karke directly apne phone console se compile kar sakte hain:</p>
                    <div className="p-3 bg-black/60 rounded-xl border border-white/5 text-zoya-pink">
                      pkg update && pkg upgrade -y<br/>
                      pkg install git openjdk-17 -y<br/>
                      termux-setup-storage<br/>
                      cd /sdcard/Download/[unzipped_folder]/android<br/>
                      chmod +x gradlew<br/>
                      ./gradlew assembleDebug
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-4 flex justify-end">
                <button
                  onClick={() => setIsMobileBuildGuideOpen(false)}
                  className="px-6 py-2.5 bg-zoya-cyan text-black font-bold rounded-xl hover:bg-white transition-colors uppercase tracking-wider text-[11px]"
                >
                  Samajh Gaya (Close)
                </button>
              </div>
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
            {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 rounded-lg bg-zoya-cyan/20 text-zoya-cyan border border-zoya-cyan/30 hover:bg-zoya-cyan/30 transition-all flex items-center gap-2"
                title="Direct App System"
              >
                {deferredPrompt ? <Sparkles className="w-3 h-3 animate-pulse" /> : <Monitor className="w-3 h-3" />}
                <span className="text-[9px] font-bold tracking-widest uppercase">
                  {deferredPrompt ? 'Install App' : 'Open App'}
                </span>
              </button>
            )}
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(console.error);
                } else {
                  document.exitFullscreen().catch(console.error);
                }
              }}
              className="p-2 rounded-lg glass-panel hover:bg-white/5 text-white/40 hover:text-white transition-all hidden sm:block"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMobileBuildGuideOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-zoya-cyan border border-zoya-cyan/30 hover:bg-zoya-cyan/10 transition-all flex items-center gap-2"
              title="APK Build Guide for Android Mobile"
            >
              <Smartphone className="w-3.5 h-3.5 text-zoya-cyan animate-pulse" />
              <span className="text-[9px] font-bold tracking-widest uppercase text-white">Get APK Guide</span>
            </button>
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="p-2 rounded-lg glass-panel hover:bg-white/5 text-white/40 hover:text-zoya-cyan transition-all"
              title="Intelligence Manifest"
            >
              <Info className="w-4 h-4" />
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
            <button 
              onClick={() => setIsDirectorMode(!isDirectorMode)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full glass-panel border transition-all ${isDirectorMode ? 'border-zoya-cyan text-zoya-cyan font-bold bg-zoya-cyan/5' : 'border-white/10 text-white/40 hover:text-white'}`}
              title="Toggle Cinema Studio"
            >
              <Clapperboard className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Cinema Mode</span>
            </button>
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
              <div className="w-full max-w-xl mx-auto flex flex-col items-stretch gap-5 bg-black/50 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl">
                {/* Cinema Mode Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="w-5 h-5 text-zoya-cyan animate-pulse" />
                    <div className="text-left">
                      <h3 className="text-xs font-bold tracking-[0.1em] text-white uppercase">Zoya Cinema Hub</h3>
                      <p className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Veo 3.1 Cinema Engine</p>
                    </div>
                  </div>
                  {/* Inline API Key Button */}
                  <button
                    onClick={() => {
                      setTempKey(userApiKey);
                      setIsKeyModalOpen(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-mono uppercase tracking-wider transition-all ${
                      hasApiKey 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/25' 
                        : 'bg-zoya-cyan text-black hover:bg-white font-black border-transparent shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse'
                    }`}
                  >
                    <Key className="w-3 h-3" />
                    {userApiKey ? "Manage Key" : "Add Compulsory Key"}
                  </button>
                </div>

                {/* API Key missing notification inside generator */}
                {!hasApiKey && (
                  <div className="bg-red-500/10 border border-red-500/10 rounded-2xl p-4 text-center space-y-3">
                    <p className="text-xs text-red-300/80 leading-relaxed font-sans">
                      A <span className="font-bold text-white">Google AI Studio API Key</span> is compulsory to generate high-resolution videos using Google Veo.
                    </p>
                    <button
                      onClick={() => {
                        setTempKey(userApiKey);
                        setIsKeyModalOpen(true);
                      }}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg border border-red-500/30 text-[10px] font-mono uppercase tracking-widest transition-all"
                    >
                      Enter API Key Now
                    </button>
                  </div>
                )}

                {hasApiKey && (
                  <div className="space-y-4 text-left">
                    {/* Prompt input */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block">Cinema Prompt Description</label>
                      <textarea
                        value={videoPromptText}
                        onChange={(e) => setVideoPromptText(e.target.value)}
                        placeholder="Describe your cinematic masterpiece... (e.g. A neon cyberpunk cat driving at high speed in interstellar space, 4k drone shot)"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-zoya-cyan outline-none transition-colors min-h-[70px] text-white resize-none"
                      />
                      
                      {/* Presets Grid */}
                      <div className="space-y-1.5">
                        <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Cinematic Suggestions:</span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { name: "Cyberpunk", text: "A futuristic glowing holographic cat driving a hyper-detailed motorbike in neon Tokyo streets, rain cinematic reflection, volumetric particles, 4k" },
                            { name: "Ocean Sunset", text: "Slow motion epic drone capture of massive ocean waves crushing against volcano cliffs at sunset, realistic physics, spray particles, atmospheric golden hour" },
                            { name: "Futuristic Space", text: "Massive spaceship hyperspeed travel through asteroid fields, nebula gas explosion in deep space, professional sci-fi, dynamic motion, 4k" },
                            { name: "Nostalgic Cafe", text: "Cozy coffee shop window with rain droplets falling down the glass, coffee cup steaming, golden sunlight casting long moody reflections, film look" }
                          ].map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setVideoPromptText(preset.text)}
                              className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded text-[8px] border border-white/5 font-mono transition-colors"
                            >
                              + {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Reference Seed Mode Selector */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block">Starting Seed Frame</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'text', label: "Pure Text", desc: "Veo Prompt only" },
                          { id: 'camera', label: "Camera", desc: "Freeze Snap" },
                          { id: 'upload', label: "Upload Image", desc: "Pick PNG/JPG" }
                        ].map((source) => (
                          <button
                            key={source.id}
                            type="button"
                            onClick={() => setVideoSourceType(source.id as any)}
                            className={`p-1.5 rounded-xl border text-center transition-all ${
                              videoSourceType === source.id 
                                ? 'bg-zoya-cyan/10 text-zoya-cyan border-zoya-cyan/40 shadow-[0_0_10px_rgba(0,242,255,0.05)]' 
                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                            }`}
                          >
                            <div className="text-[9px] font-bold uppercase tracking-wider">{source.label}</div>
                            <div className="text-[7px] opacity-40 font-mono mt-0.5 whitespace-nowrap">{source.desc}</div>
                          </button>
                        ))}
                      </div>

                      {/* Display according to source type */}
                      {videoSourceType === 'camera' && (
                        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-center space-y-2">
                          <p className="text-[9px] text-white/50">
                            {isCameraOn 
                              ? "✔ Live webcam active! Fast snap of the scene will be taken as starting reference." 
                              : "⚠️ Turn on camera in footer to capture snapshot seed."}
                          </p>
                          {!isCameraOn && (
                            <button
                              type="button"
                              onClick={() => startCamera()}
                              className="px-2 py-0.5 bg-zoya-cyan/15 text-zoya-cyan rounded border border-zoya-cyan/20 text-[8px] font-mono uppercase hover:bg-zoya-cyan/25 transition-colors"
                            >
                              Activate Camera
                            </button>
                          )}
                        </div>
                      )}

                      {videoSourceType === 'upload' && (
                        <div className="space-y-2">
                          <input
                            type="file"
                            ref={videoFileInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setVideoUploadBase64((reader.result as string).split(',')[1]);
                                  setVideoUploadMime(file.type);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            accept="image/*"
                            className="hidden"
                          />
                          {videoUploadBase64 ? (
                            <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video group bg-black/60 max-h-[110px] flex items-center justify-center">
                              <img
                                src={`data:${videoUploadMime || 'image/jpeg'};base64,${videoUploadBase64}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => videoFileInputRef.current?.click()}
                                  className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[8px] uppercase font-bold border border-white/10"
                                >
                                  Replace
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVideoUploadBase64(null);
                                    setVideoUploadMime(null);
                                  }}
                                  className="px-2 py-1 bg-red-500/20 hover:bg-red-500/40 rounded text-red-300 text-[8px] uppercase font-bold border border-red-500/20"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => videoFileInputRef.current?.click()}
                              className="w-full p-4 bg-white/5 border border-dashed border-white/10 hover:border-zoya-cyan rounded-xl flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/60 transition-all group pointer-events-auto"
                            >
                              <Image className="w-4 h-4 group-hover:scale-110 transition-transform text-white/40 group-hover:text-zoya-cyan" />
                              <span className="text-[8px] font-mono uppercase tracking-wider">Select Reference Image (PNG/JPG)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Controls Grid */}
                    <div className="grid grid-cols-2 gap-3 pb-1">
                      {/* Aspect Ratio */}
                      <div className="space-y-1">
                        <label className="text-[8px] font-mono text-white/40 uppercase tracking-widest block">Aspect Ratio</label>
                        <div className="flex gap-1.5">
                          {['16:9', '9:16'].map((ratio) => (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setVideoAspectRatio(ratio as any)}
                              className={`flex-1 py-1 rounded-lg border text-[8px] font-mono tracking-wider transition-all ${
                                videoAspectRatio === ratio 
                                  ? 'bg-white/10 text-white border-white/20 font-bold' 
                                  : 'bg-black/20 border-white/5 text-white/40 hover:text-white/60'
                              }`}
                            >
                              {ratio === '16:9' ? "16:9 Landscape" : "9:16 Portrait"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Resolution */}
                      <div className="space-y-1">
                        <label className="text-[8px] font-mono text-white/40 uppercase tracking-widest block">Resolution</label>
                        <div className="flex gap-1.5">
                          {['720p', '1080p'].map((res) => (
                            <button
                              key={res}
                              type="button"
                              onClick={() => setVideoResolution(res as any)}
                              className={`flex-1 py-1 rounded-lg border text-[8px] font-mono tracking-wider transition-all ${
                                videoResolution === res 
                                  ? 'bg-white/10 text-white border-white/20 font-bold' 
                                  : 'bg-black/20 border-white/5 text-white/40 hover:text-white/60'
                              }`}
                            >
                              {res} {res === '720p' ? '(Fast)' : '(Crisp)'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action button inside card */}
                    <button
                      onClick={generateCinematicMoment}
                      disabled={isGeneratingVideo}
                      className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-[0.15em] text-[10px] transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                        isGeneratingVideo 
                          ? 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5' 
                          : 'bg-white text-black hover:scale-[1.01] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-zoya-cyan/10 hover:border-zoya-cyan'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-zoya-cyan via-zoya-pink to-zoya-purple opacity-0 hover:opacity-10 transition-opacity" />
                      {isGeneratingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      Generate AI Video
                    </button>
                  </div>
                )}
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
              className={`p-4 rounded-full glass-panel transition-colors ${isScreenShared ? 'text-zoya-cyan border-zoya-cyan/40 shadow-[0_0_20px_rgba(0,242,255,0.2)]' : 'text-white/20 hover:text-white/60'}`}
              title={isScreenShared ? "Stop Screen Share" : "Share Screen"}
            >
              {isScreenShared ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            </button>
            <span className="text-[10px] uppercase tracking-widest opacity-40">Screen Share</span>
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
              className={`p-4 rounded-full glass-panel transition-colors ${isScreenShared || isCameraOn ? 'text-white/60 hover:text-zoya-cyan border-white/10 hover:border-zoya-cyan/40' : 'text-white/10 pointer-events-none'}`}
              title="Manual Snapshot"
            >
              <Camera className="w-6 h-6" />
            </button>
            <span className="text-[10px] uppercase tracking-widest opacity-40">Snapshot</span>
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
                    {isScreenShared ? 'Screen Share' : 'Visual Input'}
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
                  {/* Gemini-style Snapshot Button Overlay */}
                  {isScreenShared && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          takeScreenshot();
                        }}
                        className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-zoya-cyan text-black font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-widest">Snapshot</span>
                      </button>
                    </div>
                  )}
                  
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

      {/* Android Architectural Manifest Modal */}
      <AnimatePresence>
        {isAndroidModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-4xl bg-zoya-dark border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl my-8"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between sticky top-0 bg-zoya-dark/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zoya-purple/20 rounded-2xl text-zoya-purple">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Zoya Android OS</h2>
                    <p className="text-zoya-purple text-xs font-bold uppercase tracking-widest">Personal Voice Assistant Architect</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAndroidModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/5 text-white/40 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Intro Section */}
                <section className="space-y-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Brain className="w-5 h-5 text-zoya-cyan" />
                    System Architecture
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-2">
                      <p className="text-zoya-cyan text-[10px] font-bold uppercase">Wake Word</p>
                      <p className="text-xs text-white/60">Foreground Service using Porcupine for "Hey Zoya" detection.</p>
                    </div>
                    <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-2">
                      <p className="text-zoya-pink text-[10px] font-bold uppercase">Decision Engine</p>
                      <p className="text-xs text-white/60">Gemini Pro API integration for intent parsing in Hinglish.</p>
                    </div>
                    <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-2">
                      <p className="text-zoya-purple text-[10px] font-bold uppercase">Automation</p>
                      <p className="text-xs text-white/60">Accessibility Service for screen reading and automated clicks.</p>
                    </div>
                  </div>
                </section>

                {/* Core Automation Service Code */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <Clapperboard className="w-5 h-5 text-zoya-purple" />
                      Step 1: The Automation Service (Kotlin)
                    </h3>
                    <span className="text-[10px] text-white/40 font-mono">ZoyaAccessibilityService.kt</span>
                  </div>
                  <div className="p-6 bg-black/40 rounded-3xl border border-white/10 font-mono text-xs overflow-x-auto">
                    <pre className="text-zoya-cyan/80">
{`class ZoyaService : AccessibilityService() {
    // This allows Zoya to click "Send" in WhatsApp
    fun sendMessage(text: String, contact: String) {
        // 1. Open WhatsApp intent
        // 2. Click Search icon
        clickByText("Search") 
        // 3. Type contact name
        // 4. Click result
        // 5. Paste text into message box
        // 6. Click "Send"
        clickByText("Send")
    }

    private fun clickByText(text: String) {
        rootInActiveWindow?.findAccessibilityNodeInfosByText(text)
            ?.forEach { it.performAction(AccessibilityNodeInfo.ACTION_CLICK) }
    }
}`}
                    </pre>
                  </div>
                  <p className="text-[10px] text-white/40 italic">Note: Use AccessibilityNodeInfo.ACTION_SCROLL_FORWARD for Reels/Shorts.</p>
                </section>

                {/* System Controls */}
                <section className="space-y-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-zoya-pink" />
                    Step 2: Voice Command Mapping
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                      <h4 className="text-[10px] font-bold text-zoya-cyan uppercase mb-4">Code: App Intents</h4>
                      <div className="p-4 bg-black/20 rounded-2xl font-mono text-[10px] text-white/60">
{`// Launch WhatsApp
val waIntent = packageManager.getLaunchIntentForPackage("com.whatsapp")
startActivity(waIntent)

// Launch YouTube
val ytIntent = packageManager.getLaunchIntentForPackage("com.google.android.youtube")
startActivity(ytIntent)`}
                      </div>
                    </div>
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                      <h4 className="text-[10px] font-bold text-zoya-pink uppercase mb-4">System Settings</h4>
                      <div className="p-4 bg-black/20 rounded-2xl font-mono text-[10px] text-white/60">
{`// Toggle WiFi (Needs Settings Permission)
val intent = Intent(Settings.ACTION_WIFI_SETTINGS)
startActivity(intent)

// Do Not Disturb
mNotificationManager.setInterruptionFilter(
    NotificationManager.INTERRUPTION_FILTER_NONE
)`}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Setup & Tools */}
                <section className="space-y-4">
                  <h3 className="text-white font-bold text-sm">System Integration Path</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-3 p-6 bg-zoya-cyan/5 rounded-[2rem] border border-zoya-cyan/10">
                      <div className="flex items-center gap-2 text-zoya-cyan font-bold uppercase text-[10px]">
                        <Code2 className="w-3 h-3" /> Native Android (Kotlin)
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed">
                        Boss, sara Android code ready hai! AI Studio ke <span className="text-white font-bold">Settings menu (top-right) se "Export as ZIP"</span> click karo. Us ZIP ko Android Studio mein open karke directly APK build kar lo.
                      </p>
                      <button
                        onClick={() => setIsMobileBuildGuideOpen(true)}
                        className="mt-2 w-full py-2.5 rounded-xl bg-zoya-cyan/20 border border-zoya-cyan/30 text-zoya-cyan text-[10px] font-bold uppercase tracking-widest hover:bg-zoya-cyan/35 transition-all text-center font-mono"
                      >
                        📱 APK Build Guide (Hindi/Eng)
                      </button>
                    </div>
                    <div className="flex flex-col gap-3 p-6 bg-zoya-purple/5 rounded-[2rem] border border-zoya-purple/10">
                      <div className="flex items-center gap-2 text-zoya-purple font-bold uppercase text-[10px]">
                        <ShieldCheck className="w-3 h-3" /> System Control Hub
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed">
                        By using the <span className="text-zoya-purple">Accessibility Service API</span>, the Android version of Zoya can scroll your YouTube Reels and click "Send" in WhatsApp automatically.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Closing */}
                <div className="p-8 bg-gradient-to-tr from-zoya-purple/20 to-zoya-cyan/20 rounded-[2rem] border border-white/10 text-center space-y-4">
                  <h3 className="text-xl font-bold text-white italic">"Taiyaar ho, Boss? Let's build Zoya for Android."</h3>
                  <p className="text-xs text-white/40 max-w-lg mx-auto">
                    This architectural pattern bypasses standard limits to create a persistent, always-listening assistant capable of controlling other apps directly.
                  </p>
                  <div className="pt-4 flex justify-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] text-zoya-cyan font-bold uppercase tracking-widest px-4 py-2 bg-zoya-cyan/10 rounded-full border border-zoya-cyan/20">
                      <Shield className="w-3 h-3" /> No Root Required
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zoya-pink font-bold uppercase tracking-widest px-4 py-2 bg-zoya-pink/10 rounded-full border border-zoya-pink/20">
                      <Zap className="w-3 h-3" /> Zero Latency
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                        : "\"Chrome requires a direct connection for deep system sync. Step out of the preview frame to initiate Screen Share.\""}
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
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Install / Open App Modal */}
      <AnimatePresence>
        {isInstallModalOpen && (
          <div className="fixed inset-0 z-[111] flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-sm bg-zoya-dark border border-white/20 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] p-10 text-center relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zoya-cyan via-zoya-pink to-zoya-purple" />
              
              <div className="w-20 h-20 bg-zoya-cyan/20 rounded-3xl mx-auto mb-8 flex items-center justify-center text-zoya-cyan">
                {deferredPrompt ? <Sparkles className="w-10 h-10" /> : <Monitor className="w-10 h-10" />}
              </div>
              
              <h2 className="text-3xl font-bold tracking-tight text-white mb-6">
                {deferredPrompt ? "Install Zoya AI" : "Mobile Direct System"}
              </h2>
              <p className="text-white/60 text-sm leading-relaxed mb-8 px-4">
                {deferredPrompt 
                  ? "\"Install Zoya directly on your home screen for high-speed AI interactions and full-screen visual sync.\""
                  : "\"Arre listen! For the best experience, install me as an app on your home screen so I can see everything better.\""}
              </p>

              <div className="space-y-3 mb-10">
                {deferredPrompt ? (
                  <div className="p-4 bg-zoya-cyan/10 rounded-2xl border border-zoya-cyan/20 text-left">
                    <p className="text-[11px] text-white/80 leading-snug">
                      Zoya is ready to be installed! Tap the button below to add her to your system applications.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                      <p className="text-[11px] text-white/80 leading-snug">Tap the <span className="text-zoya-cyan font-bold">Share</span> or <span className="text-zoya-cyan font-bold">Menu</span> button in your browser.</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                      <p className="text-[11px] text-white/80 leading-snug">Select <span className="text-zoya-cyan font-bold">"Add to Home Screen"</span> to save Zoya permanently.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-5 rounded-2xl bg-zoya-cyan text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,242,255,0.3)]"
                >
                  <Sparkles className="w-5 h-5" />
                  {deferredPrompt ? 'Install Zoya' : 'Launch Direct'}
                </button>
                <button
                  onClick={() => setIsInstallModalOpen(false)}
                  className="w-full py-4 rounded-full bg-white/5 text-white/40 font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scanline Effect */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%] z-50 opacity-20" />
    </div>
  );
}
