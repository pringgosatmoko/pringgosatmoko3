
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
import { DirectChat } from './components/DirectChat';
import { TopupCenter } from './components/TopupCenter';
import { StoryboardToVideo } from './components/StoryboardToVideo';
import { VideoDirector } from './components/VideoDirector';
import { AspectRatioEditor } from './components/AspectRatioEditor';
import { motion, AnimatePresence } from 'framer-motion';
import { isAdmin as checkAdmin, supabase } from './lib/api';

export type Feature = 'menu' | 'chat' | 'p2p' | 'img2vid' | 'txt2img' | 'studio' | 'voice-cloning' | 'members' | 'logs' | 'profile' | 'topup' | 'storyboard-video' | 'video-director' | 'aspect-ratio';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userCredits, setUserCredits] = useState(0);
  const [activeFeature, setActiveFeature] = useState<Feature>('menu');

  const refreshUserData = useCallback(async (emailToUse?: string) => {
    const email = emailToUse || userEmail;
    if (email) {
      if (checkAdmin(email)) { setUserCredits(999999); return; }
      try {
        const { data } = await supabase.from('members').select('credits').eq('email', email.toLowerCase()).single();
        if (data) setUserCredits(data.credits || 0);
      } catch (e) { console.error("DB Error:", e); }
    }
  }, [userEmail]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setIsLoggedIn(true);
        refreshUserData(session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
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

  const isAdmin = useMemo(() => checkAdmin(userEmail), [userEmail]);

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans overflow-x-hidden selection:bg-cyan-500/30">
      <AnimatePresence mode="wait">
        {showIntro ? (
          <StartAnimation key="intro" onComplete={() => setShowIntro(false)} />
        ) : !isLoggedIn ? (
          <motion.div 
            key="login-screen"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center py-12 px-6 overflow-y-auto no-scrollbar bg-[radial-gradient(circle_at_50%_20%,#0f172a_0%,#000000_100%)]"
          >
            <LandingHero />
            <div className="mt-4 mb-10"><SloganAnimation /></div>
            
            {/* Form Login Utama */}
            <div className="w-full max-w-md z-20">
              <LoginForm 
                onSuccess={(email) => { 
                  setUserEmail(email); 
                  setIsLoggedIn(true); 
                }} 
                lang="id" 
              />
            </div>

            <div className="mt-12 w-full max-w-4xl"><ProductSlider lang="id" /></div>
            <p className="mt-16 text-[8px] font-black text-slate-900 uppercase tracking-[0.6em] mb-10">SATMOKO_STUDIO • PRODUCTION_CORE_V7.8</p>
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-screen overflow-hidden bg-[#020617]"
          >
            <aside className="hidden lg:flex flex-col w-[280px] bg-[#0b0f1a] border-r border-white/5 py-10 px-6 flex-shrink-0 shadow-2xl">
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
                 <SidebarLink icon="fa-comments" label="P2P CHAT" active={activeFeature === 'p2p'} onClick={() => setActiveFeature('p2p')} />
                 <SidebarLink icon="fa-brain" label="AI LOGIC" active={activeFeature === 'chat'} onClick={() => setActiveFeature('chat')} />
                 <SidebarLink icon="fa-user-shield" label="PROFILE" active={activeFeature === 'profile'} onClick={() => setActiveFeature('profile')} />
                 {isAdmin && (
                   <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">ADMIN PANEL</p>
                     <SidebarLink icon="fa-users-gear" label="MEMBERS" color="yellow" active={activeFeature === 'members'} onClick={() => setActiveFeature('members')} />
                     <SidebarLink icon="fa-terminal" label="CONSOLE" color="cyan" active={activeFeature === 'logs'} onClick={() => setActiveFeature('logs')} />
                   </div>
                 )}
               </nav>
               <button onClick={() => supabase.auth.signOut()} className="mt-auto w-full py-4 rounded-xl bg-red-600/10 text-red-500 border border-red-600/20 text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">KELUAR</button>
            </aside>

            <main className="flex-1 overflow-y-auto no-scrollbar relative px-6 lg:px-12 py-10 bg-[#020617]">
              <AnimatePresence mode="wait">
                <motion.div key={activeFeature} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="h-full">
                  {(() => {
                    const props = { onBack: () => setActiveFeature('menu'), lang: 'id' as any, userEmail, credits: userCredits, refreshCredits: refreshUserData, isAdmin, adminEmail: 'pringgosatmoko@gmail.com' };
                    switch (activeFeature) {
                      case 'chat': return <ChatAssistant {...props} />;
                      case 'p2p': return <DirectChat {...props} />;
                      case 'txt2img': return <ImageGenerator {...props} />;
                      case 'img2vid': return <VideoGenerator mode="img2vid" {...props} />;
                      case 'storyboard-video': return <StoryboardToVideo {...props} />;
                      case 'video-director': return <VideoDirector {...props} />;
                      case 'aspect-ratio': return <AspectRatioEditor {...props} />;
                      case 'studio': return <StudioCreator {...props} />;
                      case 'voice-cloning': return <VoiceCloning {...props} />;
                      case 'topup': return <TopupCenter {...props} />;
                      case 'profile': return <ProfileSettings {...props} validUntil={null} />;
                      case 'members': return <MemberControl {...props} />;
                      case 'logs': return <SystemLogs {...props} />;
                      default: return (
                        <div className="max-w-7xl mx-auto space-y-12 pb-24">
                           <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-10">
                              <div>
                                <h1 className="text-4xl lg:text-5xl font-black italic text-white uppercase leading-none">CREATIVE <span className="text-cyan-400">HUB</span></h1>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em] mt-3">SATMOKO_CORE_ENGINE_v7.8</p>
                              </div>
                              <div className="glass-panel px-8 py-4 rounded-3xl border-cyan-500/20 bg-cyan-500/5 shadow-2xl">
                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">SALDO AKTIF</p>
                                 <p className="text-4xl font-black text-cyan-400 italic leading-none">{userCredits.toLocaleString()} <span className="text-xs not-italic text-slate-700 ml-1">CR</span></p>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                              <MenuCard icon="fa-comments" label="P2P CHAT" desc="Private Msg" color="purple" onClick={() => setActiveFeature('p2p')} />
                              <MenuCard icon="fa-brain" label="AI LOGIC" desc="Neural Chat" color="cyan" onClick={() => setActiveFeature('chat')} />
                              <MenuCard icon="fa-palette" label="VISUAL ART" desc="4K Rendering" color="fuchsia" onClick={() => setActiveFeature('txt2img')} />
                              <MenuCard icon="fa-video" label="VEO VIDEO" desc="Cinematic AI" color="orange" onClick={() => setActiveFeature('img2vid')} />
                              <MenuCard icon="fa-clapperboard" label="STORYBOARD" desc="Script 2 Video" color="yellow" onClick={() => setActiveFeature('storyboard-video')} />
                              <MenuCard icon="fa-film" label="DIRECTOR" desc="Long Video" color="orange" onClick={() => setActiveFeature('video-director')} />
                              <MenuCard icon="fa-microphone-lines" label="VOICE CLONE" desc="TTS Engine" color="cyan" onClick={() => setActiveFeature('voice-cloning')} />
                              <MenuCard icon="fa-wallet" label="ISI SALDO" desc="Topup Hub" color="yellow" onClick={() => setActiveFeature('topup')} />
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
  const activeClass = active ? (color === 'yellow' ? 'bg-yellow-500 text-black' : 'bg-cyan-500 text-black') : 'text-slate-500 hover:text-white hover:bg-white/5';
  return (
    <button onClick={onClick} className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${activeClass}`}>
      <i className={`fa-solid ${icon} text-base`}></i>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
};

const MenuCard = ({ icon, label, desc, color, onClick }: { icon: string, label: string, desc: string, color: string, onClick: () => void }) => {
  const colorMap: any = { cyan: 'hover:border-cyan-500/50 text-cyan-400', fuchsia: 'hover:border-fuchsia-500/50 text-fuchsia-400', orange: 'hover:border-orange-500/50 text-orange-400', yellow: 'hover:border-yellow-500/50 text-yellow-400', purple: 'hover:border-purple-500/50 text-purple-400' };
  return (
    <button onClick={onClick} className={`glass-panel p-8 rounded-[2.5rem] text-left space-y-5 transition-all active:scale-95 group shadow-xl ${colorMap[color]}`}>
       <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-black/40 group-hover:scale-110 transition-transform"><i className={`fa-solid ${icon} text-xl`}></i></div>
       <div>
         <h3 className="text-xs font-black uppercase text-white tracking-widest mb-1">{label}</h3>
         <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{desc}</p>
       </div>
    </button>
  );
};

export default App;
