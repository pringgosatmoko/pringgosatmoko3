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
    const { data: mems } = await supabase.from('members').select('*');
    const { data: reqs } = await supabase.from('topup_requests').select('*').eq('status', 'pending');
    if (mems) setMembers(mems);
    if (reqs) setRequests(reqs);
    setIsLoading(false);
  };

  const handleApproveMember = async (email: string) => {
    setIsProcessing(true);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    await updateMemberStatus(email, 'active', expiry.toISOString());
    refreshData();
    setIsProcessing(false);
  };

  const handleManualCredit = async () => {
    if (!editingMember) return;
    setIsProcessing(true);
    await manualUpdateCredits(editingMember.email, newCreditValue);
    setEditingMember(null);
    refreshData();
    setIsProcessing(false);
  };

  const handleApproveTopup = async (req: TopupRequest) => {
    setIsProcessing(true);
    await approveTopup(req.id, req.email, req.amount);
    refreshData();
    setIsProcessing(false);
  };

  const filteredMembers = members.filter(m => m.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Member <span className="text-yellow-500">Control</span></h2>
        </div>
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
           <button onClick={() => setActiveTab('members')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'members' ? 'bg-yellow-500 text-black' : 'text-slate-600'}`}>PENGGUNA</button>
           <button onClick={() => setActiveTab('topup')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all relative ${activeTab === 'topup' ? 'bg-red-500 text-white' : 'text-slate-600'}`}>TOPUP {requests.length > 0 && <span className="ml-2 bg-white text-red-500 px-1.5 rounded-md">{requests.length}</span>}</button>
        </div>
      </div>

      <div className="flex gap-4">
         <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari email member..." className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-[11px] text-white focus:border-yellow-500/30 outline-none" />
         <button onClick={refreshData} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white"><i className={`fa-solid fa-rotate ${isLoading ? 'animate-spin' : ''}`}></i></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'members' ? (
            filteredMembers.map(m => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-[2.5rem] bg-[#0d1117] border border-white/5 space-y-4">
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-black">{m.email[0].toUpperCase()}</div>
                       <div className="min-w-0">
                          <p className="text-[11px] font-black text-white truncate lowercase tracking-tighter">{m.email}</p>
                          <p className={`text-[8px] font-black uppercase ${m.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>{m.status}</p>
                       </div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2 bg-black/40 p-4 rounded-2xl text-center">
                    <div><p className="text-[8px] font-black text-slate-600 uppercase">KREDIT</p><p className="text-xs font-black text-cyan-400">{m.credits.toLocaleString()}</p></div>
                    <div><p className="text-[8px] font-black text-slate-600 uppercase">EXPIRE</p><p className="text-[9px] font-bold text-slate-400">{m.valid_until ? new Date(m.valid_until).toLocaleDateString() : 'N/A'}</p></div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => {setEditingMember(m); setNewCreditValue(m.credits);}} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase text-slate-500 hover:text-white">KOREKSI</button>
                    {m.status === 'pending' && <button onClick={() => handleApproveMember(m.email)} className="flex-1 py-3 rounded-xl bg-green-600 text-white text-[9px] font-black uppercase">AKTIFKAN</button>}
                    <button onClick={() => deleteMember(m.email).then(refreshData)} className="w-10 h-10 rounded-xl bg-red-600/10 text-red-500 border border-red-600/20 flex items-center justify-center"><i className="fa-solid fa-trash"></i></button>
                 </div>
              </motion.div>
            ))
          ) : (
            requests.map(req => (
              <motion.div key={req.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 rounded-[2.5rem] bg-[#0d1117] border border-white/5 space-y-4">
                 <div className="flex justify-between">
                    <p className="text-[9px] font-black text-white uppercase italic">{req.tid}</p>
                    <span className="text-[8px] font-black text-yellow-500 uppercase">PENDING</span>
                 </div>
                 <p className="text-[10px] font-bold text-slate-400">{req.email}</p>
                 <div className="p-4 bg-black/40 rounded-2xl flex justify-between">
                    <p className="text-lg font-black text-cyan-400">+{req.amount} CR</p>
                    <p className="text-sm font-black text-slate-500">Rp {req.price.toLocaleString()}</p>
                 </div>
                 {req.receipt_url && <img src={req.receipt_url} className="w-full h-32 object-contain rounded-xl bg-black/40" />}
                 <button onClick={() => handleApproveTopup(req)} className="w-full py-4 bg-yellow-500 text-black font-black uppercase rounded-2xl text-[10px] tracking-widest shadow-xl shadow-yellow-500/10">SETUJUI PEMBAYARAN</button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-10 rounded-[3rem] bg-[#0d1117] border border-white/10 max-w-sm w-full space-y-8 shadow-2xl">
                <div className="text-center">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Manual Correction</p>
                   <h3 className="text-xs font-black text-cyan-400 uppercase italic truncate">{editingMember.email}</h3>
                </div>
                <input type="number" value={newCreditValue} onChange={e => setNewCreditValue(parseInt(e.target.value) || 0)} className="w-full bg-black/60 border border-white/10 rounded-3xl py-6 px-8 text-3xl font-black italic text-white text-center focus:outline-none focus:border-cyan-500/50" />
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => setEditingMember(null)} className="py-4 bg-white/5 text-slate-500 rounded-2xl text-[10px] font-black uppercase">BATAL</button>
                   <button onClick={handleManualCredit} disabled={isProcessing} className="py-4 bg-cyan-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">SIMPAN</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};