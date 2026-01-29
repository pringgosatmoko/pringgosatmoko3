import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LandingHero } from './components/LandingHero';
import { LoginForm } from './components/LoginForm';
import { ChatAssistant } from './components/ChatAssistant';
import { VideoGenerator } from './components/VideoGenerator';
import { ImageGenerator } from './components/ImageGenerator';
import { StudioCreator } from './components/StudioCreator';
import { VoiceCloning } from './components/VoiceCloning';
import { MemberControl } from './components/MemberControl';
import { SystemLogs } from './components/SystemLogs';
import { ProfileSettings } from './components/ProfileSettings';
import { StartAnimation } from './components/StartAnimation';
import { SloganAnimation } from './components/SloganAnimation';
import { ProductSlider } from './components/ProductSlider';
import { AspectRatioEditor } from './components/AspectRatioEditor';
import { TopupCenter } from './components/TopupCenter';
import { PriceManager } from './components/PriceManager';
import { StorageManager } from './components/StorageManager';
import { VideoDirector } from './components/VideoDirector';
import { StoryboardToVideo } from './components/StoryboardToVideo';
import { motion, AnimatePresence } from 'framer-motion';
import { isAdmin as checkAdmin, supabase } from './lib/api';

export type Feature = 'menu' | 'chat' | 'img2vid' | 'txt2img' | 'studio' | 'voice-cloning' | 'members' | 'logs' | 'profile' | 'aspect-ratio' | 'topup' | 'pricing' | 'storage' | 'director' | 'storyboard-to-video';
export type Lang = 'id' | 'en';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userCredits, setUserCredits] = useState(0);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<Feature>('menu');
  const [lang] = useState<Lang>('id');

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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setUserEmail(session.user.email);
          setIsLoggedIn(true);
          refreshUserData(session.user.email);
        }
      } catch (e) {}
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

  const isAdmin = useMemo(() => userEmail ? checkAdmin(userEmail) : false, [userEmail]);

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500/30 flex flex-col relative overflow-x-hidden">
      <div className="scan-line opacity-10"></div>
      
      <AnimatePresence mode="wait">
        {showIntro ? (
          <StartAnimation key="intro" onComplete={() => setShowIntro(false)} />
        ) : !isLoggedIn ? (
          <motion.div 
            key="landing" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="min-h-screen w-full flex flex-col items-center justify-start py-8 px-6 overflow-y-auto no-scrollbar"
          >
            {/* Gambar Master (Logo) sebagai pusat perhatian atas */}
            <div className="mb-2 scale-90 md:scale-100 origin-center">
              <LandingHero />
            </div>
            
            {/* Slogan Interaktif */}
            <div className="mb-8">
              <SloganAnimation />
            </div>

            {/* Form Login tepat di bawah Gambar Master */}
            <div className="w-full max-w-md z-20">
              <LoginForm onSuccess={(e) => { setUserEmail(e); setIsLoggedIn(true); }} lang={lang} />
            </div>

            {/* Informasi Produk tambahan */}
            <div className="mt-12 w-full max-w-4xl">
              <ProductSlider lang={lang} />
            </div>

            <p className="mt-16 text-[8px] font-black text-slate-800 uppercase tracking-[0.6em] mb-10">SATMOKO_STUDIO • PRODUCTION_CORE_V7.8</p>
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-screen overflow-hidden bg-[#020617] relative">
             <aside className="hidden lg:flex flex-col w-[280px] bg-[#0b0f1a] border-r border-white/5 py-10 px-6 flex-shrink-0 z-50">
                <div className="flex items-center gap-4 mb-16 px-4">
                  <div onClick={() => setActiveFeature('menu')} className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center text-black shadow-lg cursor-pointer transition-all active:scale-95">
                    <i className="fa-solid fa-bolt-lightning text-xl"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-white tracking-widest leading-none">SATMOKO</p>
                    <p className="text-[8px] font-black uppercase text-cyan-400 tracking-[0.3em] mt-2 italic">MASTER_HUB</p>
                  </div>
                </div>
                
                <nav className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
                  <SidebarLink icon="fa-house" label="BERANDA" active={activeFeature === 'menu'} onClick={() => setActiveFeature('menu')} />
                  <SidebarLink icon="fa-brain" label="AI ASSISTANT" active={activeFeature === 'chat'} onClick={() => setActiveFeature('chat')} />
                  <SidebarLink icon="fa-user-shield" label="PROFILE" active={activeFeature === 'profile'} onClick={() => setActiveFeature('profile')} />
                  
                  {isAdmin && (
                    <div className="mt-8 pt-8 border-t border-white/5 space-y-2">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">ADMIN PANEL</p>
                      <SidebarLink icon="fa-users-gear" label="MEMBERS" color="yellow" active={activeFeature === 'members'} onClick={() => setActiveFeature('members')} />
                      <SidebarLink icon="fa-tags" label="PRICING" color="emerald" active={activeFeature === 'pricing'} onClick={() => setActiveFeature('pricing')} />
                      <SidebarLink icon="fa-terminal" label="SYSTEM LOGS" color="cyan" active={activeFeature === 'logs'} onClick={() => setActiveFeature('logs')} />
                      <SidebarLink icon="fa-database" label="STORAGE" color="purple" active={activeFeature === 'storage'} onClick={() => setActiveFeature('storage')} />
                    </div>
                  )}
                </nav>
                
                <div className="mt-auto pt-6 border-t border-white/5">
                  <button onClick={() => supabase.auth.signOut()} className="w-full py-4 rounded-xl bg-red-600/10 text-red-500 border border-red-600/20 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95">KELUAR</button>
                </div>
             </aside>

             <main className="flex-1 overflow-y-auto no-scrollbar relative px-6 lg:px-12 py-10">
                <AnimatePresence mode="wait">
                  <motion.div key={activeFeature} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                    {(() => {
                      const props = { onBack: () => setActiveFeature('menu'), lang, userEmail, credits: userCredits, validUntil: expiryDate, refreshCredits: refreshUserData };
                      switch (activeFeature) {
                        case 'chat': return <ChatAssistant {...props} />;
                        case 'img2vid': return <VideoGenerator mode="img2vid" {...props} />;
                        case 'director': return <VideoDirector {...props} />;
                        case 'storyboard-to-video': return <StoryboardToVideo {...props} />;
                        case 'txt2img': return <ImageGenerator {...props} />;
                        case 'aspect-ratio': return <AspectRatioEditor {...props} />;
                        case 'studio': return <StudioCreator {...props} />;
                        case 'voice-cloning': return <VoiceCloning {...props} />;
                        case 'profile': return <ProfileSettings {...props} />;
                        case 'topup': return <TopupCenter {...props} />;
                        case 'members': return <MemberControl {...props} />;
                        case 'logs': return <SystemLogs {...props} />;
                        case 'pricing': return <PriceManager {...props} />;
                        case 'storage': return <StorageManager {...props} />;
                        default: return (
                          <div className="max-w-7xl mx-auto space-y-12 pb-20">
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
                                <div>
                                  <h1 className="text-4xl lg:text-5xl font-black italic text-white uppercase tracking-tighter">CREATIVE <span className="text-cyan-400">HUB</span></h1>
                                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em] mt-3">SATMOKO_CORE_ENGINE_v7.8</p>
                                </div>
                                <div className="text-right glass-panel px-8 py-4 rounded-3xl border-cyan-500/20 bg-cyan-500/5 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
                                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">SALDO AKTIF</p>
                                   <p className="text-4xl font-black text-cyan-400 italic leading-none">{userCredits.toLocaleString()} <span className="text-xs not-italic text-slate-700 ml-1">CR</span></p>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                                <MenuCard icon="fa-brain" label="AI ASISTEN" desc="Neural Assistant" color="cyan" onClick={() => setActiveFeature('chat')} />
                                <MenuCard icon="fa-video" label="VEO VIDEO" desc="Cinematic AI" color="fuchsia" onClick={() => setActiveFeature('img2vid')} />
                                <MenuCard icon="fa-clapperboard" label="DIRECTOR" desc="Long Continuity" color="orange" onClick={() => setActiveFeature('director')} />
                                <MenuCard icon="fa-film" label="STORY MAKER" desc="Movie Pipeline" color="purple" onClick={() => setActiveFeature('storyboard-to-video')} />
                                <MenuCard icon="fa-image" label="VISUAL ART" desc="4K Rendering" color="cyan" onClick={() => setActiveFeature('txt2img')} />
                                <MenuCard icon="fa-wand-magic-sparkles" label="REFRAME" desc="AI Outpaint" color="emerald" onClick={() => setActiveFeature('aspect-ratio')} />
                                <MenuCard icon="fa-microphone-lines" label="VOICE CLONE" desc="Neural TTS" color="cyan" onClick={() => setActiveFeature('voice-cloning')} />
                                <MenuCard icon="fa-wallet" label="ISI SALDO" desc="Topup Hub" color="yellow" onClick={() => setActiveFeature('topup')} />
                             </div>
                             
                             <div className="pt-20 opacity-10 flex items-center justify-between border-t border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-[1em]">SYSTEM_STABLE</p>
                                <p className="text-[10px] font-black uppercase tracking-[1em]">SATMOKO_HUB</p>
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

const SidebarLink = ({ icon, label, active, onClick, color = 'cyan' }: { icon: string, label: string, active: boolean, onClick: () => void, color?: string }) => {
  const activeClass = color === 'cyan' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/10' : 
                      color === 'yellow' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' :
                      color === 'emerald' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' :
                      color === 'purple' ? 'bg-purple-500 text-black shadow-lg shadow-purple-500/10' : '';
  
  return (
    <button onClick={onClick} className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all group ${active ? activeClass : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
      <i className={`fa-solid ${icon} text-base`}></i>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
};

const MenuCard = ({ icon, label, desc, color, onClick }: { icon: string, label: string, desc: string, color: string, onClick: () => void }) => {
  const colorMap: any = {
    cyan: 'hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400',
    fuchsia: 'hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 text-fuchsia-400',
    yellow: 'hover:border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-400',
    emerald: 'hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400',
    purple: 'hover:border-purple-500/50 hover:bg-purple-500/10 text-purple-400',
    orange: 'hover:border-orange-500/50 hover:bg-orange-500/10 text-orange-400',
  };
  return (
    <button onClick={onClick} className={`glass-panel p-8 rounded-[2.5rem] text-left space-y-5 transition-all group active:scale-95 border border-white/5 ${colorMap[color]}`}>
       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-inner bg-black/40`}>
          <i className={`fa-solid ${icon} text-xl`}></i>
       </div>
       <div>
         <h3 className="text-xs font-black uppercase text-white tracking-widest mb-1">{label}</h3>
         <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">{desc}</p>
       </div>
    </button>
  );
};

export default App;