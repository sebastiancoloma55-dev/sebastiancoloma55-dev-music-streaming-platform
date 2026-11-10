"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import {
  AudioLines, Search, Home, Compass, Library, Heart, Plus, Play, Pause,
  SkipBack, SkipForward, Volume2, Music2, Menu, X, LogIn, LogOut, UserRound,
  Disc3, ListMusic, Loader2, Trash2
} from "lucide-react";

type Track = {
  id: string; title: string; slug: string; description?: string | null;
  duration_seconds: number; audio_storage_path?: string | null; artwork_url?: string | null;
  explicit?: boolean; album?: { title?: string; cover_url?: string | null } | null;
  track_artists?: { artist_role?: string; position?: number; artists?: { name?: string } | null }[];
};
type Playlist = { id: string; name: string; description?: string | null };

const formatTime = (seconds = 0) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};
const artistNames = (track: Track) => (track.track_artists ?? [])
  .sort((a, b) => (a.position ?? 1) - (b.position ?? 1))
  .map(item => item.artists?.name).filter(Boolean).join(", ") || "Artista independiente";
const audioUrlFor = (track: Track) => {
  const path = track.audio_storage_path?.trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET;
  if (!bucket || !supabase) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

export default function HomePage() {
  const [active, setActive] = useState("Inicio");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playing, setPlaying] = useState<Track | null>(null);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<{id:string;email:string|null}|null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login"|"register">("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement>(null);

  const loadLibrary = useCallback(async (userId?: string) => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("tracks")
      .select("id,title,slug,description,duration_seconds,audio_storage_path,artwork_url,explicit,album:albums(title,cover_url),track_artists(artist_role,position,artists(name))")
      .eq("is_published", true).order("created_at", { ascending: false });
    if (error) setMessage("No pudimos cargar el catálogo: " + error.message);
    else setTracks((data ?? []) as unknown as Track[]);
    if (userId) {
      const [fav, lists] = await Promise.all([
        supabase.from("favorites").select("track_id").eq("user_id", userId),
        supabase.from("playlists").select("id,name,description").eq("owner_id", userId).order("created_at", { ascending: false })
      ]);
      if (!fav.error) setFavorites((fav.data ?? []).map(row => row.track_id));
      if (!lists.error) setPlaylists((lists.data ?? []) as Playlist[]);
    } else { setFavorites([]); setPlaylists([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getUser().then(({data}) => {
      if (!alive) return;
      const current = data.user ? {id:data.user.id,email:data.user.email ?? null} : null;
      setUser(current);
      void loadLibrary(current?.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user ? {id:session.user.id,email:session.user.email ?? null} : null;
      setUser(current);
      void loadLibrary(current?.id);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [loadLibrary]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    let list = active === "Favoritos" ? tracks.filter(t => favorites.includes(t.id)) : tracks;
    if (term) list = list.filter(t => [t.title, artistNames(t), t.album?.title ?? ""].join(" ").toLocaleLowerCase().includes(term));
    return list;
  }, [tracks, favorites, query, active]);

  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage("Falta configurar Supabase en el entorno Preview."); return; }
    setAuthBusy(true); setMessage("");
    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setMessage(result.error ? result.error.message : authMode === "login" ? "Sesión iniciada." : "Cuenta creada. Revisa tu correo si la confirmación está activada.");
    setAuthBusy(false);
    if (!result.error && authMode === "login") setAuthOpen(false);
  }
  async function signOut() {
    if (supabase) { const {error} = await supabase.auth.signOut(); if (error) setMessage(error.message); }
  }
  async function toggleFavorite(track: Track) {
    if (!user || !supabase) { setAuthOpen(true); setMessage("Inicia sesión para guardar favoritos."); return; }
    const exists = favorites.includes(track.id);
    setFavorites(old => exists ? old.filter(id => id !== track.id) : [...old, track.id]);
    const result = exists
      ? await supabase.from("favorites").delete().eq("user_id", user.id).eq("track_id", track.id)
      : await supabase.from("favorites").insert({user_id:user.id,track_id:track.id});
    if (result.error) { setMessage(result.error.message); void loadLibrary(user.id); }
  }
  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !supabase || !playlistName.trim()) return;
    const {data,error} = await supabase.from("playlists").insert({owner_id:user.id,name:playlistName.trim(),visibility:"private"}).select("id,name,description").single();
    if (error) setMessage("No se pudo crear la playlist: " + error.message);
    else { setPlaylists(old => [data as Playlist,...old]); setPlaylistName(""); setPlaylistOpen(false); setSelectedPlaylist(data.id); setMessage("Playlist creada."); }
  }
  async function addToPlaylist(playlistId: string) {
    if (!playing || !supabase) return;
    const {error} = await supabase.from("playlist_tracks").upsert({playlist_id:playlistId,track_id:playing.id,position:1},{onConflict:"playlist_id,track_id"});
    setMessage(error ? "No se pudo agregar: " + error.message : "Canción agregada a tu playlist.");
  }
  async function playTrack(track: Track) {
    const url = audioUrlFor(track);
    if (!url) { setMessage("Esta canción aún no tiene un archivo de audio accesible. Se necesita una URL autorizada o configurar el bucket de audio de Supabase."); return; }
    setPlaying(track);
    window.setTimeout(() => { void audioRef.current?.play().catch(() => setMessage("El navegador bloqueó la reproducción. Vuelve a presionar reproducir.")); }, 0);
    if (user && supabase) void supabase.from("listening_history").insert({user_id:user.id,track_id:track.id,listened_seconds:0,completed:false});
  }
  function changeTrack(direction: number) {
    if (!playing || !tracks.length) return;
    const index = tracks.findIndex(t => t.id === playing.id);
    const next = tracks[(index + direction + tracks.length) % tracks.length];
    void playTrack(next);
  }
  const nav = [
    {label:"Inicio",icon:Home},{label:"Explorar",icon:Compass},
    {label:"Tu biblioteca",icon:Library},{label:"Favoritos",icon:Heart}
  ];

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><AudioLines size={23}/></div><span>sonara<span className="brand-dot">.</span></span><button className="mobile-close" onClick={() => setMobileMenu(false)}><X/></button></div>
        <div className="nav-label">MENÚ</div>
        <nav>{nav.map(({label,icon:Icon})=><button key={label} className={`nav-item ${active===label?"selected":""}`} onClick={()=>{setActive(label);setMobileMenu(false);}}><Icon size={19}/>{label}</button>)}</nav>
        <div className="sidebar-divider"/>
        <div className="library-heading"><span>TUS PLAYLISTS</span><button aria-label="Crear playlist" onClick={()=>user?setPlaylistOpen(true):setAuthOpen(true)}><Plus size={17}/></button></div>
        <div className="playlist-list">
          {playlists.map(list=><button key={list.id} className="playlist-link" onClick={()=>{setSelectedPlaylist(list.id);setActive("Tu biblioteca");}}><ListMusic size={15}/>{list.name}</button>)}
          {playlists.length===0&&<div className="playlist-empty"><div className="playlist-icon"><Music2 size={18}/></div><p>Tu música empieza aquí</p><span>Crea tu primera playlist y reúne tus favoritos.</span><button onClick={()=>user?setPlaylistOpen(true):setAuthOpen(true)}>Crear playlist</button></div>}
        </div>
        <div className="sidebar-bottom"><div className="mini-profile"><div className="avatar"><UserRound size={17}/></div><div><strong>{user ? user.email?.split("@")[0] : "Invitado"}</strong><small>{user ? "Cuenta SONARA" : "Escucha el catálogo público"}</small></div></div></div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={()=>setMobileMenu(true)}><Menu/></button>
          <div className="search-wrap"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="¿Qué quieres escuchar hoy?"/><kbd>⌘ K</kbd></div>
          <div className="top-actions"><span className="preview-tag"><span/> PREVIEW</span>{user?<button className="login-button" onClick={signOut}><LogOut size={16}/> Salir</button>:<button className="login-button" onClick={()=>{setAuthMode("login");setAuthOpen(true);}}><LogIn size={16}/> Iniciar sesión</button>}</div>
        </header>
        <div className="content">
          <section className="welcome">
            <div className="welcome-copy"><div className="eyebrow"><AudioLines size={14}/> TU ESPACIO, TU SONIDO</div><h1>La música que<br/><em>te mueve.</em></h1><p>Un universo sonoro creado alrededor de ti. Descubre nuevos sonidos y vuelve a tus favoritos.</p><button className="primary-cta" onClick={()=>setActive("Explorar")}>Explorar música <span>↗</span></button></div>
            <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-disc"><div className="disc-center"><AudioLines size={34}/></div></div><div className="floating-note note-one">♫</div><div className="floating-note note-two">♪</div><div className="hero-caption"><span>SONIDO EN MOVIMIENTO</span><strong>SONARA</strong></div></div>
          </section>
          <section className="section-block">
            <div className="section-head"><div><span className="section-kicker">{active==="Favoritos"?"TU COLECCIÓN":"CATÁLOGO DISPONIBLE"}</span><h2>{query?"Resultados":active==="Favoritos"?"Tus favoritos":active==="Tu biblioteca"?"Tu biblioteca":"Selección SONARA"}</h2></div><button className="text-link" onClick={()=>void loadLibrary(user?.id)}>Actualizar <span>↻</span></button></div>
            {loading?<div className="loading-state"><Loader2 className="spin" size={22}/> Cargando catálogo…</div>:filtered.length===0?<div className="empty-catalog"><Music2 size={28}/><strong>{tracks.length===0?"Aún no hay canciones publicadas":"No encontramos coincidencias"}</strong><span>{tracks.length===0?"Cuando se publiquen canciones autorizadas, aparecerán aquí.":"Prueba con otro título o artista."}</span></div>:<div className="track-grid">{filtered.map((track,i)=><article className="track-card" key={track.id}><button className="track-cover-button" onClick={()=>void playTrack(track)} aria-label={`Reproducir ${track.title}`}><div className="cover" style={track.artwork_url?{backgroundImage:`url("${track.artwork_url}")`,backgroundSize:"cover",backgroundPosition:"center"}:{}}><div className="cover-shape"><Disc3 size={66} strokeWidth={1}/></div><span className="cover-index">{String(i+1).padStart(2,"0")}</span><span className="cover-play"><Play size={20} fill="currentColor"/></span></div></button><div className="track-info"><strong>{track.title}</strong><span>{artistNames(track)}</span><small>{track.album?.title??"Lanzamiento independiente"} · {formatTime(track.duration_seconds)}</small></div><button className={`favorite-button ${favorites.includes(track.id)?"is-favorite":""}`} aria-label="Guardar en favoritos" onClick={()=>void toggleFavorite(track)}><Heart size={17} fill={favorites.includes(track.id)?"currentColor":"none"}/></button></article>)}</div>}
          </section>
          <section className="bottom-feature"><div className="feature-icon"><Heart size={22}/></div><div><span className="section-kicker">TU COLECCIÓN</span><h3>Guarda lo que te hace sentir.</h3><p>Inicia sesión para crear playlists y guardar tus favoritos.</p></div><button onClick={()=>user?setPlaylistOpen(true):setAuthOpen(true)}>{user?"Crear playlist":"Conectar mi cuenta"} <span>→</span></button></section>
          <footer><span>© 2026 SONARA</span><span>Una experiencia musical independiente</span><span className="connection"><i className={supabaseReady?"connected":""}/>{supabaseReady?"Backend configurado":"Pendiente de conectar"}</span></footer>
        </div>
      </section>

      <div className="player">
        <div className="now-playing"><div className="player-art"><Disc3 size={22}/></div><div><strong>{playing?.title??"El sonido comienza aquí"}</strong><span>{playing?artistNames(playing):"Selecciona una canción"}</span></div>{playing&&<button aria-label="Favorito" onClick={()=>void toggleFavorite(playing)}><Heart size={17} fill={favorites.includes(playing.id)?"currentColor":"none"}/></button>}</div>
        <div className="player-controls"><div className="control-buttons"><button aria-label="Anterior" onClick={()=>changeTrack(-1)}><SkipBack size={18} fill="currentColor"/></button><button className="play-main" onClick={()=>{if(!playing){if(tracks[0])void playTrack(tracks[0]);}else if(audioRef.current?.paused)void audioRef.current.play();else audioRef.current?.pause();}} aria-label="Reproducir o pausar">{audioRef.current?.paused?<Play size={17} fill="currentColor"/>:<Pause size={17} fill="currentColor"/>}</button><button aria-label="Siguiente" onClick={()=>changeTrack(1)}><SkipForward size={18} fill="currentColor"/></button></div><div className="progress-row"><span>{formatTime(currentTime)}</span><input aria-label="Progreso" type="range" min="0" max={duration||1} value={Math.min(currentTime,duration||1)} onChange={e=>{if(audioRef.current)audioRef.current.currentTime=Number(e.target.value);}}/><span>{formatTime(duration)}</span></div></div>
        <div className="volume"><Volume2 size={18}/><input aria-label="Volumen" type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div>
      </div>
      <audio ref={audioRef} src={playing?audioUrlFor(playing)??undefined:undefined} onTimeUpdate={e=>setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={e=>setDuration(e.currentTarget.duration)} onEnded={()=>changeTrack(1)} onPlay={()=>setMessage("")}/>
      {authOpen&&<div className="modal-backdrop" onClick={()=>setAuthOpen(false)}><form className="auth-modal" onSubmit={authenticate} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setAuthOpen(false)}><X size={19}/></button><div className="brand modal-brand"><div className="brand-mark"><AudioLines size={21}/></div><span>sonara<span className="brand-dot">.</span></span></div><h2>{authMode==="login"?"Vuelve a tu sonido.":"Crea tu cuenta SONARA."}</h2><p>{authMode==="login"?"Inicia sesión para entrar a tu espacio personal.":"Regístrate para guardar canciones y crear playlists."}</p><label>Correo electrónico<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com"/></label><label>Contraseña<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"/></label><button className="primary-cta auth-submit" disabled={authBusy}>{authBusy?"Conectando…":authMode==="login"?"Iniciar sesión":"Crear cuenta"}</button>{message&&<small className="form-message">{message}</small>}<button type="button" className="mode-switch" onClick={()=>{setAuthMode(authMode==="login"?"register":"login");setMessage("");}}>{authMode==="login"?"¿No tienes cuenta? Crear una":"¿Ya tienes cuenta? Iniciar sesión"}</button></form></div>}
      {playlistOpen&&<div className="modal-backdrop" onClick={()=>setPlaylistOpen(false)}><form className="auth-modal" onSubmit={createPlaylist} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setPlaylistOpen(false)}><X size={19}/></button><h2>Nueva playlist</h2><p>Tu colección privada, a tu manera.</p><label>Nombre de la playlist<input required maxLength={100} value={playlistName} onChange={e=>setPlaylistName(e.target.value)} placeholder="Mis canciones favoritas"/></label><button className="primary-cta auth-submit">Crear playlist</button></form></div>}
      {selectedPlaylist&&<div className="playlist-dock"><span>Playlist seleccionada</span><strong>{playlists.find(p=>p.id===selectedPlaylist)?.name}</strong><button onClick={()=>void addToPlaylist(selectedPlaylist)} disabled={!playing}>Agregar canción actual</button><button aria-label="Cerrar" onClick={()=>setSelectedPlaylist(null)}><X size={15}/></button></div>}
      {message&&!authOpen&&!playlistOpen&&<div className="toast" onClick={()=>setMessage("")}>{message}<button><X size={14}/></button></div>}
    </main>
  );
}
