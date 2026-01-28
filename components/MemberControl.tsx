
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isUserOnline, approveTopup, manualUpdateCredits, updateMemberStatus, deleteMember } from '../lib/api';

interface Member {
  id: string | number;
  email: string;
  full_name?: string;
  status: 'active' | 'inactive' | 'pending';
  valid_until?: string | null;
  created_at: string;
  last_seen?: string | null;
  credits: number;
}

interface TopupRequest {
  id: number;
  tid: string;
  email: string;
  amount: number;
  price: number;
  receipt_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface MemberControlProps {
  onBack: () => void;
  lang: 'id' | 'en';
}

export const MemberControl: React.FC<MemberControlProps> = ({ onBack, lang }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'topup' | 'engine'>('members');
  const [memberFilter, setMemberFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newCreditValue, setNewCreditValue] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    refreshData();
    const timer = setInterval(refreshData, 20000);
    return () => clearInterval(timer);
  }, []);

  const refreshData = async () => {
    try {
      const { data: mems } = await supabase.from('members').select('*');
      const { data: reqs } = await supabase.from('topup_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      
      if (mems) setMembers([...mems].sort((a, b) => new Date(b.last_seen || 0).getTime() - new Date(a.last_seen || 0).getTime()));
      if (reqs) setRequests(reqs);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveMember = async (email: string) => {
    if (!confirm(`AKTIFKAN AKSES: Setujui akun ${email} untuk masuk sistem Master?`)) return;
    setIsProcessing(true);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const success = await updateMemberStatus(email, 'active', expiry.toISOString());
    if (success) refreshData();
    setIsProcessing(false);
  };

  const handleExtendMember = async (email: string, currentExpiry?: string | null) => {
    if (!confirm(`PERPANJANG: Tambah 30 hari masa aktif untuk ${email}?`)) return;
    setIsProcessing(true);
    const baseDate = currentExpiry ? new Date(currentExpiry) : new Date();
    baseDate.setDate(baseDate.getDate() + 30);
    const success = await updateMemberStatus(email, 'active', baseDate.toISOString());
    if (success) refreshData();
    setIsProcessing(false);
  };

  const handleToggleStatus = async (email: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (!confirm(`UBAH STATUS: Ganti akses ${email} menjadi ${newStatus}?`)) return;
    setIsProcessing(true);
    const success = await updateMemberStatus(email, newStatus);
    if (success) refreshData();
    setIsProcessing(false);
  };

  const handleDeleteMember = async (email: string) => {
    if (!confirm(`HAPUS PERMANEN: Hapus seluruh data ${email} dari database Master? Tindakan ini tidak bisa dibatalkan.`)) return;
    setIsProcessing(true);
    const success = await deleteMember(email);
    if (success) refreshData();
    setIsProcessing(false);
  };

  const handleApproveTopup = async (req: TopupRequest) => {
    if (!confirm(`APPROVE TOPUP: Tambahkan ${req.amount} CR ke akun ${req.email}?`)) return;
    setIsProcessing(true);
    const success = await approveTopup(req.id, req.email, req.amount);
    if (success) refreshData();
    setIsProcessing(false);
  };

  const handleManualCredit = async () => {
    if (!editingMember) return;
    setIsProcessing(true);
    const success = await manualUpdateCredits(editingMember.email, newCreditValue);
    if (success) {
      setEditingMember(null);
      refreshData();
    }
    setIsProcessing(false);
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (m.full_name && m.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = memberFilter === 'all' || m.status === memberFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-2 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shadow-xl active:scale-95">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none">Admin <span className="text-cyan-500">Master</span></h2>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600 mt-2">Member Control v7.8</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
            <button onClick={() => setActiveTab('members')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'members' ? 'bg-cyan-500 text-black' : 'text-slate-600'}`}>PENGGUNA</button>
            <button onClick={() => setActiveTab('topup')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all relative ${activeTab === 'topup' ? 'bg-red-500 text-white' : 'text-slate-600'}`}>
              REQUES {requests.length > 0 && <span className="ml-2 bg-white text-red-500 px-1.5 rounded-md text-[8px]">{requests.length}</span>}
            </button>
            <button onClick={() => setActiveTab('engine')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'engine' ? 'bg-yellow-500 text-black' : 'text-slate-600'}`}>ENGINE</button>
          </div>
        </div>
      </div>

      {activeTab === 'members' && (
        <div className="flex flex-col md:flex-row gap-4 mb-8 px-2 flex-shrink-0">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 text-xs"></i>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Cari email atau nama member..." 
              className="w-full bg-black/30 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-[11px] text-white outline-none focus:border-cyan-500/30 transition-all font-bold placeholder:text-slate-800" 
            />
          </div>
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 gap-1 overflow-x-auto no-scrollbar">
            {['all', 'active', 'pending', 'inactive'].map(f => (
              <button 
                key={f} 
                onClick={() => setMemberFilter(f as any)} 
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${memberFilter === f ? 'bg-white/10 text-white shadow-xl' : 'text-slate-600'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-32">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-20">
            <i className="fa-solid fa-database fa-spin text-4xl mb-6"></i>
            <p className="text-[10px] font-black uppercase tracking-[0.5em]">Synchronizing Master Data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'members' ? (
              <motion.div key="mem" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {filteredMembers.map(m => (
                   <motion.div 
                     layout
                     key={m.id} 
                     className={`glass-panel p-6 rounded-[2.5rem] bg-[#0d1117] border-2 flex flex-col gap-6 relative transition-all group ${m.status === 'pending' ? 'border-yellow-500/20' : m.status === 'inactive' ? 'border-red-500/20 grayscale' : 'border-white/5 hover:border-cyan-500/40 shadow-2xl'}`}
                   >
                      <div className="flex items-start justify-between">
                         <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black border-2 text-sm ${isUserOnline(m.last_seen) ? 'border-green-500 text-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-white/5 text-slate-700 bg-black/40'}`}>
                               {m.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                               <p className="text-[12px] font-black text-white truncate uppercase tracking-tighter italic">{m.full_name || 'MEMBER'}</p>
                               <p className="text-[9px] text-slate-600 truncate lowercase font-bold">{m.email}</p>
                            </div>
                         </div>
                         <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${m.status === 'active' ? 'bg-green-500 text-black' : m.status === 'pending' ? 'bg-yellow-500 text-black animate-pulse' : 'bg-red-500 text-white'}`}>
                           {m.status}
                         </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                         <div>
                            <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-1">KREDIT</p>
                            <p className="text-sm font-black text-cyan-400 italic">{(m.credits || 0).toLocaleString()} <span className="text-[8px] not-italic opacity-40">CR</span></p>
                         </div>
                         <div className="text-right">
                            <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-1">EXPIRE</p>
                            <p className="text-[10px] font-bold text-slate-400">{m.valid_until ? new Date(m.valid_until).toLocaleDateString() : 'N/A'}</p>
                         </div>
                      </div>

                      <div className="flex flex-col gap-3">
                         <div className="flex gap-2">
                            {m.status === 'pending' ? (
                              <button onClick={() => handleApproveMember(m.email)} className="flex-1 py-4 rounded-2xl bg-white text-black text-[9px] font-black uppercase flex items-center justify-center gap-2 shadow-xl hover:bg-cyan-500 transition-all active:scale-95">
                                <i className="fa-solid fa-check"></i> APPROVE
                              </button>
                            ) : (
                              <>
                                <button onClick={() => handleExtendMember(m.email, m.valid_until)} className="flex-1 py-3 rounded-2xl bg-cyan-600 text-white text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-white hover:text-cyan-600 transition-all active:scale-95">
                                  <i className="fa-solid fa-calendar-plus"></i> EXTEND
                                </button>
                                <button onClick={() => { setEditingMember(m); setNewCreditValue(m.credits || 0); }} className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95">
                                  <i className="fa-solid fa-pen"></i> KOREKSI
                                </button>
                              </>
                            )}
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => handleToggleStatus(m.email, m.status)} className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-95 ${m.status === 'active' ? 'bg-yellow-600/10 text-yellow-500 border border-yellow-500/20' : 'bg-green-600/10 text-green-500 border border-green-500/20'}`}>
                               <i className={`fa-solid ${m.status === 'active' ? 'fa-lock' : 'fa-unlock'}`}></i> {m.status === 'active' ? 'SUSPEND' : 'ACTIVATE'}
                            </button>
                            <button onClick={() => handleDeleteMember(m.email)} className="px-5 py-3 rounded-2xl bg-red-900/10 border border-red-900/20 text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-95">
                               <i className="fa-solid fa-trash-can"></i>
                            </button>
                         </div>
                      </div>
                   </motion.div>
                 ))}
              </motion.div>
            ) : (
               <div className="py-20 text-center opacity-20"><p className="text-xl font-black uppercase tracking-[1em]">Modul Standby</p></div>
            )}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-10 rounded-[3rem] bg-[#0d1117] border border-white/10 max-w-sm w-full space-y-8 shadow-2xl">
                <div className="text-center">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Correction Protocol</p>
                   <h3 className="text-xs font-black text-cyan-400 uppercase italic">{editingMember.email}</h3>
                </div>
                <input 
                   type="number" 
                   value={newCreditValue} 
                   onChange={e => setNewCreditValue(parseInt(e.target.value) || 0)} 
                   className="w-full bg-black/60 border border-white/10 rounded-3xl py-6 px-8 text-3xl font-black italic text-white text-center focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner" 
                />
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => setEditingMember(null)} className="py-4 bg-white/5 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">BATAL</button>
                   <button onClick={handleManualCredit} disabled={isProcessing} className="py-4 bg-cyan-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95">SIMPAN</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
