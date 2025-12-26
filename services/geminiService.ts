
import { GoogleGenAI, Type } from "@google/genai";
import { Song, InstrumentalSource } from "../types";
import * as storage from "./storageService";

const parseFlexibleJson = (text: string) => {
  if (!text) return [];
  const cleanText = text.trim();
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch && markdownMatch[1]) {
      try { return JSON.parse(markdownMatch[1].trim()); } catch (e2) {}
    }
    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        const potentialJson = cleanText.substring(firstBracket, lastBracket + 1);
        return JSON.parse(potentialJson);
      } catch (e3) {}
    }
    return [];
  }
};

export const getStoreWorldHits = async (): Promise<Song[]> => {
  if (!navigator.onLine) {
    return storage.getCachedWorldHits();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Gere uma lista de 6 músicas famosas mundiais (Top Hits) de diferentes gêneros. Retorne um JSON com title e artist.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
            },
            required: ["title", "artist"],
          },
        },
      },
    });
    const data = parseFlexibleJson(response.text || "");
    const songs = data.map((item: any, idx: number) => ({
      id: `world-hit-${idx}`,
      title: item.title,
      artist: item.artist,
      instruments: ['Instrumental Completo'],
      instrumentalSources: []
    }));
    storage.saveWorldHitsCache(songs);
    return songs;
  } catch (e) {
    return storage.getCachedWorldHits();
  }
};

export const searchSong = async (query: string): Promise<Song[]> => {
  if (!navigator.onLine) {
    const offline = storage.getOfflineSongs();
    return offline.filter(s => 
      s.title.toLowerCase().includes(query.toLowerCase()) || 
      s.artist.toLowerCase().includes(query.toLowerCase())
    );
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Pesquise músicas instrumentais e versões de Karaoke para: "${query}".
    Inclua obrigatoriamente links do YouTube que sejam versões Karaoke oficiais ou instrumentais.
    
    Formato do JSON de retorno:
    [
      {
        "title": "Nome",
        "artist": "Artista",
        "instrumentalSources": [
          {
            "title": "Título da Fonte",
            "uri": "URL (se for youtube, use o link completo)",
            "type": "youtube" ou "karaoke",
            "videoId": "ID_DO_VIDEO_SE_FOR_YOUTUBE"
          }
        ]
      }
    ]`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const rawText = response.text || "";
  const data = parseFlexibleJson(rawText);
  
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  const groundingSources = groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || 'Source',
    uri: chunk.web?.uri || ''
  })).filter((s: any) => s.uri) || [];

  return (Array.isArray(data) ? data : []).map((item: any, index: number) => {
    // Tentar extrair VideoID se Gemini não forneceu mas retornou URL do YouTube
    const sources = (item.instrumentalSources || []).map((s: any) => {
      if (s.uri.includes('youtube.com') || s.uri.includes('youtu.be')) {
        const id = s.videoId || s.uri.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1];
        return { ...s, type: 'youtube', videoId: id };
      }
      return s;
    });

    return {
      ...item,
      id: `song-${Date.now()}-${index}`,
      instrumentalSources: sources,
      sources: groundingSources
    };
  });
};

export const getFullLyrics = async (title: string, artist: string, songId?: string): Promise<string> => {
  if (songId) {
    const offlineSongs = storage.getOfflineSongs();
    const found = offlineSongs.find(s => s.id === songId);
    if (found?.lyrics) return found.lyrics;
  }

  if (!navigator.onLine) return "Conecte-se para baixar as letras.";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Letra completa de "${title}" de "${artist}". Apenas a letra.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  
  let lyricsText = response.text || "Letra não encontrada.";
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (groundingChunks && groundingChunks.length > 0) {
    const links = groundingChunks
      .map((chunk: any) => chunk.web?.uri)
      .filter(Boolean)
      .slice(0, 3)
      .map((uri: string) => `\n🔗 ${uri}`)
      .join('');
    if (links) lyricsText += `\n\nFontes:${links}`;
  }

  return lyricsText;
};
