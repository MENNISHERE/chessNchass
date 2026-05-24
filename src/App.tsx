import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Compare from "./components/Compare";
import Lenis from "lenis";

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    
    return () => {
      lenis.destroy();
    }
  }, []);

  return (
    <BrowserRouter>
      <div className="relative min-h-screen bg-[#030407] text-neutral-100 font-sans selection:bg-indigo-500/30 selection:text-white pb-12">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/15 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>
        
        <div className="relative z-10">
          <Routes>
            <Route path="/" element={<Dashboard username="MENN-HERE" />} />
            <Route path="/noman" element={<Dashboard username="noman1119" />} />
            <Route path="/compare" element={<Compare />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
