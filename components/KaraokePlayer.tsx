
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Song, InstrumentalSource } from '../types';
import { 
  Mic, Volume2, Play, Pause, X, 
  WifiOff, Wifi, Youtube, Music,
  AlertTriangle, Info, Disc, Waves, Sliders, Terminal, Cpu, Activity
} from 'lucide-react';
import { getFullLyrics } from '../services/geminiService';
import * as storage from '../services/storageService';

interface KaraokePlayerProps {
  song: Song;
  onClose: () => void;
}

const KaraokePlayer: React.FC<KaraokePlayerProps> = ({ song, onClose }) => {
  const [lyrics, setLyrics] = useState<string>('Carregando palco...');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeSource, setActiveSource] = useState<InstrumentalSource | null>(null);
  
  // YouTube "Program" simulation state
  const [isLaunching, setIsLaunching] = useState(false);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  
  const [volume, setVolume] = useState(80);
  const [reverbLevel, setReverbLevel] = useState(30);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  
  const wetGainNodeRef = useRef<GainNode | null>(null);

  const createImpulseResponse = (context: AudioContext, duration: number, decay: number) => {
    const sampleRate = context.sampleRate;
    const length = sampleRate * duration;
    const impulse = context.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const fade = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * fade;
      right[i] = (Math.random() * 2 - 1) * fade;
    }
    return impulse;
  };

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    
    const initialSource = song.instrumentalSources?.find(s => s.type === 'youtube') || song.instrumentalSources?.[0] || null;
    handleSourceSwitch(initialSource);

    initMic();

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [song]);

  const handleSourceSwitch = (source: InstrumentalSource | null) => {
    if (source?.type === 'youtube') {
      simulateBoot(source);
    } else {
      setActiveSource(source);
      setIsLaunching(false);
    }
  };

  const simulateBoot = (source: InstrumentalSource) => {
    setIsLaunching(true);
    setBootLogs([]);
    const logs = [
      "> INICIALIZANDO MÓDULO YOUTUBE_ENGINE_V4.0...",
      "> ESTABELECENDO CONEXÃO SSL SEGURA COM GOOGLE_API...",
      "> BYPASSING AD_SYSTEM_OVERRIDE...",
      "> OTIMIZANDO BUFFER DE ÁUDIO PARA BAIXA LATÊNCIA...",
      "> SINCRONIZANDO CANAIS DE VÍDEO 1080P...",
      "> SISTEMA PRONTO. LANÇANDO PLAYER PRO_STAGE..."
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setBootLogs(prev => [...prev, log]);
        if (index === logs.length - 1) {
          setTimeout(() => {
            setActiveSource(source);
            setIsLaunching(false);
          }, 800);
        }
      }, index * 400);
    });
  };

  useEffect(() => {
    if (isPlaying && activeSource?.type !== 'youtube' && audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [activeSource, isPlaying]);

  useEffect(() => {
    const fetchLyrics = async () => {
      const result = await getFullLyrics(song.title, song.artist, song.id);
      setLyrics(result);
      storage.saveSongToOffline({ ...song, lyrics: result });
    };
    fetchLyrics();
  }, [song]);

  const initMic = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;

    if (!micStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const source = ctx.createMediaStreamSource(stream);
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        const convolver = ctx.createConvolver();
        
        dryGain.gain.value = 1.0;
        wetGain.gain.value = reverbLevel / 100;
        convolver.buffer = createImpulseResponse(ctx, 2.5, 4.0);
        
        source.connect(dryGain);
        dryGain.connect(ctx.destination);
        source.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(ctx.destination);

        wetGainNodeRef.current = wetGain;
      } catch (err) {
        console.warn("Microfone negado");
      }
    }
  };

  const handlePlayPause = () => {
    if (activeSource?.type === 'youtube') {
      setIsPlaying(!isPlaying);
      return;
    }
    if (isPlaying) audioRef.current?.pause();
    else audioRef.current?.play().catch(e => console.error(e));
    setIsPlaying(!isPlaying);
  };

  const currentLineIndex = useMemo(() => {
    const lines = lyrics.split('\n').filter(l => l.trim());
    const progress = currentTime / (duration || 1);
    return Math.min(Math.floor(progress * lines.length), lines.length - 1);
  }, [currentTime, duration, lyrics]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    if (wetGainNodeRef.current) {
      wetGainNodeRef.current.gain.setTargetAtTime(reverbLevel / 100 * 0.8, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, [reverbLevel]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-in slide-in-from-bottom duration-500 overflow-hidden">
      {activeSource?.type !== 'youtube' && (
        <audio 
          ref={audioRef} 
          src={activeSource?.uri || song.backingTrackUrl}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          crossOrigin="anonymous"
          className="hidden" 
        />
      )}

      <header className="flex items-center justify-between p-6 bg-slate-900/90 border-b border-white/10 z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg neon-glow">
            <Activity size={24} className="text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Live Session active</p>
            </div>
            <p className="text-xl font-black text-white truncate max-w-[200px] md:max-w-md">{song.title}</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 bg-black/40 px-6 py-2 rounded-full border border-white/5">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-slate-500 uppercase">Processador de Voz</span>
            <span className="text-[10px] font-bold text-fuchsia-400">Reverb: ON</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-slate-500 uppercase">Bitrate</span>
            <span className="text-[10px] font-bold text-violet-400">1411kbps</span>
          </div>
        </div>

        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#050505]">
        <div className="flex-1 relative flex flex-col items-center justify-center p-4 lg:p-8">
          {/* Simulation Overlay */}
          {isLaunching && (
            <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center p-12 text-green-500 font-mono">
              <div className="max-w-xl w-full space-y-4">
                <div className="flex items-center gap-4 mb-8">
                  <Terminal size={32} />
                  <h2 className="text-2xl font-black tracking-tighter">LAUNCH_MODULE_SYSTEM</h2>
                </div>
                <div className="space-y-1 text-sm md:text-base">
                  {bootLogs.map((log, i) => (
                    <p key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
                      {log}
                    </p>
                  ))}
                </div>
                <div className="pt-8 flex items-center gap-4">
                  <div className="flex-1 h-1 bg-green-900/30 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 animate-progress w-full origin-left" style={{ animationDuration: '2.5s' }} />
                  </div>
                  <Cpu size={20} className="animate-spin duration-[3s]" />
                </div>
              </div>
            </div>
          )}

          {activeSource?.type === 'youtube' && activeSource.videoId ? (
            <div className="w-full h-full max-h-[80vh] aspect-video relative rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)] border-4 border-[#1a1a1a] bg-black">
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#333] to-transparent pointer-events-none z-10 opacity-20" />
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${activeSource.videoId}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0&iv_load_policy=3&origin=${window.location.origin}`}
                title="YouTube Karaoke"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <>
              <div className="max-w-4xl w-full text-center space-y-8 h-64 flex flex-col justify-center">
                {lyrics.split('\n').filter(l => l.trim()).slice(currentLineIndex, currentLineIndex + 2).map((line, idx) => (
                  <p key={idx} className={`text-3xl md:text-5xl font-black transition-all duration-500 ${idx === 0 ? 'text-white scale-110 drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]' : 'text-slate-800 opacity-30'}`}>
                    {line}
                  </p>
                ))}
              </div>
              <div className="absolute bottom-10 left-0 right-0 h-32 flex items-end justify-center gap-1 px-10 pointer-events-none">
                {[...Array(40)].map((_, i) => (
                  <div key={i} className="w-1.5 bg-gradient-to-t from-violet-600 to-fuchsia-500 rounded-t-full transition-all duration-300" style={{ height: isPlaying ? `${15 + Math.random() * 85}%` : '4px' }} />
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="w-full lg:w-80 bg-slate-900/40 border-l border-white/5 p-6 space-y-8 overflow-y-auto backdrop-blur-xl">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <Waves size={14} className="text-fuchsia-500" /> Vocal FX Engine
            </h3>
            <div className="bg-black/40 border border-white/5 p-5 rounded-3xl space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase">Ambience Reverb</span>
                <span className="text-[10px] font-black text-fuchsia-400 tabular-nums">{reverbLevel}%</span>
              </div>
              <input 
                type="range" 
                className="w-full accent-fuchsia-500 bg-slate-800 h-1 rounded-full appearance-none cursor-pointer" 
                min="0"
                max="100"
                value={reverbLevel} 
                onChange={(e) => setReverbLevel(Number(e.target.value))} 
              />
              <div className="flex items-center gap-2 text-[8px] text-slate-600 font-bold uppercase">
                <Mic size={10} /> Mic Monitoring: <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <Sliders size={14} className="text-violet-500" /> Instrumental Input
            </h3>
            <div className="space-y-2">
              {song.instrumentalSources?.map((src, i) => (
                <button
                  key={i}
                  disabled={isLaunching}
                  onClick={() => handleSourceSwitch(src)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center gap-3 group relative overflow-hidden ${activeSource?.uri === src.uri ? 'bg-violet-600 border-violet-400 shadow-lg scale-[1.02]' : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-black/60'} ${isLaunching ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {activeSource?.uri === src.uri && (
                    <div className="absolute right-3 top-3">
                      <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                    </div>
                  )}
                  {src.type === 'youtube' ? <Youtube size={20} className="text-red-500" /> : <Disc size={20} className="text-violet-400" />}
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-black truncate text-white">{src.title}</p>
                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">{src.type}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {song.sources && song.sources.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-white/5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                <Info size={14} /> Linked Sources
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {song.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-violet-500/30 transition-all text-[9px] font-bold text-slate-400 truncate"
                  >
                    <span className="text-violet-500">🔗</span> {src.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer className="p-8 bg-black border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 z-20">
        <div className="flex items-center gap-8">
          <button 
            onClick={handlePlayPause} 
            className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(139,92,246,0.3)] hover:scale-105 hover:bg-violet-500 transition-all active:scale-95 group"
          >
            {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" className="ml-1" />}
          </button>
          <div className="overflow-hidden">
            <h3 className="font-black text-xl tracking-tighter text-white truncate max-w-[200px]">{song.title}</h3>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">{song.artist}</p>
          </div>
        </div>

        <div className="flex items-center gap-8 bg-white/5 p-4 rounded-3xl border border-white/5">
          <div className="flex items-center gap-4">
            <Volume2 size={16} className="text-slate-500" />
            <input 
              type="range" 
              className="w-32 accent-violet-600 h-1 rounded-full appearance-none cursor-pointer bg-slate-800" 
              min="0"
              max="100"
              value={volume} 
              onChange={(e) => setVolume(Number(e.target.value))} 
            />
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="text-[11px] font-black tabular-nums text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/20">
             {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="flex items-center gap-4">
           {!isOnline && <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase"><WifiOff size={12} /> Local Storage</div>}
           <div className="px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
             <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Master Studio Mode</span>
           </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress linear forwards;
        }
        .neon-glow {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
        }
      `}} />
    </div>
  );
};

export default KaraokePlayer;
