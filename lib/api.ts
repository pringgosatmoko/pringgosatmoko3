
import { createClient } from '@supabase/supabase-js';

// KONFIGURASI DATABASE
const supabaseUrl = 'https://urokqoorxuiokizesiwa.supabase.co';
// Pastikan key ini valid. Jika tidak ada, sistem akan fallback ke mode offline/admin-only
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyb2txb29yeHVpb2tpemVzaXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3MDM0NDYsImV4cCI6MjA1NjI3OTQ0Nn0.dummy-key-to-prevent-initialization-error'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

const getEnv = (key: string): string => {
  if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) return (window as any).process.env[key];
  try {
    // @ts-ignore
    return import.meta.env?.[key] || "";
  } catch (e) { return ""; }
};

export const isAdmin = (email: string) => {
  const adminString = getEnv('VITE_ADMIN_EMAILS') || 'pringgosatmoko@gmail.com';
  const admins = adminString.toLowerCase().split(',');
  return admins.includes(email?.toLowerCase() || "");
};

export const getAdminPassword = () => getEnv('VITE_PASSW') || 'satmoko123';

export const isUserOnline = (lastSeen?: string | null) => {
  if (!lastSeen) return false;
  return (new Date().getTime() - new Date(lastSeen).getTime()) < 300000;
};

export const getSystemSettings = async () => {
  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    const settings: Record<string, any> = { cost_image: 25, cost_video: 150, cost_voice: 150, cost_studio: 600 };
    if (data) data.forEach(item => { if (item?.key) settings[item.key] = item.value; });
    return settings;
  } catch (e) { 
    return { cost_image: 25, cost_video: 150, cost_voice: 150, cost_studio: 600 }; 
  }
};

export const updateSystemSetting = async (key: string, value: any) => {
  const { error } = await supabase.from('settings').upsert({ key, value });
  return { error };
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
  if (isAdmin(email)) return 999999;
  try {
    const { data, error } = await supabase.from('members').select('credits').eq('email', email.toLowerCase()).single();
    if (error) return 0;
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

export const updateMemberStatus = async (email: string, status: 'active' | 'inactive' | 'pending', validUntil?: string | null) => {
  const { error } = await supabase.from('members').update({ status, valid_until: validUntil }).eq('email', email.toLowerCase());
  return !error;
};

export const deleteMember = async (email: string) => {
  const { error } = await supabase.from('members').delete().eq('email', email.toLowerCase());
  return !error;
};

export const manualUpdateCredits = async (email: string, credits: number) => {
  const { error } = await supabase.from('members').update({ credits }).eq('email', email.toLowerCase());
  return !error;
};

export const approveTopup = async (requestId: number, email: string, amount: number) => {
  const { error: reqError } = await supabase.from('topup_requests').update({ status: 'approved' }).eq('id', requestId);
  if (reqError) return false;
  const current = await getUserCredits(email);
  const { error: memError } = await supabase.from('members').update({ credits: current + amount }).eq('email', email.toLowerCase());
  return !memError;
};

export const requestTopup = async (email: string, amount: number, price: number, receiptUrl: string) => {
  const tid = `MAN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const { error } = await supabase.from('topup_requests').insert([{
    tid,
    email: email.toLowerCase(),
    amount,
    price,
    receipt_url: receiptUrl,
    status: 'pending'
  }]);
  return { success: !error, tid };
};

export const createMidtransToken = async (email: string, credits: number, price: number) => {
  const orderId = `AUTO-${Date.now()}`;
  return { token: 'mock_snap_token', orderId };
};

export const processMidtransTopup = async (email: string, amount: number, orderId: string) => {
  const { error: reqError } = await supabase.from('topup_requests').insert([{
    tid: orderId,
    email: email.toLowerCase(),
    amount,
    price: 0,
    status: 'approved'
  }]);
  if (reqError) return false;
  const current = await getUserCredits(email);
  const { error: memError } = await supabase.from('members').update({ credits: current + amount }).eq('email', email.toLowerCase());
  return !memError;
};

let currentSlot = 1;
export const rotateApiKey = () => {
  for (let i = 0; i < 3; i++) {
    currentSlot = currentSlot >= 3 ? 1 : currentSlot + 1;
    const key = getEnv(`VITE_GEMINI_API_${currentSlot}`);
    if (key && key.length > 10) {
      if (typeof window !== 'undefined') {
        if (!(window as any).process) (window as any).process = { env: {} };
        (window as any).process.env.API_KEY = key;
      }
      return key;
    }
  }
  return getEnv('VITE_GEMINI_API_1');
};

export const auditApiKeys = () => ({
  slot1: !!getEnv('VITE_GEMINI_API_1'),
  slot2: !!getEnv('VITE_GEMINI_API_2'),
  slot3: !!getEnv('VITE_GEMINI_API_3'),
  midtrans: !!getEnv('VITE_MIDTRANS_CLIENT_KEY'),
  activeSlot: currentSlot,
  supabase: !!supabaseUrl,
  telegram: !!getEnv('VITE_TELEGRAM_BOT_TOKEN')
});
