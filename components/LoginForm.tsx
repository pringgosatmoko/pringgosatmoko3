
import React, { useState } from 'react';
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

    const emailLower = email.toLowerCase().trim();

    try {
      if (isRegister) {
        // Proses Registrasi
        const { error: authError } = await supabase.auth.signUp({
          email: emailLower,
          password,
          options: { data: { full_name: fullName } }
        });
        if (authError) throw authError;

        const pkg = plans.find(p => p.label === selectedPlan);
        const expiry = selectedPlan === 'FREE' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;

        const { error: dbError } = await supabase.from('members').insert([{ 
          email: emailLower, 
          status: selectedPlan === 'FREE' ? 'active' : 'pending', 
          full_name: `${fullName} (${selectedPlan})`,
          credits: pkg?.credits || 0,
          valid_until: expiry
        }]);
        if (dbError) throw dbError;

        sendTelegramNotification(`🆕 *REGISTRASI*\nEmail: ${emailLower}\nPaket: ${selectedPlan}`);
        setSuccessMsg(selectedPlan === 'FREE' ? "Akun FREE Aktif!" : "Pendaftaran Berhasil! Hubungi Admin.");
      } else {
        // BYPASS ADMIN PROTOCOL - Cek ini sebelum Supabase
        if (isAdmin(emailLower) && password === getAdminPassword()) {
          onSuccess(emailLower, null);
          return;
        }

        // Supabase Auth
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: emailLower, password });
        if (loginError) {
          if (loginError.message.includes('API key')) {
             throw new Error("DATABASE OFFLINE: Gunakan Akses Admin Master.");
          }
          throw loginError;
        }

        const { data: member, error: memError } = await supabase.from('members').select('*').eq('email', emailLower).single();
        if (memError || !member) throw new Error("Akun tidak ditemukan di database.");
        if (member.status !== 'active') throw new Error("Akun masih pending/inactive.");

        onSuccess(emailLower, member.valid_until);
      }
    } catch (err: any) {
      setError(err.message?.toUpperCase() || "ERROR TRANSAKSI");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full glass-panel p-8 rounded-[2.5rem] bg-black/40 border border-white/5 shadow-2xl relative overflow-hidden">
      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] text-center mb-6">
        {isRegister ? "GATEWAY REGISTRASI" : "GATEWAY LOGIN"}
      </h2>

      <AnimatePresence mode="wait">
        {successMsg ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{successMsg}</p>
            <button onClick={() => { setSuccessMsg(''); setIsRegister(false); }} className="w-full py-4 rounded-xl bg-white text-black font-black uppercase text-[10px]">KEMBALI KE LOGIN</button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <input type="text" required placeholder="NAMA LENGKAP" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-5 text-white text-[11px] font-bold outline-none" />
            )}
            <input type="email" required placeholder="EMAIL ADDRESS" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-5 text-white text-[11px] font-bold outline-none focus:border-cyan-500/30 transition-all" />
            <input type="password" required placeholder="MASTER PASSWORD" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-5 text-white text-[11px] font-bold outline-none focus:border-cyan-500/30 transition-all" />
            
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-500/10 border border-red-500/20 py-3 rounded-xl px-4">
                  <p className="text-[9px] text-red-500 font-black uppercase text-center leading-relaxed italic">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={isLoading} className="w-full py-5 bg-white text-black font-black uppercase rounded-2xl text-[10px] tracking-widest hover:bg-cyan-500 transition-all shadow-xl active:scale-95 disabled:opacity-20">
              {isLoading ? "AUTHENTICATING..." : "MASUK KE HUB"}
            </button>
            
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="w-full text-[8px] font-black text-slate-700 uppercase tracking-widest hover:text-white transition-colors py-2">
              {isRegister ? "SUDAH PUNYA AKSES? LOGIN" : "BELUM PUNYA AKSES? REGISTRASI BARU"}
            </button>
          </form>
        )}
      </AnimatePresence>
    </div>
  );
};
