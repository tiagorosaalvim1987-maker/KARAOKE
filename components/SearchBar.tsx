
import React, { useState } from 'react';
import { Search, Music } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto mb-12">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busque por música ou artista..."
          className="block w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all glass-panel"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="absolute right-2 top-2 bottom-2 px-6 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 text-white rounded-xl font-medium transition-all flex items-center gap-2"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <Music size={18} />
              <span>Explorar</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
