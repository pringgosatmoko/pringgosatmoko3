
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LandingHero } from './components/LandingHero';
import { LoginForm } from './components/LoginForm';
import { ChatAssistant } from './components/ChatAssistant';
import { VideoGenerator } from './components/VideoGenerator';
import { ImageGenerator } from './components/ImageGenerator';
import { StudioCreator } from './components/StudioCreator';
import { StoryboardToVideo } from './components/StoryboardToVideo';
import { VoiceCloning } from './components/VoiceCloning';
import { MemberControl } from './components/MemberControl';
import { SystemLogs } from './components/SystemLogs';
import { DirectChat } from './components/DirectChat';
import { ProfileSettings } from './components/ProfileSettings';
import { StartAnimation } from './components/StartAnimation';
import { SloganAnimation } from './components/SloganAnimation';
import { StorageManager } from './components/StorageManager';
import { PriceManager } from './components/PriceManager';
import { ProductSlider } from './components/ProductSlider';
import { VideoDirector } from './components/VideoDirector';
import { AspectRatioEditor } from './components/AspectRatioEditor';
import { TopupCenter } from './components/TopupCenter';
import { motion, AnimatePresence } from 'framer-motion';
import { isAdmin as checkAdmin, updatePresence, supabase } from './lib/api';

export type Feature = 'menu' | 'chat' | 'img2vid' | 'txt2img' | 'studio' | 'storyboard-to-video' | 'voice-cloning' | 'members' | 'logs' | 'direct-chat' | 'profile' | 'storage' | 'price-center' | 'video-director' | 'aspect-ratio' | 'topup';
export type Lang = 'id' | 'en';

const SideIcon = ({ active, icon, onClick, label }: { active: boolean, icon: string, onClick: () => void, label: string }) => (
  <button 
    onClick={onClick} 
    className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all relative group ${active ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
  >
    <div className="w-6 flex justify-center text-lg"><i className={`fa-solid ${icon}`}></i></div>
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const MenuCard = ({ icon, title, desc, onClick, color }: any) => {
  const iconColors: any = {
    cyan: 'text-cyan-400 bg-cyan-400/10',
    fuchsia: 'text-fuchsia-400 bg-fuchsia-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
    red: 'text-red-400 bg-red-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10'
  };

  return (
    <motion.button 
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick} 
      className={`cyber-card p-8 rounded-[2.5rem] text-left flex flex-col gap-6 h-full border border-white/5 bg-slate-900/40`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${iconColors[color] || iconColors.cyan} border border-white/5`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <h3 className="text-sm font-black uppercase text-white tracking-widest leading-none mb-2">{title}</h3>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed line-clamp-2">{desc}</p>
      </div>
      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.3em]">OTOMATIS</span>
        <i className="fa-solid fa-arrow-right-long text-[10px] text-slate-700"></i>
      </div>
    </motion.button>
  );
};

const DashboardMenu = ({ onSelect, isAdmin, t, credits }: { onSelect: (f: Feature) => void, isAdmin: boolean, t: any, credits: number }) => (
  <div className="max-w-7xl mx-auto space-y-12 py-6 relative">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
           <span className="px-2 py-0.5 bg-cyan-500 text-black text-[8px] font-bold rounded-md uppercase tracking-widest">SISTEM AKTIF</span>
           <span className="text-[9px] text-slate-600 font-mono hidden sm:block">ENGINE: SATMOKO_CORE_v7.8</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tighter leading-none italic">Creative <span className="text-cyan-400">Hub</span></h1>
        <p className="text-[9px] lg:text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 leading-tight">Copyright by Satmoko</p>
      </div>

      <div className="flex items-center gap-3">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          onClick={() => onSelect('topup')} 
          className="glass-panel p-6 rounded-[2.5rem] hover:bg-cyan-500/5 transition-all flex items-center gap-6 group border-white/10 shadow-2xl"
        >
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all"><i className="fa-solid fa-wallet text-xl"></i></div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">SALDO KREDIT</p>
            <p className="text-3xl font-black text-cyan-400 tabular-nums leading-none italic">{credits.toLocaleString()} <span className="text-xs not-italic">CR</span></p>
          </div>
        </motion.button>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
      <MenuCard icon="fa-user-shield" title={t.profile} desc="Keamanan & Profil Akun" onClick={() => onSelect('profile')} color="blue" />
      <MenuCard icon="fa-clapperboard" title={t.videoDirector} desc="Sutradara Alur Cerita Otomatis" onClick={() => onSelect('video-director')} color="orange" />
      <MenuCard icon="fa-brain" title={t.aiAssistant} desc="Konsultasi AI Pintar" onClick={() => onSelect('chat')} color="cyan" />
      <MenuCard icon="fa-film" title={t.studio} desc="Produksi Video Profesional" onClick={() => onSelect('studio')} color="yellow" />
      <MenuCard icon="fa-rectangle-list" title={t.storyboardToVid} desc="Ubah Cerita ke Video Utuh" onClick={() => onSelect('storyboard-to-video')} color="emerald" />
      <MenuCard icon="fa-image" title={t.visualArt} desc="Render Visual Gambar 4K" onClick={() => onSelect('txt2img')} color="fuchsia" />
      <MenuCard icon="fa-vector-square" title={t.aspectRatio} desc="Ubah Rasio Gambar Cerdas" onClick={() => onSelect('aspect-ratio')} color="emerald" />
      <MenuCard icon="fa-video" title={t.video} desc="Mesin Video Realistik Veo" onClick={() => onSelect('img2vid')} color="cyan" />
      <MenuCard icon="fa-microphone-lines" title={t.voice} desc="Kloning Suara Manusia AI" onClick={() => onSelect('voice-cloning')} color="emerald" />
      <MenuCard icon="fa-envelope" title={t.inbox} desc="Pesan Master & Member" onClick={() => onSelect('direct-chat')} color="cyan" />
    </div>

    {isAdmin && (
      <div className="space-y-6 pt-12 pb-24">
        <div className="flex items-center gap-6">
          <span className="h-px bg-red-500/20 flex-1"></span>
          <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em]">KONTROL MASTER ADMIN</p>
          <span className="h-px bg-red-500/20 flex-1"></span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MenuCard icon="fa-user-gear" title={t.members} onClick={() => onSelect('members')} color="red" />
          <MenuCard icon="fa-server" title={t.logs} onClick={() => onSelect('logs')} color="red" />
          <MenuCard icon="fa-database" title={t.storage} onClick={() => onSelect('storage')} color="red" />
          <MenuCard icon="fa-tags" title={t.priceCenter} onClick={() => onSelect('price-center')} color="red" />
        </div>
      </div>
    )}
  </div>
);

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userCredits, setUserCredits] = useState(0);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<Feature>('menu');
  const [lang] = useState<Lang>('id');

  const isAdmin = useMemo(() => userEmail ? checkAdmin(userEmail.toLowerCase()) : false, [userEmail]);

  const refreshUserData = useCallback(async (emailToUse?: string) => {
    const email = emailToUse || userEmail;
    if (email) {
      if (checkAdmin(email)) { 
        setUserCredits(999999); 
        setExpiryDate(null); 
        return; 
      }
      const { data } = await supabase.from('members').select('credits, valid_until').eq('email', email.toLowerCase()).single();
      if (data) { 
        setUserCredits(data.credits || 0); 
        setExpiryDate(data.valid_until || null); 
      }
    }
  }, [userEmail]);

  // Sync session on mount (Avoid logout on refresh)
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setIsLoggedIn(true);
        refreshUserData(session.user.email);
      }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.email) {
        setUserEmail(session.user.email);
        setIsLoggedIn(true);
        refreshUserData(session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setUserEmail('');
        setActiveFeature('menu');
      }
    });
    return () => subscription.unsubscribe();
  }, [refreshUserData]);

  useEffect(() => {
    if (isLoggedIn && userEmail) {
      updatePresence(userEmail);
      const heartbeat = setInterval(() => { updatePresence(userEmail); refreshUserData(); }, 30000);
      return () => clearInterval(heartbeat);
    }
  }, [isLoggedIn, userEmail, refreshUserData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserEmail('');
    setActiveFeature('menu');
  };

  const translations = {
    id: { 
      home: "BERANDA", aiAssistant: "ASISTEN AI", visualArt: "GAMBAR", aspectRatio: "RASIO", voice: "SUARA", video: "VIDEO", studio: "STUDIO IKLAN", storyboardToVid: "CERITA", videoDirector: "SUTRADARA", inbox: "PESAN", members: "PENGGUNA", logs: "LOGS", storage: "DATA", priceCenter: "HARGA", logout: "KELUAR", profile: "PROFIL"
    }
  }['id'];

  return (
    <div className="h-screen w-full bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col relative">
      <div className="scan-line"></div>
      
      <AnimatePresence mode="wait">
        {showIntro ? (
          <StartAnimation key="intro" onComplete={() => setShowIntro(false)} />
        ) : !isLoggedIn ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full w-full flex flex-col items-center justify-center overflow-y-auto no-scrollbar py-10 px-6">
            <LandingHero />
            <div className="mt-8 mb-10">
              <SloganAnimation />
            </div>
            <div className="w-full max-w-md">
              <LoginForm onSuccess={(e) => { setUserEmail(e); setIsLoggedIn(true); }} lang={lang} />
            </div>
            <div className="mt-12 w-full max-w-4xl">
              <ProductSlider lang={lang} />
            </div>
            <p className="mt-10 text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Copyright by Satmoko • Node_v7.8</p>
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-screen overflow-hidden bg-[#020617] relative">
             {/* Sidebar Tetap (Desktop) */}
             <aside className="hidden lg:flex flex-col w-[300px] bg-[#0b0f1a] border-r border-white/5 py-10 px-6 flex-shrink-0 z-50">
                <div className="flex items-center gap-4 mb-16 px-2">
                  <div onClick={() => setActiveFeature('menu')} className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center text-black shadow-lg cursor-pointer transition-all active:scale-95 shadow-cyan-500/20"><i className="fa-solid fa-bolt-lightning text-xl"></i></div>
                  <div>
                    <p className="text-xs font-black uppercase text-white tracking-widest leading-none">SATMOKO</p>
                    <p className="text-[8px] font-black uppercase text-cyan-400 tracking-[0.4em] mt-2">MASTER_HUB</p>
                  </div>
                </div>
                
                <nav className="flex-1 flex flex-col gap-2">
                  <SideIcon active={activeFeature === 'menu'} icon="fa-house" onClick={() => setActiveFeature('menu')} label="BERANDA" />
                  <SideIcon active={activeFeature === 'chat'} icon="fa-brain" onClick={() => setActiveFeature('chat')} label="ASISTEN AI" />
                  <SideIcon active={activeFeature === 'profile'} icon="fa-user-shield" onClick={() => setActiveFeature('profile')} label="PROFIL" />
                </nav>

                <div className="mt-auto pt-6 border-t border-white/5">
                  <button 
                    onClick={handleLogout}
                    className="w-full py-4 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-widest"
                  >
                    <i className="fa-solid fa-power-off"></i> KELUAR SISTEM
                  </button>
                </div>
             </aside>

             <main className="flex-1 overflow-y-auto no-scrollbar relative px-4 lg:px-12 py-6 lg:py-10 pb-48 lg:pb-10">
                <div className="max-w-[1400px] mx-auto h-full">
                  <AnimatePresence mode="wait">
                    <motion.div key={activeFeature} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
                      {(() => {
                        const props = { onBack: () => setActiveFeature('menu'), lang, userEmail, credits: userCredits, validUntil: expiryDate, refreshCredits: refreshUserData };
                        switch (activeFeature) {
                          case 'chat': return <ChatAssistant {...props} />;
                          case 'img2vid': return <VideoGenerator mode="img2vid" {...props} />;
                          case 'txt2img': return <ImageGenerator {...props} />;
                          case 'aspect-ratio': return <AspectRatioEditor {...props} />;
                          case 'studio': return <StudioCreator {...props} />;
                          case 'storyboard-to-video': return <StoryboardToVideo {...props} />;
                          case 'voice-cloning': return <VoiceCloning {...props} />;
                          case 'video-director': return <VideoDirector {...props} />;
                          case 'members': return <MemberControl {...props} />;
                          case 'logs': return <SystemLogs {...props} />;
                          case 'storage': return <StorageManager {...props} />;
                          case 'price-center': return <PriceManager {...props} />;
                          case 'direct-chat': return <DirectChat isAdmin={isAdmin} adminEmail="pringgosatmoko@gmail.com" {...props} />;
                          case 'profile': return <ProfileSettings {...props} />;
                          case 'topup': return <TopupCenter {...props} />;
                          default: return <DashboardMenu onSelect={setActiveFeature} isAdmin={isAdmin} t={translations} credits={userCredits} />;
                        }
                      })()}
                    </motion.div>
                  </AnimatePresence>
                </div>
             </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
