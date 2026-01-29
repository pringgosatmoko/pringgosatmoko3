import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isAdmin, getAdminPassword, sendTelegramNotification } from '../lib/api';

interface LoginFormProps { 
  onSuccess: (email: string, expiry?: string | null) => void;
  lang: 'id' | 'en';
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, lang }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('FREE'); 
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const plans = [
    { label: 'FREE', price: '0', credits: 100 },
    { label: '1B', price: '100k', credits: 1000 },
    { label: '3B', price: '250k', credits: 3500 },
    { label: '1T', price: '900k', credits: 15000 }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegister) {
        // Proses Registrasi Baru
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (authError) throw authError;

        const pkg = plans.find(p => p.label === selectedPlan);
        const initialStatus = selectedPlan === 'FREE' ? 'active' : 'pending';
        const expiry = selectedPlan === 'FREE' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;

        const { error: dbError } = await supabase.from('members').insert([{ 
          email: email.toLowerCase(), 
          status: initialStatus, 
          full_name: `${fullName} (${selectedPlan})`,
          credits: pkg?.credits || 0,
          valid_until: expiry
        }]);
        if (dbError) throw dbError;

        sendTelegramNotification(`🆕 *REGISTRASI*\nNama: ${fullName}\nEmail: ${email}\nPaket: ${selectedPlan}\nStatus: ${initialStatus.toUpperCase()}`);
        
        setSuccessMsg(selectedPlan === 'FREE' 
          ? "BERHASIL! Akun FREE aktif + 100 CR. Silakan login." 
          : "PENDAFTARAN DITERIMA! Menunggu aktivasi Admin. Hubungi WA Master untuk konfirmasi.");
      } else {
        // Proses Login
        if (isAdmin(email) && password === getAdminPassword()) {
          onSuccess(email, null);
          return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;

        const { data: member, error: memError } = await supabase.from('members').select('*').eq('email', email.toLowerCase()).single();
        if (memError || !member || member.status !== 'active') {
          await supabase.auth.signOut();
          throw new Error("AKSES DITOLAK: Akun belum aktif/disetujui Admin.");
        }
        onSuccess(email, member.valid_until);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full glass-panel p-8 rounded-[2.5rem] bg-black/60 border border-white/5 shadow-2xl relative overflow-hidden">
      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] text-center mb-6">
        {isRegister ? "GATEWAY REGISTRASI" : "GATEWAY LOGIN"}
      </h2>

      <AnimatePresence mode="wait">
        {successMsg ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest leading-relaxed">{successMsg}</p>
            <button onClick={() => { setSuccessMsg(''); setIsRegister(false); }} className="w-full py-4 rounded-xl bg-white text-black font-black uppercase text-[10px] tracking-widest">KEMBALI KE LOGIN</button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <input type="text" required placeholder="NAMA LENGKAP" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-5 text-white text-[11px] font-bold outline-none focus:border-cyan-500/30" />
                <div className="grid grid-cols-4 gap-2">
                  {plans.map(p => (
                    <button key={p.label} type="button" onClick={() => setSelectedPlan(p.label)} className={`py-2 rounded-xl text-[8px] font-black border transition-all ${selectedPlan === p.label ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 text-slate-600 border-white/5'}`}>
                      {p.label}<br/>{p.price}
                    </button>
                  ))}
                </div>
              </>
            )}
            <input type="email" required placeholder="EMAIL" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-5 text-white text-[11px] font-bold outline-none focus:border-cyan-500/30" />
            <input type="password" required placeholder="PASSWORD" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-5 text-white text-[11px] font-bold outline-none focus:border-cyan-500/30" />
            
            {error && <p className="text-[9px] text-red-500 font-black uppercase text-center">{error}</p>}

            <button type="submit" disabled={isLoading} className="w-full py-5 bg-white text-black font-black uppercase rounded-2xl text-[10px] tracking-widest hover:bg-cyan-500 transition-all shadow-xl active:scale-95">
              {isLoading ? "PROSES..." : (isRegister ? "DAFTAR SEKARANG" : "MASUK KE HUB")}
            </button>
            
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="w-full text-[8px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors">
              {isRegister ? "SUDAH PUNYA AKUN? LOGIN" : "BELUM PUNYA AKUN? DAFTAR"}
            </button>
          </form>
        )}
      </AnimatePresence>
    </div>
  );
};