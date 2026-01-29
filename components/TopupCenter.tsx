
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestTopup, supabase, createMidtransToken, processMidtransTopup } from '../lib/api';

interface TopupCenterProps {
  onBack: () => void;
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
  lang: 'id' | 'en';
}

export const TopupCenter: React.FC<TopupCenterProps> = ({ onBack, userEmail, credits, refreshCredits, lang }) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'history'>('buy');
  const [paymentMethod, setPaymentMethod] = useState<'auto' | 'manual'>('auto');
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  const packages = [
    { credits: 1000, price: 100000, label: 'Standard Access' },
    { credits: 3500, price: 250000, label: 'Professional Tier' },
    { credits: 8000, price: 500000, label: 'Creative Studio' },
    { credits: 15000, price: 900000, label: 'Unlimited Master' }
  ];

  useEffect(() => {
    if (activeTab === 'history') fetchMyHistory();
  }, [activeTab]);

  const fetchMyHistory = async () => {
    const { data } = await supabase.from('topup_requests').select('*').eq('email', userEmail.toLowerCase()).order('created_at', { ascending: false });
    if (data) setMyRequests(data);
  };

  const handleMidtransPayment = async () => {
    if (selectedPackage === null) return;
    setIsProcessing(true);
    const pkg = packages[selectedPackage];

    try {
      const res = await createMidtransToken(userEmail, pkg.credits, pkg.price);
      if (res && res.token) {
        window.snap.pay(res.token, {
          onSuccess: async (result: any) => {
            setIsProcessing(true);
            await processMidtransTopup(userEmail, pkg.credits, res.orderId);
            refreshCredits();
            setTransactionId(res.orderId);
            setShowSuccess(true);
            setIsProcessing(false);
          },
          onPending: () => {
            alert(lang === 'id' ? "Menunggu pembayaran..." : "Awaiting payment...");
            setIsProcessing(false);
          },
          onError: () => {
            alert(lang === 'id' ? "Pembayaran Gagal." : "Payment Failed.");
            setIsProcessing(false);
          },
          onClose: () => setIsProcessing(false)
        });
      } else {
        alert("Server Error: Midtrans Token gagal.");
        setIsProcessing(false);
      }
    } catch (e) { setIsProcessing(false); }
  };

  const handleSubmitManual = async () => {
    if (selectedPackage === null || !receipt) return;
    setIsProcessing(true);
    const pkg = packages[selectedPackage];
    try {
      const res = await requestTopup(userEmail, pkg.credits, pkg.price, receipt);
      if (res.success) {
        setTransactionId(res.tid);
        setShowSuccess(true);
      }
    } catch (e) { alert("Manual Request Error."); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-12 h-12 rounded-[1.2rem] bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Pusat <span className="text-cyan-400">Isi Saldo</span></h2>
        </div>
        
        <div className="flex bg-black/60 p-1.5 rounded-[1.5rem] border border-white/5 self-start">
          <button onClick={() => setActiveTab('buy')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'buy' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-500'}`}>PAKET</button>
          <button onClick={() => setActiveTab('history')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-500'}`}>RIWAYAT</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'buy' ? (
            !showSuccess ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
                <div className="lg:col-span-8 space-y-8">
                  <div className="flex bg-black/40 p-1.5 rounded-[1.8rem] border border-white/5 w-fit">
                    <button onClick={() => setPaymentMethod('auto')} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 ${paymentMethod === 'auto' ? 'bg-cyan-500 text-black' : 'text-slate-500'}`}><i className="fa-solid fa-bolt"></i> OTOMATIS (QRIS/VA)</button>
                    <button onClick={() => setPaymentMethod('manual')} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 ${paymentMethod === 'manual' ? 'bg-white text-black' : 'text-slate-500'}`}><i className="fa-solid fa-bank"></i> MANUAL (TRANSFER)</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packages.map((pkg, idx) => (
                      <button key={idx} onClick={() => setSelectedPackage(idx)} className={`glass-panel p-8 rounded-[2.5rem] border-2 text-left transition-all ${selectedPackage === idx ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-slate-900/40'}`}>
                        <div className="flex justify-between items-start mb-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedPackage === idx ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-600'}`}><i className="fa-solid fa-coins text-xl"></i></div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-white italic">{pkg.credits.toLocaleString()} <span className="text-[10px] not-italic opacity-40">CR</span></p>
                            <p className="text-xs font-bold text-cyan-400 mt-2">Rp {pkg.price.toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">{pkg.label}</p>
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'manual' && selectedPackage !== null && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-10 rounded-[3rem] bg-slate-900/40 border border-white/5 space-y-8">
                       <h3 className="text-xs font-black uppercase text-white tracking-widest italic">Instruksi Transfer Manual</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                          <div className="space-y-4">
                             <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                                <p className="text-[9px] font-black text-slate-500 uppercase mb-2">BANK MANDIRI</p>
                                <p className="text-lg font-black text-white tracking-widest leading-none">123-000-999-888</p>
                                <p className="text-[10px] font-bold text-slate-600 mt-3">A/N SATMOKO STUDIO</p>
                             </div>
                             <p className="text-[10px] text-slate-500 font-bold italic">Kirim bukti transfer gambar yang jelas untuk persetujuan Admin.</p>
                          </div>
                          <div className="relative aspect-video rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden bg-black/20 group">
                            {receipt ? <img src={receipt} className="w-full h-full object-contain" /> : (
                              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                 <i className="fa-solid fa-cloud-arrow-up text-slate-800 text-3xl mb-3"></i>
                                 <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">UPLOAD BUKTI</p>
                                 <input type="file" onChange={(e) => {
                                   const f = e.target.files?.[0];
                                   if (f) { const r = new FileReader(); r.onload = (ev) => setReceipt(ev.target?.result as string); r.readAsDataURL(f); }
                                 }} className="hidden" accept="image/*" />
                              </label>
                            )}
                          </div>
                       </div>
                    </motion.div>
                  )}
                </div>

                <div className="lg:col-span-4">
                  <div className="glass-panel p-10 rounded-[3rem] bg-[#0d1117] border border-white/5 shadow-2xl space-y-8 sticky top-6">
                    <p className="text-[11px] font-black text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-4">RINGKASAN ORDER</p>
                    {selectedPackage !== null ? (
                       <div className="space-y-6">
                          <div className="flex justify-between text-[11px] font-bold"><span className="text-slate-500">PAKET:</span><span className="text-white uppercase">{packages[selectedPackage].credits} CREDITS</span></div>
                          <div className="flex justify-between text-[11px] font-bold"><span className="text-slate-500">GATEWAY:</span><span className="text-white uppercase">{paymentMethod}</span></div>
                          <div className="pt-6 border-t border-white/10 flex justify-between items-end"><span className="text-xs font-black text-white">TOTAL</span><span className="text-3xl font-black italic text-cyan-400">Rp {packages[selectedPackage].price.toLocaleString()}</span></div>
                       </div>
                    ) : (
                      <p className="text-[10px] font-bold text-slate-700 italic">Pilih paket akses Master...</p>
                    )}
                    <button onClick={paymentMethod === 'auto' ? handleMidtransPayment : handleSubmitManual} disabled={selectedPackage === null || isProcessing || (paymentMethod === 'manual' && !receipt)} className="w-full py-6 rounded-[1.8rem] bg-cyan-500 text-black font-black uppercase text-xs tracking-widest transition-all active:scale-95 disabled:opacity-20 shadow-[0_10px_30px_rgba(34,211,238,0.2)]">
                      {isProcessing ? "MENSINKRONISASI..." : "KONFIRMASI PEMBAYARAN"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto py-20 text-center space-y-10 glass-panel p-12 rounded-[4rem] border border-cyan-500/30 bg-cyan-500/5">
                 <div className="w-24 h-24 rounded-[2rem] bg-cyan-500 text-black flex items-center justify-center mx-auto text-4xl shadow-[0_0_40px_rgba(34,211,238,0.4)]"><i className="fa-solid fa-check"></i></div>
                 <div>
                    <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">PERMINTAAN TERKIRIM</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-3">ID TRANSAKSI: {transactionId}</p>
                 </div>
                 <button onClick={() => { setShowSuccess(false); setActiveTab('history'); }} className="w-full py-5 rounded-[1.5rem] bg-white text-black font-black uppercase text-[10px] tracking-widest shadow-xl">LIHAT STATUS RIWAYAT</button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-32">
               {myRequests.map((req) => (
                 <div key={req.id} className="glass-panel p-8 rounded-[2.5rem] bg-black/40 border border-white/5 flex items-center justify-between group hover:border-cyan-500/30 transition-all">
                    <div className="flex items-center gap-5">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${req.status === 'approved' ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-yellow-500/10 text-yellow-500'}`}><i className={`fa-solid ${req.status === 'approved' ? 'fa-check' : 'fa-clock'}`}></i></div>
                       <div>
                          <p className="text-lg font-black text-white italic">{req.amount.toLocaleString()} CR</p>
                          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">{req.tid}</p>
                       </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${req.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500 animate-pulse'}`}>{req.status}</span>
                 </div>
               ))}
               {myRequests.length === 0 && (
                 <div className="col-span-full py-20 text-center opacity-10">
                    <i className="fa-solid fa-receipt text-8xl mb-6"></i>
                    <p className="text-lg font-black uppercase tracking-[1em]">NO_TRANSACTIONS</p>
                 </div>
               )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
