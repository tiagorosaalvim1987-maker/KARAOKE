
export interface InstrumentalSource {
  title: string;
  uri: string;
  type: 'karaoke' | 'backing-track' | 'instrumental' | 'youtube';
  description?: string;
  videoId?: string;
}

export interface InstrumentStem {
  instrument: 'drums' | 'guitar' | 'bass' | 'piano' | 'synth' | 'other';
  label: string;
  uri: string;
  reliability: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
  lyrics?: string;
  instruments?: string[];
  instrumentalSources?: InstrumentalSource[];
  stems?: InstrumentStem[];
  backingTrackUrl?: string;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
}

export enum AppState {
  HOME = 'HOME',
  SEARCHING = 'SEARCHING',
  PLAYING = 'PLAYING'
}
