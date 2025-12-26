
import React, { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import KaraokePlayer from './components/KaraokePlayer';
import { searchSong, getStoreWorldHits } from './services/geminiService';
import { Song } from './types';
import { Music, Play, Loader2, Globe, Star, WifiOff, Heart, Youtube } from 'lucide-react';
import * as storage from './services/storageService';

const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [worldHits, setWorldHits] = useState<Song[]>([]);
  const [offlineSongs, setOfflineSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    
    const loadData = async () => {
      const hits = await getStoreWorldHits();
      setWorldHits(hits);
      setOfflineSongs(storage.getOfflineSongs());
    };
    loadData();

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const results = await searchSong(query);
      setSongs(results);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="px-6 py-12 md:py-20 border-b border-white/5 bg-gradient-to-b from-slate-900 to-slate-950 relative">
        <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-white/5 text-[10px] font-bold uppercase tracking-widest">
          {isOnline ? (
            <><div className="w-2 h-2 bg-green-500 rounded-full" /> Online</>
          ) : (
            <><div className="w-2 h-2 bg-amber-500 rounded-full" /> Offline</>
          )}
        </div>

        <div className="max-w-7xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest">
            <Globe size={14} />
            Global YouTube Integration Active
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white">
            KARAOKE<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">PRO</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Explore milhões de faixas instrumentais vinculadas diretamente ao YouTube sem distrações.
          </p>
          <SearchBar onSearch={handleSearch} isLoading={loading} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 space-y-16">
        {/* Offline Collection Section */}
        {offlineSongs.length > 0 && songs.length === 0 && !loading && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <Heart className="text-fuchsia-500 fill-fuchsia-500" />
                Meus Hits (Offline)
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {offlineSongs.map((song) => (
                <div 
                  key={song.id} 
                  onClick={() => setSelectedSong(song)}
                  className="group bg-slate-900/40 border border-white/5 p-6 rounded-3xl hover:border-fuchsia-500/30 transition-all cursor-pointer relative"
                >
                  <h3 className="text-xl font-black text-white">{song.title}</h3>
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">{song.artist}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Biblioteca Local</span>
                    {song.instrumentalSources?.some(s => s.type === 'youtube') && <Youtube size={14} className="text-red-500" />}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search Results */}
        {loading ? (
          <div className="flex flex-col items-center py-20 space-y-4">
            <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
            <p className="font-black text-slate-500 uppercase tracking-widest text-xs">Puxando lista do YouTube e Web...</p>
          </div>
        ) : songs.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Global Karaoke Search</h2>
              <button onClick={() => setSongs([])} className="text-xs font-bold text-slate-500 uppercase hover:text-white transition-colors">Limpar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {songs.map((song) => (
                <div 
                  key={song.id} 
                  className="bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-transform flex flex-col"
                >
                  <div className="h-48 bg-slate-800 flex items-center justify-center relative">
                    <div className="absolute top-4 right-4 z-10">
                      {song.instrumentalSources?.some(s => s.type === 'youtube') && (
                        <div className="bg-red-600 text-[8px] font-black text-white px-2 py-1 rounded-md flex items-center gap-1">
                          <Youtube size={10} /> YOUTUBE VINCULADO
                        </div>
                      )}
                    </div>
                    <Music size={64} className="text-slate-700" />
                    <button 
                      onClick={() => setSelectedSong(song)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"
                    >
                      <div className="bg-white text-black p-4 rounded-full shadow-2xl">
                        <Play fill="black" />
                      </div>
                    </button>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <h3 className="text-2xl font-black text-white truncate">{song.title}</h3>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-4">{song.artist}</p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Star size={12} className="text-yellow-400" />
                        <span className="text-[10px] font-black text-violet-400 uppercase">Verificado</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{song.instrumentalSources?.length || 0} Fontes</span>
                    </div>

                    {song.sources && song.sources.length > 0 && (
                      <div className="mt-auto pt-4 border-t border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Web Grounding Sources:</p>
                        <div className="flex flex-col gap-1.5">
                          {song.sources.slice(0, 2).map((src, i) => (
                            <a 
                              key={i} 
                              href={src.uri} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[9px] font-bold text-violet-400 hover:text-violet-300 truncate transition-colors flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              🔗 {src.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {selectedSong && (
        <KaraokePlayer 
          song={selectedSong} 
          onClose={() => {
            setSelectedSong(null);
            setOfflineSongs(storage.getOfflineSongs());
          }} 
        />
      )}
    </div>
  );
};

export default App;
