import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Power, Globe, Sparkles, Volume2, Radio, Camera, CameraOff, X, ZoomIn, ZoomOut, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Clapperboard, Play, Download, Loader2, Key, Sun, Moon, Heart, Zap } from 'lucide-react';
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
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [visualInsights, setVisualInsights] = useState<string[]>([]);
  
  // Video Generation States
  const [isDirectorMode, setIsDirectorMode] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [selectedMood, setSelectedMood] = useState('energetic');

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bars, setBars] = useState<number[]>(new Array(20).fill(10));

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
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOn(true);
        setShowPreview(true);
      }
    } catch (err) {
      console.error("Failed to start camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraOn(false);
    }
  };

  // Video frame capture loop
  useEffect(() => {
    let interval: any;
    if (isCameraOn && isPowerOn && liveSessionRef.current) {
      interval = setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = 320; // Lower resolution for API
            canvas.height = 240;
            
            context.save();
            // Apply zoom and pan to canvas capture
            context.translate(canvas.width / 2, canvas.height / 2);
            context.scale(zoom, zoom);
            // Pan is in percentage of the video dimensions
            context.translate((pan.x / 100) * canvas.width, (pan.y / 100) * canvas.height);
            context.translate(-canvas.width / 2, -canvas.height / 2);
            
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            context.restore();
            
            const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
            liveSessionRef.current?.sendVideo(base64Data);
          }
        }
      }, 1000); // 1 frame per second
    }
    return () => clearInterval(interval);
  }, [isCameraOn, isPowerOn]);

  // Check for API key on mount
  useEffect(() => {
    const checkKey = async () => {
      const win = window as any;
      if (win.aistudio?.hasSelectedApiKey) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

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
      
      canvas.width = 1280;
      canvas.height = 720;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      
      setGenerationProgress("Identifying cinematic potential...");
      const description = await geminiService.describeImage(base64Data, "image/jpeg");
      
      setGenerationProgress("Directing AI camera crew...");
      // Constructing the prompt based on user instructions and selected mood
      const videoPrompt = `
        Create a high-quality cinematic video from the given image.
        Scene description: ${description}
        Motion: Add natural and realistic motion to the scene. Include subtle movements like camera pan, zoom, and depth animation. Animate people or objects smoothly and realistically.
        Camera: Use a cinematic camera style with smooth transitions, slight parallax effect, and dynamic angles.
        Lighting: Enhance lighting to make it more dramatic and visually appealing while staying realistic.
        Style: cinematic
        Mood: ${selectedMood}
        Duration: 6 seconds
        Quality: Ultra HD, detailed, smooth frame transitions, no distortion
        Extra instructions: Avoid unnatural warping or flickering. Maintain consistency with the original image.
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

  const handleTogglePower = async () => {
    if (isPowerOn) {
      // Turn off
      setIsPowerOn(false);
      audioStreamerRef.current?.stopRecording();
      liveSessionRef.current?.disconnect();
      stopCamera();
      setVisualInsights([]);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      // Turn on
      setIsPowerOn(true);
      const apiKey = process.env.GEMINI_API_KEY || '';
      
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
        (text) => {
          setVisualInsights(prev => [text, ...prev].slice(0, 5));
        },
        (enabled) => {
          if (enabled) startCamera();
          else stopCamera();
        }
      );

      await liveSessionRef.current.connect();
      await audioStreamerRef.current?.startRecording();
      await startCamera();
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
    <div className="relative h-screen w-full flex flex-row items-stretch justify-between bg-zoya-dark overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zoya-purple/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zoya-cyan/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Left Sidebar: Camera Feed */}
      <AnimatePresence>
        {isCameraOn && isSidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="z-30 w-80 glass-panel border-r border-white/5 flex flex-col p-6 gap-6 relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-zoya-cyan" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-60">Visual Input</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-md hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden border border-zoya-cyan/20 shadow-2xl group bg-black/40">
              <div className="w-full h-full overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover grayscale brightness-125 contrast-125 transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x}%, ${pan.y}%)`,
                  }}
                />
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

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Live Feed Active</span>
              </div>
              <p className="text-[10px] text-white/30 leading-relaxed font-mono">
                System is processing visual frames at 1fps. Zoom and pan are synchronized with AI perception.
              </p>
            </div>
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
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            <div className={`w-2 h-2 rounded-full animate-pulse ${isPowerOn ? 'bg-zoya-cyan' : 'bg-gray-600'}`} />
            <span className="text-xs font-mono tracking-widest uppercase opacity-60">System Status: {stateLabels[state]}</span>
          </div>
          <div className="flex items-center gap-4">
            {isPowerOn && (
              <button 
                onClick={() => setIsDirectorMode(!isDirectorMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border transition-all ${isDirectorMode ? 'border-zoya-cyan text-zoya-cyan' : 'border-white/10 text-white/40 hover:text-white'}`}
              >
                <Clapperboard className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Director Mode</span>
              </button>
            )}
            <Globe className="w-4 h-4 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" />
            <Sparkles className="w-4 h-4 opacity-40 hover:opacity-100 cursor-pointer transition-opacity text-zoya-pink" />
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
            <AnimatePresence>
              {isPowerOn && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className={`absolute inset-0 rounded-full blur-2xl opacity-30 ${state === 'speaking' ? 'bg-zoya-pink' : 'bg-zoya-cyan'}`}
                />
              )}
            </AnimatePresence>
            
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
              <button
                onClick={handleTogglePower}
                className={`relative z-20 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 glass-panel
                  ${isPowerOn ? 'border-zoya-cyan shadow-[0_0_30px_rgba(0,242,255,0.3)]' : 'border-white/10'}
                  hover:scale-105 active:scale-95`}
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
                  <Power className="w-10 h-10 text-white/20 group-hover:text-white/60 transition-colors" />
                )}
              </button>
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
        <div className="z-10 w-full flex justify-center gap-8 pb-4">
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={() => isCameraOn ? stopCamera() : startCamera()}
              className={`p-4 rounded-full glass-panel transition-colors ${isCameraOn ? 'text-zoya-cyan' : 'text-white/20'}`}
            >
              {isCameraOn ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
            </button>
            <span className="text-[10px] uppercase tracking-widest opacity-40">Camera</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className={`p-4 rounded-full glass-panel ${state === 'listening' ? 'text-zoya-cyan' : 'text-white/20'}`}>
              <Mic className="w-6 h-6" />
            </div>
            <span className="text-[10px] uppercase tracking-widest opacity-40">Mic</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-4 rounded-full glass-panel text-white/20">
              <MicOff className="w-6 h-6" />
            </div>
            <span className="text-[10px] uppercase tracking-widest opacity-40">Mute</span>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Visual Insights */}
      <AnimatePresence>
        {isPowerOn && visualInsights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="z-20 w-80 glass-panel border-l border-white/5 flex flex-col p-6 gap-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-zoya-cyan" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-60">Visual Perception</span>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
              {visualInsights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1 - i * 0.2, y: 0 }}
                  className="p-4 rounded-2xl glass-panel border-white/5 text-[11px] leading-relaxed text-white/80 font-medium italic shadow-lg"
                >
                  "{insight}"
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanline Effect */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%] z-50 opacity-20" />
    </div>
  );
}
