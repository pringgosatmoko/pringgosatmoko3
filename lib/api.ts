import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
    return (window as any).process.env[key];
  }
  try {
    // @ts-ignore
    return import.meta.env?.[key] || "";
  } catch (e) {
    return "";
  }
};

const supabaseUrl = getEnv('VITE_DATABASE_URL') || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON') || 'placeholder-key-missing';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isAdmin = (email: string) => {
  const adminString = getEnv('VITE_ADMIN_EMAILS') || 'pringgosatmoko@gmail.com';
  const admins = adminString.toLowerCase().split(',');
  return admins.includes(email?.toLowerCase() || "");
};

export const getAdminPassword = () => {
  return getEnv('VITE_PASSW') || 'satmoko123';
};

export const getSystemSettings = async () => {
  try {
    const { data } = await supabase.from('settings').select('*');
    const settings: Record<string, any> = { cost_image: 25, cost_video: 150, cost_voice: 150, cost_studio: 600 };
    if (data) {
      data.forEach(item => { if (item?.key) settings[item.key] = item.value; });
    }
    return settings;
  } catch (e) {
    return { cost_image: 25, cost_video: 150, cost_voice: 150, cost_studio: 600 };
  }
};

export const updateSystemSetting = async (key: string, value: any) => {
  return await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
};

export const sendTelegramNotification = async (message: string) => {
  const botToken = getEnv('VITE_TELEGRAM_BOT_TOKEN');
  const chatId = getEnv('VITE_TELEGRAM_CHAT_ID');
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: `🚀 *SATMOKO HUB*\n\n${message}`, parse_mode: 'Markdown' })
    });
  } catch (e) {}
};

export const getUserCredits = async (email: string): Promise<number> => {
  try {
    const { data } = await supabase.from('members').select('credits').eq('email', email.toLowerCase()).single();
    return data?.credits || 0;
  } catch (e) { return 0; }
};

export const deductCredits = async (email: string, amount: number): Promise<boolean> => {
  if (isAdmin(email)) return true;
  const current = await getUserCredits(email);
  if (current < amount) return false;
  const { error } = await supabase.from('members').update({ credits: current - amount }).eq('email', email.toLowerCase());
  return !error;
};

export const updateMemberStatus = async (email: string, status: string, validUntil?: string | null) => {
  const updateData: any = { status };
  if (validUntil) updateData.valid_until = validUntil;
  const { error } = await supabase.from('members').update(updateData).eq('email', email.toLowerCase());
  return !error;
};

export const deleteMember = async (email: string) => {
  const { error } = await supabase.from('members').delete().eq('email', email.toLowerCase());
  return !error;
};

export const approveTopup = async (requestId: string | number, email: string, amount: number) => {
  const current = await getUserCredits(email);
  const { error } = await supabase.from('members').update({ credits: Number(current) + Number(amount) }).eq('email', email.toLowerCase());
  if (!error) {
    await supabase.from('topup_requests').update({ status: 'approved' }).eq('id', requestId);
    sendTelegramNotification(`✅ *TOPUP MANUAL DISETUJUI*\nUser: ${email}\n+${amount} CR`);
    return true;
  }
  return false;
};

export const requestTopup = async (email: string, amount: number, price: number, receipt_url: string) => {
  const tid = `TID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const { error } = await supabase.from('topup_requests').insert([{
    tid,
    email: email.toLowerCase(),
    amount,
    price,
    receipt_url,
    status: 'pending'
  }]);
  if (!error) {
    sendTelegramNotification(`💰 *TOPUP MANUAL BARU*\nUser: ${email}\nJumlah: ${amount} CR\nID: ${tid}`);
  }
  return { success: !error, tid };
};

export const createMidtransToken = async (email: string, credits: number, price: number) => {
  const orderId = `MID-${Date.now()}`;
  return { token: 'mock_midtrans_token_' + orderId, orderId };
};

export const processMidtransTopup = async (email: string, amount: number, orderId: string) => {
  const current = await getUserCredits(email);
  const { error } = await supabase.from('members').update({ credits: Number(current) + Number(amount) }).eq('email', email.toLowerCase());
  if (!error) {
    await supabase.from('topup_requests').insert([{
      tid: orderId,
      email: email.toLowerCase(),
      amount,
      price: 0,
      status: 'approved'
    }]);
    sendTelegramNotification(`💳 *TOPUP OTOMATIS BERHASIL*\nUser: ${email}\n+${amount} CR\nID: ${orderId}`);
    return true;
  }
  return false;
};

export const manualUpdateCredits = async (email: string, newCredits: number) => {
  const { error } = await supabase.from('members').update({ credits: newCredits }).eq('email', email.toLowerCase());
  return !error;
};

export const isUserOnline = (lastSeen: string | null | undefined) => {
  if (!lastSeen) return false;
  return (new Date().getTime() - new Date(lastSeen).getTime()) / 1000 < 300; 
};

// --- ROTASI API KEY CORE ---
let currentSlot = 1;
export const rotateApiKey = () => {
  // Coba cari slot kunci yang tersedia (1-3)
  for (let i = 0; i < 3; i++) {
    currentSlot = currentSlot >= 3 ? 1 : currentSlot + 1;
    const key = getEnv(`VITE_GEMINI_API_${currentSlot}`);
    if (key && key.trim().length > 10) {
      if (typeof window !== 'undefined') {
        if (!(window as any).process) (window as any).process = { env: {} };
        (window as any).process.env.API_KEY = key;
      }
      console.log(`System: Switched to API Slot ${currentSlot}`);
      return key;
    }
  }
  return getEnv(`VITE_GEMINI_API_1`); // Fallback ke slot 1
};

// Inisialisasi awal API_KEY
if (typeof window !== 'undefined') {
  const initialKey = getEnv('VITE_GEMINI_API_1') || getEnv('VITE_GEMINI_API_2') || getEnv('VITE_GEMINI_API_3');
  if (initialKey) {
    if (!(window as any).process) (window as any).process = { env: {} };
    (window as any).process.env.API_KEY = initialKey;
  }
}

export const auditApiKeys = () => ({
  slot1: !!getEnv('VITE_GEMINI_API_1'),
  slot2: !!getEnv('VITE_GEMINI_API_2'),
  slot3: !!getEnv('VITE_GEMINI_API_3'),
  activeSlot: currentSlot,
  supabase: !!getEnv('VITE_SUPABASE_ANON'),
  midtrans: !!getEnv('VITE_MIDTRANS_CLIENT_KEY'),
  telegram: !!getEnv('VITE_TELEGRAM_BOT_TOKEN')
});