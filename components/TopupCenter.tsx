
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

declare global {
  interface Window {
    snap: any;
  }
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
    const { data } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('email', userEmail.toLowerCase())
      .order('created_at', { ascending: false });
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
            alert(lang === 'id' ? "Gagal diproses." : "Failed.");
            setIsProcessing(false);
          },
          onClose: () => setIsProcessing(false)
        });
      } else {
        alert("Server error: Token Midtrans gagal dibuat.");
        setIsProcessing(false);
      }
    } catch (e) {
      setIsProcessing(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        setReceipt(event.target?.result as string);
      };
    }
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
    } catch (e) {
      alert("Error sending manual request.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 flex-shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shadow-xl active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center shadow-xl ${showGuide ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 border-white/5 text-cyan-400'}`}><i className={`fa-solid ${showGuide ? 'fa-xmark' : 'fa-question'} text-[10px]`}></i></button>
          <div>
            <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white">Topup <span className="text-cyan-400">Hub</span></h2>
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-600 mt-1">Satmoko Secure Payment v2.1</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-black/60 p-1 rounded-2xl border border-white/5">
            <button onClick={() => setActiveTab('buy')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'buy' ? 'bg-cyan-500 text-black' : 'text-slate-500'}`}>PAKET</button>
            <button onClick={() => setActiveTab('history')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-cyan-500 text-black' : 'text-slate-500'}`}>RIWAYAT</button>
          </div>
          <div className="text-right bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
             <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest mb-1">Saldo Master</p>
             <p className="text-sm font-black italic text-cyan-400 leading-none">{credits.toLocaleString()} CR</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'buy' ? (
            !showSuccess ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex bg-black/40 p-1.5 rounded-3xl border border-white/5 w-fit">
                    <button onClick={() => setPaymentMethod('auto')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 ${paymentMethod === 'auto' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-600'}`}><i className="fa-solid fa-bolt"></i> OTOMATIS (QRIS/VA)</button>
                    <button onClick={() => setPaymentMethod('manual')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 ${paymentMethod === 'manual' ? 'bg-white text-black' : 'text-slate-600'}`}><i className="fa-solid fa-bank"></i> MANUAL (TF BANK)</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packages.map((pkg, idx) => (
                      <button key={idx} onClick={() => setSelectedPackage(idx)} className={`glass-panel p-6 rounded-[2rem] border-2 text-left transition-all ${selectedPackage === idx ? 'border-cyan-500 bg-cyan-500/5' : 'border-white/5 bg-slate-900/40'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedPackage === idx ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-600'}`}><i className="fa-solid fa-coins"></i></div>
                          <div className="text-right">
                            <p className="text-[12px] font-black text-white italic">{pkg.credits.toLocaleString()} CR</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">Rp {pkg.price.toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{pkg.label}</p>
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'manual' && selectedPackage !== null && (
                    <div className="glass-panel p-8 rounded-[2rem] bg-slate-900/40 border border-white/5 space-y-6">
                       <h3 className="text-[10px] font-black uppercase text-white tracking-widest italic">Upload Bukti Transfer Manual</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Transfer Ke:</p>
                             <p className="text-xs font-black text-white tracking-widest">BANK MANDIRI: 123-000-999-888</p>
                             <p className="text-[9px] font-bold text-slate-600">A/N SATMOKO STUDIO</p>
                          </div>
                          <div className="relative aspect-video rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden bg-black/20">
                            {receipt ? <img src={receipt} className="w-full h-full object-contain" /> : (
                              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                 <i className="fa-solid fa-camera text-slate-800 text-2xl mb-2"></i>
                                 <input type="file" onChange={handleFile} className="hidden" accept="image/*" />
                              </label>
                            )}
                          </div>
                       </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4">
                  <div className="glass-panel p-8 rounded-[2.5rem] bg-[#0d1117] border border-white/5 shadow-2xl space-y-6">
                    <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Ringkasan</p>
                    {selectedPackage !== null && (
                       <div className="space-y-4">
                          <div className="flex justify-between text-[11px] font-bold"><span className="text-slate-500">NOMINAL:</span><span className="text-cyan-400">Rp {packages[selectedPackage].price.toLocaleString()}</span></div>
                          <div className="pt-4 border-t border-white/5 flex justify-between"><span className="text-xs font-black text-white">TOTAL</span><span className="text-xl font-black italic text-cyan-400">Rp {packages[selectedPackage].price.toLocaleString()}</span></div>
                       </div>
                    )}
                    <button onClick={paymentMethod === 'auto' ? handleMidtransPayment : handleSubmitManual} disabled={selectedPackage === null || isProcessing} className="w-full py-5 rounded-2xl bg-cyan-500 text-black font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3">
                      {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : paymentMethod === 'auto' ? "BAYAR QRIS (OTOMATIS)" : "KONFIRMASI MANUAL"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto py-10 text-center space-y-8 glass-panel p-10 rounded-[3rem] border border-cyan-500/30">
                 <div className="w-20 h-20 rounded-full bg-green-500 text-black flex items-center justify-center mx-auto text-3xl"><i className="fa-solid fa-check"></i></div>
                 <h3 className="text-xl font-black italic uppercase text-white">TOPUP BERHASIL</h3>
                 <button onClick={() => { setShowSuccess(false); setActiveTab('history'); }} className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase text-[9px]">LIHAT RIWAYAT</button>
              </div>
            )
          ) : (
            <div className="space-y-4">
               {myRequests.map((req) => (
                 <div key={req.id} className="glass-panel p-6 rounded-3xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${req.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}><i className={`fa-solid ${req.status === 'approved' ? 'fa-check' : 'fa-clock'}`}></i></div>
                       <div><p className="text-[10px] font-black text-white">{req.amount.toLocaleString()} CR</p><p className="text-[8px] font-bold text-slate-600">{req.tid}</p></div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${req.status === 'approved' ? 'bg-green-500 text-black' : 'bg-yellow-500 text-black'}`}>{req.status}</span>
                 </div>
               ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
