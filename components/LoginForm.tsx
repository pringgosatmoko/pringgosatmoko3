
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isAdmin, getAdminPassword, sendTelegramNotification } from '../lib/api';

interface LoginFormProps { 
  onSuccess: (email: string, expiry?: string | null) => void;
  lang: 'id' | 'en';
  forcedMode?: 'login' | 'register';
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, lang, forcedMode }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('1B'); 
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Update mode if forced from Navbar
  useEffect(() => {
    if (forcedMode === 'register') setIsRegister(true);
    if (forcedMode === 'login') setIsRegister(false);
  }, [forcedMode]);

  const plans = [
    { label: '1B', price: '100k', en: '1M', enPrice: '100k', credits: 1000 },
    { label: '3B', price: '250k', en: '3M', enPrice: '250k', credits: 3500 },
    { label: '1T', price: '900k', en: '1Y', enPrice: '900k', credits: 15000 }
  ];

  const t = {
    id: {
      loginTitle: "MASUK KE AKUN",
      regTitle: "DAFTAR AKUN BARU",
      name: "NAMA LENGKAP",
      email: "ALAMAT EMAIL",
      pass: "KATA SANDI",
      plan: "PILIHAN PAKET",
      submitLogin: "MASUK SEKARANG",
      submitReg: "DAFTAR SEKARANG",
      noAccount: "BELUM PUNYA AKUN? DAFTAR",
      haveAccount: "SUDAH PUNYA AKUN? MASUK",
      regSuccess: "PENDAFTARAN BERHASIL: Silakan tunggu persetujuan dari Admin.",
      contactAdmin: "HUBUNGI ADMIN",
      back: "KEMBALI"
    },
    en: {
      loginTitle: "LOGIN TO ACCOUNT",
      regTitle: "CREATE NEW ACCOUNT",
      name: "FULL NAME",
      email: "EMAIL ADDRESS",
      pass: "PASSWORD",
      plan: "SELECT PLAN",
      submitLogin: "LOGIN NOW",
      submitReg: "REGISTER NOW",
      noAccount: "NEED AN ACCOUNT? REGISTER",
      haveAccount: "HAVE AN ACCOUNT? LOGIN",
      regSuccess: "SUCCESS: Pending admin approval.",
      contactAdmin: "CONTACT ADMIN",
      back: "BACK"
    }
  }[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isRegister) {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (authError) throw authError;

        const selectedPlanData = plans.find(p => p.label === selectedPlan);
        const initialCredits = selectedPlanData ? selectedPlanData.credits : 1000;

        await supabase.from('members').insert([{ 
          email: email.toLowerCase(), 
          status: 'pending', 
          full_name: `${fullName} (${selectedPlan})`,
          credits: initialCredits 
        }]);
        
        // NOTIF TELEGRAM REGISTRASI
        sendTelegramNotification(`🆕 *USER BARU DAFTAR*\nNama: ${fullName}\nEmail: ${email}\nPaket: ${selectedPlan}\nStatus: PENDING APPROVAL`);
        
        setSuccessMsg(t.regSuccess);
      } else {
        if (isAdmin(email) && password === getAdminPassword()) {
          onSuccess(email, null);
          return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;

        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('status, valid_until')
          .eq('email', email.toLowerCase())
          .single();

        if (memberError || !memberData || memberData.status !== 'active') {
          await supabase.auth.signOut();
          throw new Error(lang === 'id' ? "AKSES DITOLAK: Akun Anda belum aktif. Hubungi Admin." : "ACCESS DENIED: Your account is not active. Contact Admin.");
        }
        onSuccess(email, memberData.valid_until);
      }
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full glass-panel p-8 rounded-[2rem] bg-black/60 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="mb-6">
          <h2 className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.4em] text-center">
            {isRegister ? t.regTitle : t.loginTitle}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] text-center font-bold uppercase">
              {error}
            </motion.div>
          )}
          
          {successMsg ? (
            <div className="space-y-6 text-center py-2">
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{successMsg}</p>
              <div className="space-y-3">
                <a href="https://wa.me/6285147007574" target="_blank" className="block w-full py-4 rounded-xl bg-cyan-500 text-black font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-cyan-500/20">{t.contactAdmin}</a>
                <button onClick={() => setSuccessMsg('')} className="text-[9px] font-bold uppercase text-slate-600 hover:text-white transition-colors">{t.back}</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {isRegister && (
                <>
                  <input type="text" required placeholder={t.name} value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-5 text-white text-[11px] font-bold outline-none focus:border-cyan-500/30 transition-all" />
                  
                  <div className="grid grid-cols-3 gap-2">
                    {plans.map(p => (
                      <button 
                        key={p.label}
                        type="button"
                        onClick={() => setSelectedPlan(p.label)}
                        className={`py-2 rounded-xl text-[9px] font-bold transition-all border ${selectedPlan === p.label ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 text-slate-500 border-white/5'}`}
                      >
                        {lang === 'id' ? p.label : p.en} ({p.price})
                      </button>
                    ))}
                  </div>
                </>
              )}
              <input type="email" required placeholder={t.email} value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-5 text-white text-[11px] font-bold outline-none focus:border-cyan-500/30 transition-all" />
              <input type="password" required placeholder={t.pass} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-5 text-white text-[11px] font-bold outline-none focus:border-cyan-500/30 transition-all" />
              
              <button type="submit" disabled={isLoading} className="w-full py-4 mt-2 rounded-xl bg-white text-black font-bold uppercase text-[10px] tracking-widest hover:bg-cyan-500 transition-all shadow-xl active:scale-95">
                {isLoading ? "Sedang Memproses..." : (isRegister ? t.submitReg : t.submitLogin)}
              </button>
            </form>
          )}
        </AnimatePresence>
      </div>

      {!successMsg && (
        <button onClick={() => setIsRegister(!isRegister)} className="mt-8 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600 hover:text-cyan-400 transition-colors">
          {isRegister ? t.haveAccount : t.noAccount}
        </button>
      )}
    </div>
  );
};
