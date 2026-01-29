
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
import { ProductSlider } from './components/ProductSlider';
import { VideoDirector } from './components/VideoDirector';
import { AspectRatioEditor } from './components/AspectRatioEditor';
import { TopupCenter } from './components/TopupCenter';
import { motion, AnimatePresence } from 'framer-motion';
import { isAdmin as checkAdmin, updatePresence, supabase } from './lib/api';

export type Feature = 'menu' | 'chat' | 'img2vid' | 'txt2img' | 'studio' | 'storyboard-to-video' | 'voice-cloning' | 'members' | 'logs' | 'direct-chat' | 'profile' | 'storage' | 'price-center' | 'video-director' | 'aspect-ratio' | 'topup';
export type Lang = 'id' | 'en';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userCredits, setUserCredits] = useState(0);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<Feature>('menu');
  const [lang] = useState<Lang>('id');
  const [apiKeySelected, setApiKeySelected] = useState(false);

  // Requirement check for specialized models
  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setApiKeySelected(hasKey);
        } else {
          setApiKeySelected(true); // Default to true if not in AI Studio environment
        }
      } catch (e) {
        setApiKeySelected(true);
      }
    };
    checkKey();
  }, []);

  const handleOpenSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setApiKeySelected(true);
    }
  };

  const isAdmin = useMemo(() => userEmail ? checkAdmin(userEmail.toLowerCase()) : false, [userEmail]);

  const refreshUserData = useCallback(async (emailToUse?: string) => {
    const email = emailToUse || userEmail;
    if (email) {
      if (checkAdmin(email)) { 
        setUserCredits(999999); 
        setExpiryDate(null); 
        return; 
      }
      try {
        const { data } = await supabase.from('members').select('credits, valid_until').eq('email', email.toLowerCase()).single();
        if (data) { 
          setUserCredits(data.credits || 0); 
          setExpiryDate(data.valid_until || null); 
        }
      } catch (e) {}
    }
  }, [userEmail]);

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

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500/30 flex flex-col relative overflow-x-hidden">
      <div className="scan-line"></div>
      
      <AnimatePresence mode="wait">
        {!apiKeySelected ? (
          <motion.div key="apikey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#020617] p-6 text-center">
            <div className="glass-panel p-10 rounded-[3rem] border border-cyan-500/30 max-w-md w-full space-y-8">
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto text-cyan-400 text-3xl">
                <i className="fa-solid fa-key"></i>
              </div>
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">API KEY <span className="text-cyan-400">REQUIRED</span></h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Pilih API Key Master dari proyek Google Cloud berbayar untuk akses penuh fitur Pro.
              </p>
              <button onClick={handleOpenSelectKey} className="w-full py-5 bg-cyan-500 text-black font-black uppercase rounded-2xl shadow-xl transition-all tracking-widest text-[10px]">
                PILIH API KEY SEKARANG
              </button>
            </div>
          </motion.div>
        ) : showIntro ? (
          <StartAnimation key="intro" onComplete={() => setShowIntro(false)} />
        ) : !isLoggedIn ? (
          <motion.div 
            key="landing" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="min-h-screen w-full flex flex-col items-center justify-start overflow-y-auto no-scrollbar py-12 px-6"
          >
            {/* Animasi Robot sebagai Header Utama */}
            <div className="mb-8 scale-110 md:scale-125">
              <LandingHero />
            </div>

            {/* Slogan Interaktif */}
            <div className="mb-12">
              <SloganAnimation />
            </div>

            {/* Menu Login di Bawah Animasi */}
            <div className="w-full max-w-md">
              <LoginForm onSuccess={(e) => { setUserEmail(e); setIsLoggedIn(true); }} lang={lang} />
            </div>

            {/* Informasi Produk Slider */}
            <div className="mt-16 w-full max-w-4xl">
              <ProductSlider lang={lang} />
            </div>

            <p className="mt-16 text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Satmoko Studio • Engine_v7.8_Deployed</p>
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-screen overflow-hidden bg-[#020617] relative">
             {/* Konten Dashboard (Sidebar & Main) tetap sama untuk fungsionalitas */}
             <aside className="hidden lg:flex flex-col w-[300px] bg-[#0b0f1a] border-r border-white/5 py-10 px-6 flex-shrink-0 z-50">
                <div className="flex items-center gap-4 mb-16 px-2">
                  <div onClick={() => setActiveFeature('menu')} className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center text-black shadow-lg cursor-pointer transition-all active:scale-95 shadow-cyan-500/20"><i className="fa-solid fa-bolt-lightning text-xl"></i></div>
                  <div>
                    <p className="text-xs font-black uppercase text-white tracking-widest leading-none">SATMOKO</p>
                    <p className="text-[8px] font-black uppercase text-cyan-400 tracking-[0.4em] mt-2">MASTER_HUB</p>
                  </div>
                </div>
                <nav className="flex-1 flex flex-col gap-2">
                  <button onClick={() => setActiveFeature('menu')} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeFeature === 'menu' ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-white'}`}>
                    <i className="fa-solid fa-house"></i> <span className="text-[10px] font-black uppercase">BERANDA</span>
                  </button>
                  <button onClick={() => setActiveFeature('chat')} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeFeature === 'chat' ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-white'}`}>
                    <i className="fa-solid fa-brain"></i> <span className="text-[10px] font-black uppercase">ASISTEN AI</span>
                  </button>
                  <button onClick={() => setActiveFeature('profile')} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeFeature === 'profile' ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-white'}`}>
                    <i className="fa-solid fa-user-shield"></i> <span className="text-[10px] font-black uppercase">PROFIL</span>
                  </button>
                </nav>
                <div className="mt-auto pt-6 border-t border-white/5">
                  <button onClick={() => supabase.auth.signOut()} className="w-full py-4 rounded-2xl bg-red-600/10 text-red-500 border border-red-600/20 text-[9px] font-black uppercase tracking-widest">KELUAR</button>
                </div>
             </aside>

             <main className="flex-1 overflow-y-auto no-scrollbar relative px-6 lg:px-12 py-10">
                <AnimatePresence mode="wait">
                  <motion.div key={activeFeature} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
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
                        case 'profile': return <ProfileSettings {...props} />;
                        case 'topup': return <TopupCenter {...props} />;
                        default: return (
                          <div className="max-w-7xl mx-auto space-y-12">
                             <div className="flex justify-between items-end border-b border-white/5 pb-10">
                                <h1 className="text-4xl font-black italic text-white uppercase tracking-tighter">Creative <span className="text-cyan-400">Hub</span></h1>
                                <div className="text-right">
                                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">SALDO KREDIT</p>
                                   <p className="text-2xl font-black text-cyan-400 italic">{userCredits.toLocaleString()} CR</p>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                <button onClick={() => setActiveFeature('chat')} className="glass-panel p-8 rounded-[2.5rem] text-left space-y-4 hover:border-cyan-500 transition-all">
                                   <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400"><i className="fa-solid fa-brain"></i></div>
                                   <h3 className="text-xs font-black uppercase text-white">ASISTEN AI</h3>
                                </button>
                                <button onClick={() => setActiveFeature('txt2img')} className="glass-panel p-8 rounded-[2.5rem] text-left space-y-4 hover:border-fuchsia-500 transition-all">
                                   <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400"><i className="fa-solid fa-image"></i></div>
                                   <h3 className="text-xs font-black uppercase text-white">GAMBAR 4K</h3>
                                </button>
                                <button onClick={() => setActiveFeature('img2vid')} className="glass-panel p-8 rounded-[2.5rem] text-left space-y-4 hover:border-cyan-500 transition-all">
                                   <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400"><i className="fa-solid fa-video"></i></div>
                                   <h3 className="text-xs font-black uppercase text-white">VIDEO VEO</h3>
                                </button>
                                <button onClick={() => setActiveFeature('topup')} className="glass-panel p-8 rounded-[2.5rem] text-left space-y-4 hover:border-yellow-500 transition-all">
                                   <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-400"><i className="fa-solid fa-wallet"></i></div>
                                   <h3 className="text-xs font-black uppercase text-white">ISI SALDO</h3>
                                </button>
                             </div>
                          </div>
                        );
                      }
                    })()}
                  </motion.div>
                </AnimatePresence>
             </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
