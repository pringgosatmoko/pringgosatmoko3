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
  const [activeTab, setActiveTab] = useState<'members' | 'topup'>('members');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newCreditValue, setNewCreditValue] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const { data: mems } = await supabase.from('members').select('*').order('created_at', { ascending: false });
      const { data: reqs } = await supabase.from('topup_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      if (mems) setMembers(mems);
      if (reqs) setRequests(reqs);
    } catch (e) {
      console.error("Fetch Data Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveMember = async (email: string) => {
    setIsProcessing(true);
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1); // Tambah 30 hari
    const success = await updateMemberStatus(email, 'active', expiry.toISOString());
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

  const handleApproveTopup = async (req: TopupRequest) => {
    if (!confirm(`Setujui Topup ${req.amount} CR untuk ${req.email}?`)) return;
    setIsProcessing(true);
    const success = await approveTopup(req.id, req.email, req.amount);
    if (success) refreshData();
    setIsProcessing(false);
  };

  const filteredMembers = members.filter(m => 
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-95">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">Admin <span className="text-yellow-500">Center</span></h2>
        </div>
        
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
           <button onClick={() => setActiveTab('members')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'members' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-600'}`}>
             MANAJEMEN MEMBER
           </button>
           <button onClick={() => setActiveTab('topup')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all relative ${activeTab === 'topup' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-600'}`}>
             ANTRIAN TOPUP {requests.length > 0 && <span className="absolute -top-1 -right-1 bg-white text-red-500 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black animate-bounce">{requests.length}</span>}
           </button>
        </div>
      </div>

      <div className="flex gap-4">
         <div className="flex-1 relative">
           <i className="fa-solid fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 text-xs"></i>
           <input 
             value={searchTerm} 
             onChange={e => setSearchTerm(e.target.value)} 
             placeholder="Cari email atau nama member..." 
             className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-[11px] text-white focus:border-yellow-500/30 outline-none transition-all" 
           />
         </div>
         <button onClick={refreshData} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:rotate-180 duration-500">
           <i className={`fa-solid fa-rotate ${isLoading ? 'animate-spin' : ''}`}></i>
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="wait">
          {activeTab === 'members' ? (
            filteredMembers.map(m => (
              <motion.div 
                key={m.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-panel p-6 rounded-[2.5rem] bg-[#0d1117] border border-white/5 flex flex-col gap-6 group hover:border-yellow-500/20 transition-all"
              >
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center text-lg font-black italic shadow-inner">
                         {m.email[0].toUpperCase()}
                       </div>
                       <div className="min-w-0">
                          <p className="text-[11px] font-black text-white truncate lowercase tracking-tighter">{m.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isUserOnline(m.last_seen) ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`}></span>
                            <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest">{isUserOnline(m.last_seen) ? 'ONLINE' : 'OFFLINE'}</p>
                          </div>
                       </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${m.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {m.status}
                    </span>
                 </div>

                 <div className="grid grid-cols-2 gap-4 bg-black/40 p-5 rounded-2xl">
                    <div>
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">SALDO KREDIT</p>
                      <p className="text-sm font-black text-cyan-400 italic">{m.credits.toLocaleString()} <span className="text-[9px] not-italic text-slate-700">CR</span></p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">MASA AKTIF</p>
                      <p className="text-[10px] font-bold text-slate-400">{m.valid_until ? new Date(m.valid_until).toLocaleDateString() : 'PERMANEN'}</p>
                    </div>
                 </div>

                 <div className="flex gap-2">
                    <button onClick={() => {setEditingMember(m); setNewCreditValue(m.credits);}} className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-all">KOREKSI</button>
                    {m.status === 'pending' && (
                      <button onClick={() => handleApproveMember(m.email)} className="flex-1 py-3.5 rounded-xl bg-green-600 text-white text-[9px] font-black uppercase shadow-lg shadow-green-600/20 active:scale-95 transition-all">AKTIFKAN</button>
                    )}
                    <button onClick={() => { if(confirm("Hapus member ini?")) deleteMember(m.email).then(refreshData) }} className="w-12 h-12 rounded-xl bg-red-600/10 text-red-500 border border-red-600/20 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                 </div>
              </motion.div>
            ))
          ) : (
            requests.map(req => (
              <motion.div 
                key={req.id} 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="glass-panel p-6 rounded-[2.5rem] bg-[#0d1117] border border-white/5 flex flex-col gap-6 border-l-4 border-l-yellow-500"
              >
                 <div className="flex justify-between items-start">
                    <div>
                       <p className="text-[9px] font-black text-white uppercase italic tracking-widest">{req.tid}</p>
                       <p className="text-[10px] font-bold text-slate-500 mt-1">{req.email}</p>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-yellow-500 text-black text-[8px] font-black uppercase">PENDING</span>
                 </div>

                 <div className="flex items-center justify-between p-5 bg-black/40 rounded-2xl">
                    <div>
                       <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">JUMLAH BELI</p>
                       <p className="text-xl font-black text-cyan-400 italic">+{req.amount.toLocaleString()} <span className="text-[10px] not-italic">CR</span></p>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">HARGA</p>
                       <p className="text-sm font-black text-white">Rp {req.price.toLocaleString()}</p>
                    </div>
                 </div>

                 {req.receipt_url && (
                   <div className="relative group">
                     <img src={req.receipt_url} className="w-full h-48 object-cover rounded-2xl bg-black/40 border border-white/5 cursor-pointer" onClick={() => window.open(req.receipt_url, '_blank')} />
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl pointer-events-none">
                       <p className="text-[9px] font-black text-white uppercase">Klik untuk Zoom</p>
                     </div>
                   </div>
                 )}

                 <button 
                   onClick={() => handleApproveTopup(req)} 
                   disabled={isProcessing}
                   className="w-full py-5 bg-yellow-500 text-black font-black uppercase rounded-2xl text-[11px] tracking-widest shadow-xl shadow-yellow-500/20 active:scale-95 transition-all"
                 >
                   {isProcessing ? "MENSINKRONISASI..." : "KONFIRMASI PEMBAYARAN"}
                 </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-10 rounded-[3rem] bg-[#0d1117] border border-white/10 max-w-sm w-full space-y-8 shadow-2xl relative">
                <button onClick={() => setEditingMember(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><i className="fa-solid fa-xmark text-lg"></i></button>
                <div className="text-center">
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">MANUAL CREDIT INTERVENTION</p>
                   <h3 className="text-xs font-black text-cyan-400 uppercase italic truncate px-6">{editingMember.email}</h3>
                </div>
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest ml-4">SET TOTAL KREDIT BARU</label>
                  <input 
                    type="number" 
                    value={newCreditValue} 
                    onChange={e => setNewCreditValue(parseInt(e.target.value) || 0)} 
                    className="w-full bg-black/60 border border-white/10 rounded-[2rem] py-8 px-8 text-4xl font-black italic text-white text-center focus:outline-none focus:border-yellow-500/50 transition-all shadow-inner" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => setEditingMember(null)} className="py-5 bg-white/5 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-white/10 transition-all">BATAL</button>
                   <button onClick={handleManualCredit} disabled={isProcessing} className="py-5 bg-yellow-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-yellow-600/20 active:scale-95 transition-all">SIMPAN DATA</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {!isLoading && members.length === 0 && (
        <div className="py-40 text-center opacity-10">
          <i className="fa-solid fa-users-slash text-8xl mb-6"></i>
          <p className="text-xl font-black uppercase tracking-[1em]">NO_DATABASE_RECORDS</p>
        </div>
      )}
    </div>
  );
};