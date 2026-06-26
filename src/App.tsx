import React, { useState, useEffect } from 'react';
import ZoyaUI from './components/ZoyaUI';
import { Wifi, Battery, Radio } from 'lucide-react';

export default function App() {
  const [time, setTime] = useState("09:41 AM");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const intervalId = setInterval(updateTime, 1000 * 30);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-[#030206] bg-gradient-to-br from-[#030206] via-[#0b0816] to-[#04030a] text-white overflow-hidden p-0 md:p-6">
      
      {/* Premium ambient light glows in the background (desktop only) */}
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-zoya-purple/15 blur-[150px] rounded-full pointer-events-none hidden md:block" />
      <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] bg-zoya-cyan/10 blur-[150px] rounded-full pointer-events-none hidden md:block" />

      {/* Main device outer containment */}
      <div className="relative flex flex-col items-center justify-center w-full h-full md:py-4">
        
        {/* Physical side button elements for absolute high-fidelity rendering (desktop only) */}
        {/* Volume Up */}
        <div className="absolute left-[-16px] top-[180px] w-[4px] h-[50px] bg-[#22242b] border border-zinc-700/30 rounded-l-md hidden md:block z-40 shadow-lg" />
        {/* Volume Down */}
        <div className="absolute left-[-16px] top-[242px] w-[4px] h-[50px] bg-[#22242b] border border-zinc-700/30 rounded-l-md hidden md:block z-40 shadow-lg" />
        {/* Power Button */}
        <div className="absolute right-[-16px] top-[210px] w-[4px] h-[75px] bg-[#22242b] border border-zinc-700/30 rounded-r-md hidden md:block z-40 shadow-lg" />

        {/* Smartphone Container */}
        <div className="
          w-full h-[100dvh] rounded-none border-0 shadow-none relative overflow-hidden flex flex-col bg-[#050505]
          md:w-[410px] md:h-[840px] md:max-h-[92vh] md:rounded-[56px] md:border-[12px] md:border-[#1a1c22] 
          md:shadow-[0_0_0_2px_#2c2f38,_0_25px_60px_-15px_rgba(0,0,0,0.95),_0_0_100px_rgba(0,242,255,0.06)]
          transition-all duration-300 ease-out
        " id="zoya_smartphone_wrapper">
          
          {/* Top Notch/Dynamic Island Pill (desktop only) */}
          <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[110px] h-[28px] bg-black rounded-full z-50 flex items-center justify-between px-3.5 pointer-events-none hidden md:flex">
            {/* Camera Lens Indicator */}
            <div className="w-[8.5px] h-[8.5px] bg-[#0c1322] border-[1.5px] border-zinc-900/60 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] flex items-center justify-center">
              <div className="w-[3px] h-[3px] bg-blue-500/30 rounded-full" />
            </div>
            {/* Speaker Grill */}
            <div className="w-[32px] h-[3px] bg-[#121212] rounded-full" />
            {/* Ambient sensor dot */}
            <div className="w-[4px] h-[4px] bg-[#0a0a0f] rounded-full" />
          </div>

          {/* Status Bar inside the mobile screen */}
          <div className="w-full h-11 flex-shrink-0 flex items-center justify-between px-6 select-none bg-black/40 backdrop-blur-md border-b border-white/5 z-40 relative">
            {/* Time */}
            <div className="text-[12px] font-sans font-semibold tracking-wide text-white/90">
              {time}
            </div>
            {/* Spacing for Notch */}
            <div className="w-[120px] h-full hidden md:block" />
            {/* Hardware Status Icons */}
            <div className="flex items-center gap-1.5 text-white/80">
              {/* LTE / 5G Tag */}
              <span className="text-[9px] font-mono font-black tracking-widest text-zoya-cyan bg-zoya-cyan/15 px-1 rounded-[3px] scale-90">5G</span>
              <Radio className="w-3.5 h-3.5 opacity-80" />
              <Wifi className="w-3.5 h-3.5 opacity-80" />
              <div className="flex items-center gap-0.5 ml-0.5">
                <span className="text-[9px] font-mono opacity-60">88%</span>
                <Battery className="w-4 h-4 opacity-90 text-zoya-cyan" />
              </div>
            </div>
          </div>

          {/* Core Interactive Zoya Web App Component */}
          <div className="flex-1 w-full relative overflow-hidden bg-zoya-dark">
            <ZoyaUI />
          </div>

          {/* Bottom Virtual Home Indicator Gesture Line */}
          <div className="w-full h-5 flex-shrink-0 relative bg-[#050505] flex items-center justify-center z-40">
            <div className="w-32 h-[4px] bg-white/20 rounded-full" />
          </div>

        </div>

        {/* Visual caption under the phone mockup (desktop only) */}
        <div className="mt-4 text-[11px] font-mono uppercase tracking-widest text-white/20 hidden md:flex items-center gap-1.5 pointer-events-none select-none">
          <span>Smartphone Companion Mode</span>
          <span className="w-1.5 h-1.5 rounded-full bg-zoya-cyan animate-pulse" />
          <span>Active</span>
        </div>

      </div>
    </main>
  );
}
