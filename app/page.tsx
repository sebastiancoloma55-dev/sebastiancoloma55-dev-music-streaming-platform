"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import {
  AudioLines, Search, Home, Compass, Library, Heart, Plus, Play, Pause,
  SkipBack, SkipForward, Volume2, Music2, Menu, X, LogIn, LogOut, UserRound,
  ChevronDown, Sparkles, Disc3
} from "lucide-react";

const tracks = [
  { id: "a1", title: "Luz de medianoche", artist: "Norte Magnético", album: "Horizonte", color: "violet", duration: "3:42" },
  { id: "a2", title: "Aire nuevo", artist: "Marina Solar", album: "Casa abierta", color: "orange", duration: "4:08" },
  { id: "a3", title: "Frecuencia azul", artist: "Los Satélites", album: "Órbita", color: "blue", duration: "3:16" },
  { id: "a4", title: "Volver a empezar", artist: "Clara Niebla", album: "Pequeños mundos", color: "pink", duration: "3:54" }
];

export default function HomePage() {
  const [active, setActive] = useState("Inicio");
  const [playing, setPlaying] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user?.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user?.email ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const filtered = useMemo(() => tracks.filter(t => (t.title + " " + t.artist + " " + t.album).toLowerCase().includes(query.toLowerCase())), [query]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage("Falta configurar la clave pública de Supabase en las variables de entorno."); return; }
    setAuthBusy(true); setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : "Sesión iniciada.");
    setAuthBusy(false);
  }
  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  const nav = [
    { label: "Inicio", icon: Home }, { label: "Explorar", icon: Compass },
    { label: "Tu biblioteca", icon: Library }, { label: "Favoritos", icon: Heart }
  ];

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><AudioLines size={23}/></div><span>sonara<span className="brand-dot">.</span></span><button className="mobile-close" onClick={() => setMobileMenu(false)}><X/></button></div>
        <div className="nav-label">MENÚ</div>
        <nav>{nav.map(({label, icon: Icon}) => <button key={label} className={`nav-item ${active === label ? "selected" : ""}`} onClick={() => {setActive(label);setMobileMenu(false);}}><Icon size={19}/>{label}</button>)}</nav>
        <div className="sidebar-divider"/>
        <div className="library-heading"><span>TUS PLAYLISTS</span><button aria-label="Crear playlist"><Plus size={17}/></button></div>
        <div className="playlist-empty"><div className="playlist-icon"><Music2 size={18}/></div><p>Tu música empieza aquí</p><span>Crea tu primera playlist y reúne tus favoritos.</span><button onClick={() => setMessage("La creación de playlists estará disponible al conectar el módulo de biblioteca.")}>Crear playlist</button></div>
        <div className="sidebar-bottom"><div className="mini-profile"><div className="avatar"><UserRound size={17}/></div><div><strong>{user ? user.split("@")[0] : "Invitado"}</strong><small>{user ? "Cuenta SONARA" : "Escucha en modo vista previa"}</small></div></div></div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileMenu(true)}><Menu/></button>
          <div className="search-wrap"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="¿Qué quieres escuchar hoy?"/><kbd>⌘ K</kbd></div>
          <div className="top-actions">
            <span className="preview-tag"><span/> PREVIEW</span>
            {user ? <button className="login-button" onClick={signOut}><LogOut size={16}/> Salir</button> : <button className="login-button" onClick={() => setAuthOpen(true)}><LogIn size={16}/> Iniciar sesión</button>}
          </div>
        </header>

        <div className="content">
          <section className="welcome">
            <div className="welcome-copy"><div className="eyebrow"><Sparkles size={14}/> TU ESPACIO, TU SONIDO</div><h1>La música que<br/><em>te mueve.</em></h1><p>Un universo sonoro creado alrededor de ti. Descubre nuevos sonidos y vuelve a tus favoritos.</p><button className="primary-cta" onClick={() => setActive("Explorar")}>Explorar música <span>↗</span></button></div>
            <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-disc"><div className="disc-center"><AudioLines size={34}/></div></div><div className="floating-note note-one">♫</div><div className="floating-note note-two">♪</div><div className="hero-caption"><span>SONIDO EN MOVIMIENTO</span><strong>01 / 04</strong></div></div>
          </section>

          <section className="section-block">
            <div className="section-head"><div><span className="section-kicker">PARA EMPEZAR</span><h2>{query ? "Resultados" : "Selección SONARA"}</h2></div><button className="text-link" onClick={() => setActive("Explorar")}>Ver todo <span>→</span></button></div>
            <div className="track-grid">{filtered.map((track, i) => <button className="track-card" key={track.id} onClick={() => setPlaying(playing === track.id ? null : track.id)}><div className={`cover cover-${track.color}`}><div className="cover-shape"><Disc3 size={66} strokeWidth={1}/></div><span className="cover-index">0{i+1}</span><span className="cover-play">{playing === track.id ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}</span></div><div className="track-info"><strong>{track.title}</strong><span>{track.artist}</span></div></button>)}</div>
            {filtered.length === 0 && <p className="empty-results">No encontramos coincidencias en esta selección.</p>}
          </section>

          <section className="bottom-feature"><div className="feature-icon"><Heart size={22}/></div><div><span className="section-kicker">TU COLECCIÓN</span><h3>Guarda lo que te hace sentir.</h3><p>Inicia sesión para preparar tu biblioteca personal.</p></div><button onClick={() => setAuthOpen(true)}>Conectar mi cuenta <span>→</span></button></section>
          <footer><span>© 2026 SONARA</span><span>Una experiencia musical independiente</span><span className="connection"><i className={supabaseReady ? "connected" : ""}/>{supabaseReady ? "Backend configurado" : "Pendiente de conectar"}</span></footer>
        </div>
      </section>

      <div className="player"><div className="now-playing"><div className="player-art"><Disc3 size={22}/></div><div><strong>{tracks.find(t => t.id === playing)?.title ?? "El sonido comienza aquí"}</strong><span>{tracks.find(t => t.id === playing)?.artist ?? "Selecciona una canción"}</span></div><button aria-label="Favorito"><Heart size={17}/></button></div><div className="player-controls"><div className="control-buttons"><button aria-label="Anterior"><SkipBack size={18} fill="currentColor"/></button><button className="play-main" onClick={() => setPlaying(playing ? null : tracks[0].id)} aria-label={playing ? "Pausar" : "Reproducir"}>{playing ? <Pause size={17} fill="currentColor"/> : <Play size={17} fill="currentColor"/>}</button><button aria-label="Siguiente"><SkipForward size={18} fill="currentColor"/></button></div><div className="progress-row"><span>0:00</span><div className="progress"><i/></div><span>0:00</span></div></div><div className="volume"><Volume2 size={18}/><div className="volume-line"/></div></div>

      {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><form className="auth-modal" onSubmit={signIn} onClick={e => e.stopPropagation()}><button type="button" className="modal-close" onClick={() => setAuthOpen(false)}><X size={19}/></button><div className="brand modal-brand"><div className="brand-mark"><AudioLines size={21}/></div><span>sonara<span className="brand-dot">.</span></span></div><h2>Vuelve a tu sonido.</h2><p>Inicia sesión para entrar a tu espacio personal.</p><label>Correo electrónico<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"/></label><label>Contraseña<input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña"/></label><button className="primary-cta auth-submit" disabled={authBusy}>{authBusy ? "Conectando..." : "Iniciar sesión"}</button>{message && <small className="form-message">{message}</small>}<small className="auth-note">El registro de nuevas cuentas se habilitará en la siguiente etapa.</small></form></div>}
      {message && !authOpen && <div className="toast" onClick={() => setMessage("")}>{message}<button><X size={14}/></button></div>}
    </main>
  );
}