import { ArrowLeft, ArrowRight, Bell, BookOpen, Check, ChevronRight, Clock3, Heart, ListMusic, ListPlus, LogOut, Menu, MoreHorizontal, Pause, Play, Plus, Repeat2, Search, Settings2, ShieldCheck, Shuffle, Smartphone, Sparkles, Trash2, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

type PlayMode = "order" | "repeat" | "shuffle";

function formatTime(seconds = 0) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function modeLabel(mode: PlayMode) { return mode === "shuffle" ? "Shuffle" : mode === "repeat" ? "Repeat" : "In order"; }

export default function LibraryPage() {
  const [, setLocation] = useLocation();
  const library = trpc.access.library.useQuery();
  const playlists = trpc.access.playlists.useQuery();
  const myCard = trpc.access.myCard.useQuery();
  const logout = trpc.access.logout.useMutation({ onSuccess: () => setLocation("/") });
  const resetDevice = trpc.access.requestDeviceReset.useMutation();
  const favoriteMutation = trpc.access.toggleFavorite.useMutation();
  const progressMutation = trpc.access.recordProgress.useMutation();
  const createPlaylistMutation = trpc.access.createPlaylist.useMutation({ onSuccess: () => { playlists.refetch(); setPlaylistName(""); } });
  const addToPlaylistMutation = trpc.access.addToPlaylist.useMutation({ onSuccess: () => playlists.refetch() });
  const deletePlaylistMutation = trpc.access.deletePlaylist.useMutation({ onSuccess: () => playlists.refetch() });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [playMode, setPlayMode] = useState<PlayMode>("order");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [playlistQueue, setPlaylistQueue] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const data = library.data;
  const items = data?.items || [];
  const recent = data?.recentlyPlayed || [];
  const resume = items.find((item: any) => item.id === recent[0]?.contentId);
  const productShape = (data?.product || {}) as { type?: string; meta?: { type?: string } };
  const isQuran = productShape.meta?.type === "quran" || productShape.type === "quran";
  const active = items.find((item: any) => item.id === activeId) || resume || items[0];
  const favoriteItems = useMemo(() => items.filter((item: any) => favoriteIds.includes(item.id)), [items, favoriteIds]);

  useEffect(() => {
    if (data?.favoriteIds) setFavoriteIds(data.favoriteIds);
    if (!activeId && resume) setActiveId(resume.id);
  }, [data?.favoriteIds, resume?.id, activeId]);
  useEffect(() => {
    if (!playing || !active) return;
    const timer = window.setInterval(() => setPosition(current => {
      const next = current + 1;
      if (next % 10 === 0) progressMutation.mutate({ contentId: active.id, positionSeconds: next });
      return next;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [playing, active?.id]);
  useEffect(() => {
    if (!sleepTimer || !playing) return;
    const timer = window.setTimeout(() => setPlaying(false), sleepTimer * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [sleepTimer, playing]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !active?.mediaUrl) return;
    setAudioError("");
    audio.src = active.mediaUrl;
    audio.load();
    audio.currentTime = position;
    const start = () => { if (playing) audio.play().catch(() => setAudioError("اضغط تشغيل للسماح بالصوت من المتصفح.")); };
    audio.addEventListener("canplay", start);
    return () => { audio.pause(); audio.removeEventListener("canplay", start); };
  }, [active?.id]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !active?.mediaUrl) return;
    if (playing) audio.play().catch(() => setAudioError("اضغط تشغيل للسماح بالصوت من المتصفح."));
    else audio.pause();
  }, [playing, active?.id]);

  if (library.isLoading) return <div className="center-state dark-state"><div className="loader" /><span>Preparing your private shelf…</span></div>;
  if (library.error || !data) return <div className="center-state"><ShieldCheck size={34} /><h2>Your session needs a fresh tap</h2><p>{library.error?.message || "Activate your NFC card to open this library."}</p><Link className="button button-dark" href="/">Return to cards</Link></div>;

  function selectItem(item: any, autoplay = true) {
    setActiveId(item.id);
    setPosition(recent.find((entry: any) => entry.contentId === item.id)?.positionSeconds || 0);
    setPlaying(autoplay);
    progressMutation.mutate({ contentId: item.id, positionSeconds: recent.find((entry: any) => entry.contentId === item.id)?.positionSeconds || 0 });
  }
  function toggleFavorite(item: any) {
    const wasFavorite = favoriteIds.includes(item.id);
    setFavoriteIds(current => wasFavorite ? current.filter(id => id !== item.id) : [...current, item.id]);
    favoriteMutation.mutate({ contentId: item.id });
  }
  function startFavoritePlaylist() {
    const first = favoriteItems[0];
    if (first) selectItem(first, true);
  }
  function startCustomPlaylist(playlist: any) {
    const queue = playlist.items || [];
    if (!queue.length) return;
    setPlaylistQueue(queue);
    setActiveId(queue[0].id);
    setPosition(0);
    setPlaying(true);
  }
  function nextItem() {
    if (!items.length) return;
    const queue = playlistQueue.length ? playlistQueue : favoriteItems.length && active && favoriteIds.includes(active.id) ? favoriteItems : items;
    if (playMode === "repeat") return active && selectItem(active, true);
    if (playMode === "shuffle") return selectItem(queue[Math.floor(Math.random() * queue.length)], true);
    const currentIndex = Math.max(0, queue.findIndex((item: any) => item.id === active?.id));
    selectItem(queue[(currentIndex + 1) % queue.length], true);
  }
  function cycleMode() { setPlayMode(current => current === "order" ? "repeat" : current === "repeat" ? "shuffle" : "order"); }

  return <main className={`library-page ${isQuran ? "quran-mode" : "music-mode"}`} dir={isQuran ? "rtl" : "ltr"}>
    <aside className="library-sidebar"><Link href="/" className="wordmark"><span className="mark"><span /></span><span>NFC<span className="wordmark-muted">/vault</span></span></Link><div className="sidebar-label">YOUR LIBRARY</div><nav><a className="active" href="#home"><span className="nav-dot" />Home</a><a href="#discover"><Search size={17} />Discover</a><a href="#favorites"><Heart size={17} />Favorites <small className="nav-count">{favoriteIds.length}</small></a><a href="#playlists"><ListMusic size={17} />Playlists</a><a href="#recent"><Clock3 size={17} />Recently played</a><a href="#my-card"><Smartphone size={17} />My card</a></nav><div className="sidebar-bottom"><div className="license-chip"><ShieldCheck size={15} /><span>Private license<br /><strong>Active on this device</strong></span></div><button className="logout-button" onClick={() => logout.mutate()}><LogOut size={16} />{isQuran ? "خروج" : "Sign out"}</button></div></aside>
    <div className="library-main"><header className="library-header"><button className="mobile-menu" aria-label="Open menu"><Menu size={21} /></button><div className="crumb"><span>{isQuran ? "المكتبة الخاصة" : "Private library"}</span><ChevronRight size={14} /><strong>{data.product.name}</strong></div><div className="library-actions"><button aria-label="Search"><Search size={18} /></button><button aria-label="Notifications"><Bell size={18} /></button><button aria-label="Settings" onClick={() => setShowSettings(!showSettings)}><Settings2 size={18} /></button><span className="avatar">N</span></div></header>
      <section className="library-hero"><div className="library-hero-copy"><div className="eyebrow">{isQuran ? "مساحتك الهادئة" : "YOUR PRIVATE SHELF"}</div><h1>{isQuran ? <>اجعل يومك<br /><em>أكثر سكينة.</em></> : <>A good song<br /><em>finds its moment.</em></>}</h1><p>{isQuran ? "سور وأذكار ووقت هادئ، في مكان واحد." : "Your card has opened a room for the music you already love—and the songs you have not found yet."}</p>{resume && <button className="resume-pill" onClick={() => selectItem(resume, true)}><span className="resume-play"><Play size={13} fill="currentColor" /></span><span><small>{isQuran ? "استكمال الاستماع" : "CONTINUE LISTENING"}</small><strong>{resume.titleAr || resume.titleEn}</strong><em>{formatTime(recent[0]?.positionSeconds || 0)} · {resume.artistOrReciter || resume.subtitle}</em></span><ArrowLeft size={15} /></button>}</div><div className="library-hero-art">{isQuran ? <><div className="quran-ring" /><BookOpen size={38} /></> : <><div className="wave-large">{Array.from({ length: 26 }).map((_, index) => <i key={index} style={{ height: `${22 + ((index * 17) % 60)}%` }} />)}</div><span>PLAYING YOUR MOMENT</span></>}</div></section>
      {showSettings && <div className="settings-drawer"><div><span className="eyebrow">LISTENING SETTINGS</span><h3>{isQuran ? "إعدادات الاستماع" : "Make it yours"}</h3></div><label><span>Sleep timer</span><select value={sleepTimer} onChange={event => setSleepTimer(Number(event.target.value))}><option value={0}>Off</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></label><label><span>Playback</span><button className="mode-select" onClick={cycleMode}>{modeLabel(playMode)} <Repeat2 size={14} /></button></label>{isQuran && <label><span>Preferred reciter</span><button className="mode-select">Mishary Alafasy <ChevronRight size={14} /></button></label>}</div>}
      {isQuran ? <QuranContent items={items} activeId={active?.id || null} setActiveId={(id) => selectItem(items.find((item: any) => item.id === id), true)} playing={playing} setPlaying={setPlaying} favoriteIds={favoriteIds} onFavorite={toggleFavorite} favoriteItems={favoriteItems} onPlayFavorites={startFavoritePlaylist} /> : <MusicContent items={items} activeId={active?.id || null} setActiveId={(id) => selectItem(items.find((item: any) => item.id === id), true)} playing={playing} setPlaying={setPlaying} favoriteIds={favoriteIds} onFavorite={toggleFavorite} favoriteItems={favoriteItems} onPlayFavorites={startFavoritePlaylist} />}
      <PlaylistStudio playlists={playlists.data || []} currentItem={active} playlistName={playlistName} setPlaylistName={setPlaylistName} onCreate={() => playlistName.trim() && createPlaylistMutation.mutate({ name: playlistName.trim() })} onAdd={(playlistId) => active && addToPlaylistMutation.mutate({ playlistId, contentId: active.id })} onPlay={startCustomPlaylist} onDelete={(playlistId) => deletePlaylistMutation.mutate({ playlistId })} />
      <section id="my-card" className="my-card-panel"><div><div className="eyebrow">MY CARD</div><h2>Your personal digital license</h2><p>One product, one license and one trusted device. Your IP can change; your ownership stays yours.</p></div><div className="my-card-facts"><span><small>PRODUCT</small><strong>{data.product.name}</strong></span><span><small>LICENSE STATUS</small><strong className="fact-active"><i /> Active</strong></span><span><small>DEVICE</small><strong>{myCard.data?.device?.operatingSystem || "This device"}</strong></span><button className="reset-link" onClick={() => resetDevice.mutate({ reason: "Customer requested a device change" })}>{resetDevice.isSuccess ? "Request sent" : "Request device reset"} <ArrowLeft size={14} /></button></div></section>
      {audioError && <div className="audio-error"><ShieldCheck size={14} />{audioError}</div>}
      <audio ref={audioRef} preload="metadata" onTimeUpdate={event => setPosition(Math.floor(event.currentTarget.currentTime))} onEnded={nextItem} onError={() => setAudioError("ملف الصوت غير متاح حاليًا لهذا المحتوى.")} />
      {active && <div className="player-bar"><div className="player-art" style={{ backgroundImage: `url(${active.coverImage || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=200&q=70"})` }} /><div className="player-title"><strong>{active.titleAr || active.titleEn}</strong><span>{active.artistOrReciter || active.subtitle}</span></div><div className="player-controls"><button className="player-secondary" aria-label="Toggle playback mode" onClick={cycleMode}>{playMode === "shuffle" ? <Shuffle size={15} /> : playMode === "repeat" ? <Repeat2 size={15} /> : <ArrowRight size={15} />}</button><button onClick={() => setPlaying(!playing)} className="play-button">{playing ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}</button><button className="player-secondary" aria-label="Next track" onClick={nextItem}><ArrowRight size={15} /></button><div className="player-progress"><span style={{ width: `${Math.min(100, Math.max(8, (position / Math.max(1, active.durationSeconds || 1)) * 100))}%` }} /></div><span className="player-time">{formatTime(position)} / {formatTime(active.durationSeconds || 0)}</span><Volume2 size={17} /></div></div>}
      <nav className="mobile-library-nav"><a className="active" href="#home"><span className="nav-dot" />Home</a><a href="#favorites"><Heart size={17} /><span>Favorites</span></a><a href="#playlists"><ListMusic size={17} /><span>Playlist</span></a><a href="#my-card"><Smartphone size={17} /><span>My card</span></a></nav>
    </div>
  </main>;
}

function PlaybackTools({ favoriteItems, onPlayFavorites, playMode, onCycle }: { favoriteItems: any[]; onPlayFavorites: () => void; playMode?: PlayMode; onCycle?: () => void }) { return <div className="playback-tools"><button className="button button-light" onClick={onPlayFavorites} disabled={!favoriteItems.length}><Heart size={14} fill="currentColor" /> Play favorites <span>{favoriteItems.length}</span></button>{onCycle && <button className="mode-button" onClick={onCycle}>{playMode === "shuffle" ? <Shuffle size={14} /> : playMode === "repeat" ? <Repeat2 size={14} /> : <ArrowRight size={14} />} {modeLabel(playMode || "order")}</button>}</div>; }

function MusicContent({ items, activeId, setActiveId, playing, setPlaying, favoriteIds, onFavorite, favoriteItems, onPlayFavorites }: { items: any[]; activeId: number | null; setActiveId: (id: number) => void; playing: boolean; setPlaying: (playing: boolean) => void; favoriteIds: number[]; onFavorite: (item: any) => void; favoriteItems: any[]; onPlayFavorites: () => void }) {
  return <div className="library-content"><div className="content-topline"><div><div className="eyebrow">CURATED FOR YOUR CARD</div><h2>Keep listening</h2></div><a href="#all">View all <ArrowLeft size={15} /></a></div><PlaybackTools favoriteItems={favoriteItems} onPlayFavorites={onPlayFavorites} /><div className="listen-grid">{items.slice(0, 4).map((item: any, index: number) => <article className={`listen-card ${activeId === item.id ? "selected" : ""}`} key={item.id} onClick={() => { setActiveId(item.id); setPlaying(true); }}><div className="cover-art" style={{ backgroundImage: `url(${item.coverImage})` }}><span className="cover-index">0{index + 1}</span><button className="cover-favorite" aria-label="Toggle favorite" onClick={event => { event.stopPropagation(); onFavorite(item); }}>{favoriteIds.includes(item.id) ? <Heart size={14} fill="currentColor" /> : <Heart size={14} />}</button><button className="cover-play">{activeId === item.id && playing ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}</button></div><div className="listen-meta"><div><h3>{item.titleEn}</h3><p>{item.artistOrReciter || item.subtitle}</p></div><MoreHorizontal size={18} /></div></article>)}</div><div className="content-split"><section><div className="content-topline compact"><div><div className="eyebrow">WHAT'S NEW</div><h2>Fresh in the vault</h2></div><a href="#all">Explore <ArrowLeft size={15} /></a></div><div className="track-list">{items.map((item: any, index: number) => <button className="track-row" key={item.id} onClick={() => { setActiveId(item.id); setPlaying(true); }}><span className="track-number">{activeId === item.id && playing ? <span className="equalizer"><i /><i /><i /></span> : String(index + 1).padStart(2, "0")}</span><span className="track-copy"><strong>{item.titleEn}</strong><small>{item.artistOrReciter} · {item.albumOrCategory}</small></span><span className="track-duration">{formatTime(item.durationSeconds)}</span><span onClick={event => { event.stopPropagation(); onFavorite(item); }} className={`track-heart ${favoriteIds.includes(item.id) ? "is-favorite" : ""}`}><Heart size={16} fill={favoriteIds.includes(item.id) ? "currentColor" : "none"} /></span></button>)}</div></section><aside className="playlist-promo"><div className="eyebrow">YOUR NEXT HOUR</div><h3>{favoriteItems.length ? <>Your<br /><em>favorites.</em></> : <>Night<br /><em>drive.</em></>}</h3><p>{favoriteItems.length ? `${favoriteItems.length} saved moments, ready when you are.` : "8 tracks selected for when the city gets quiet."}</p><button className="button button-light" onClick={onPlayFavorites} disabled={!favoriteItems.length}>{favoriteItems.length ? "Play playlist" : "Save a favorite first"} <Play size={14} fill="currentColor" /></button></aside></div></div>;
}

function PlaylistStudio({ playlists, currentItem, playlistName, setPlaylistName, onCreate, onAdd, onPlay, onDelete }: { playlists: any[]; currentItem: any; playlistName: string; setPlaylistName: (value: string) => void; onCreate: () => void; onAdd: (playlistId: number) => void; onPlay: (playlist: any) => void; onDelete: (playlistId: number) => void }) {
  return <section className="playlist-studio" id="playlists"><div className="playlist-studio-heading"><div><div className="eyebrow">YOUR SOUND, YOUR RULES</div><h2>قوائم التشغيل الخاصة بك</h2><p>أنشئ قائمة، أضف إليها المقطع الحالي، واستمع لها بالترتيب أو العشوائي.</p></div><div className="playlist-studio-icon"><ListMusic size={22} /></div></div><div className="playlist-create"><input value={playlistName} onChange={event => setPlaylistName(event.target.value)} placeholder="اسم قائمة التشغيل الجديدة" maxLength={120} /><button className="button button-primary" onClick={onCreate} disabled={!playlistName.trim()}><Plus size={15} /> إنشاء قائمة</button></div>{currentItem && <div className="playlist-current"><div><span className="eyebrow">المقطع الحالي</span><strong>{currentItem.titleAr || currentItem.titleEn}</strong><small>{currentItem.artistOrReciter || currentItem.subtitle}</small></div><div className="playlist-add-actions">{playlists.map(playlist => <button key={playlist.id} className="playlist-add-button" onClick={() => onAdd(playlist.id)} title={`إضافة إلى ${playlist.nameAr || playlist.nameEn}`}><ListPlus size={14} />{playlist.nameAr || playlist.nameEn}</button>)}</div></div>}<div className="playlist-grid">{playlists.length ? playlists.map(playlist => <article className="playlist-card" key={playlist.id}><div className="playlist-card-art"><ListMusic size={24} /><span>{playlist.items?.length || 0} مقطع</span></div><div className="playlist-card-body"><div><h3>{playlist.nameAr || playlist.nameEn}</h3><p>{playlist.items?.slice(0, 2).map((item: any) => item.titleAr || item.titleEn).join(" · ") || "قائمة فارغة"}</p></div><div className="playlist-card-actions"><button onClick={() => onPlay(playlist)} disabled={!playlist.items?.length}><Play size={14} fill="currentColor" /> تشغيل</button><button className="playlist-delete" onClick={() => onDelete(playlist.id)}><Trash2 size={14} /></button></div></div></article>) : <div className="playlist-empty"><ListMusic size={24} /><strong>لم تنشئ قائمة بعد</strong><span>ابدأ بقائمة لمزاجك الحالي.</span></div>}</div></section>;
}

function QuranContent({ items, activeId, setActiveId, playing, setPlaying, favoriteIds, onFavorite, favoriteItems, onPlayFavorites }: { items: any[]; activeId: number | null; setActiveId: (id: number) => void; playing: boolean; setPlaying: (playing: boolean) => void; favoriteIds: number[]; onFavorite: (item: any) => void; favoriteItems: any[]; onPlayFavorites: () => void }) {
  const azkar = items.filter((item: any) => ["zekr", "ruqyah"].includes(item.contentType));
  const surahs = items.filter((item: any) => item.contentType === "surah");
  return <div className="library-content quran-content"><div className="quran-greeting"><div><div className="eyebrow">مساحتك اليومية</div><h2>السلام عليكم</h2><p>خذ لحظة لنفسك. ماذا تريد أن تستمع إليه الآن؟</p></div><div className="crescent">☾</div></div><PlaybackTools favoriteItems={favoriteItems} onPlayFavorites={onPlayFavorites} /><div className="quran-section"><div className="content-topline compact"><div><div className="eyebrow">القرآن الكريم</div><h2>السور المقترحة</h2></div><a href="#surahs">عرض الكل <ArrowLeft size={15} /></a></div><div className="surah-grid">{surahs.map((item: any, index: number) => <button key={item.id} className={`surah-card ${activeId === item.id ? "selected" : ""}`} onClick={() => { setActiveId(item.id); setPlaying(true); }}><span className="surah-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{item.titleAr || item.titleEn}</strong><small>{item.artistOrReciter} · {formatTime(item.durationSeconds)}</small></span><span className="surah-actions"><span onClick={event => { event.stopPropagation(); onFavorite(item); }}><Heart size={14} fill={favoriteIds.includes(item.id) ? "currentColor" : "none"} /></span><span className="surah-play">{activeId === item.id && playing ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</span></span></button>)}</div></div><div className="quran-section"><div className="content-topline compact"><div><div className="eyebrow">الأذكار والرقية</div><h2>وقت للذكر</h2></div></div><div className="azkar-grid">{azkar.map((item: any) => <button className="azkar-card" key={item.id} onClick={() => { setActiveId(item.id); setPlaying(true); }}><Sparkles size={19} /><strong>{item.titleAr || item.titleEn}</strong><span>{item.subtitle}</span><span className="azkar-arrow"><ChevronRight size={16} /></span></button>)}</div></div><div className="quran-quote"><span>﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾</span><small>الرعد · ٢٨</small></div></div>;
}
