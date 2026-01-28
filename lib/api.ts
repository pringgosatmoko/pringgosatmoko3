
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  const win = window as any;
  return win.process?.env?.[key] || (import.meta as any).env?.[key] || "";
};

// Robust Dummy Client untuk mencegah crash saat API Key Supabase absen
const createDummyClient = () => {
  console.warn("%c[SYSTEM]%c Mengaktifkan Mode Safe-Dummy (Database Offline)", "color: #f59e0b; font-weight: bold", "color: #94a3b8");
  
  const dummyResult = { data: [], error: null };
  const dummySingle = { data: null, error: null };
  
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    single: () => Promise.resolve(dummySingle),
    insert: () => Promise.resolve(dummyResult),
    update: () => builder,
    upsert: () => Promise.resolve(dummyResult),
    delete: () => builder,
    match: () => builder,
    // Agar bisa di-await langsung: await supabase.from('x').select('*')
    then: (resolve: any) => resolve(dummyResult)
  };

  return {
    from: () => builder,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: () => Promise.resolve({}),
      signInWithPassword: () => Promise.resolve({ error: { message: "Database Config Missing" } }),
      signUp: () => Promise.resolve({ error: { message: "Database Config Missing" } }),
      updateUser: () => Promise.resolve({ error: { message: "Database Config Missing" } })
    }
  } as any;
};

const createSupabaseClient = () => {
  const url = getEnv('VITE_DATABASE_URL') || 'https://urokqoorxuiokizesiwa.supabase.co';
  const key = getEnv('VITE_SUPABASE_ANON');
  
  if (!key || key.trim() === "") {
    console.error("%c[DATABASE ERROR]%c VITE_SUPABASE_ANON is missing! Database features will be non-functional.", "background: #7f1d1d; color: white; font-weight: bold; padding: 2px;", "color: #f87171;");
    return createDummyClient();
  }
  
  try {
    return createClient(url, key);
  } catch (e) {
    return createDummyClient();
  }
};

export const supabase = createSupabaseClient();

export const getSystemSettings = async () => {
  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    
    const settings: Record<string, any> = { cost_image: 20, cost_video: 150, cost_voice: 150, cost_studio: 600 };
    
    // Defensive check: pastikan data adalah array dan item tidak null
    if (Array.isArray(data)) {
      data.forEach(item => { 
        if (item && item.key) {
          settings[item.key] = item.value; 
        }
      });
    }
    return settings;
  } catch (e) {
    return { cost_image: 20, cost_video: 150, cost_voice: 150, cost_studio: 600 };
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
  if (validUntil !== undefined) updateData.valid_until = validUntil;
  const { error } = await supabase.from('members').update(updateData).eq('email', email.toLowerCase());
  return !error;
};

export const deleteMember = async (email: string) => {
  const { error } = await supabase.from('members').delete().eq('email', email.toLowerCase());
  return !error;
};

export const approveTopup = async (requestId: string | number, email: string, amount: number) => {
  try {
    const currentCredits = await getUserCredits(email);
    const { error: memberError } = await supabase.from('members').update({ credits: Number(currentCredits) + Number(amount) }).eq('email', email.toLowerCase());
    if (memberError) throw memberError;
    await supabase.from('topup_requests').update({ status: 'approved' }).eq('id', requestId);
    sendTelegramNotification(`✅ *TOPUP MANUAL DISETUJUI*\nUser: ${email}\nAdded: ${amount} CR`);
    return true;
  } catch (e) {
    return false;
  }
};

export const manualUpdateCredits = async (email: string, newCredits: number) => {
  const { error } = await supabase.from('members').update({ credits: newCredits }).eq('email', email.toLowerCase());
  return !error;
};

export const updatePresence = async (email: string) => {
  if (!email) return;
  try {
    await supabase.from('members').upsert({ email: email.toLowerCase(), last_seen: new Date().toISOString(), status: 'active' }, { onConflict: 'email' });
  } catch (e) {}
};

export const isUserOnline = (lastSeen: string | null | undefined) => {
  if (!lastSeen) return false;
  return (new Date().getTime() - new Date(lastSeen).getTime()) / 1000 < 150; 
};

export const isAdmin = (email: string) => {
  const adminString = getEnv('VITE_ADMIN_EMAILS') || 'pringgosatmoko@gmail.com';
  const admins = adminString.toLowerCase().split(',');
  return admins.includes(email.toLowerCase());
};

export const getAdminPassword = () => {
  return getEnv('VITE_PASSW') || 'satmoko123';
};

// --- MIDTRANS INTEGRATION ---
export const createMidtransToken = async (email: string, amount: number, price: number) => {
  const serverKey = getEnv('VITE_MIDTRANS_SERVER_ID');
  if (!serverKey) return null;
  const orderId = `SAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const payload = {
    transaction_details: { order_id: orderId, gross_amount: price },
    customer_details: { email: email, first_name: email.split('@')[0] },
    item_details: [{ id: 'TOPUP', price: price, quantity: 1, name: `${amount} Credits` }]
  };
  try {
    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: { 
        'Accept': 'application/json', 
        'Content-Type': 'application/json', 
        'Authorization': `Basic ${btoa(serverKey + ':')}` 
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return { ...data, orderId };
  } catch (error) { 
    return null; 
  }
};

export const processMidtransTopup = async (email: string, amount: number, orderId: string) => {
  await supabase.from('topup_requests').insert([{ tid: orderId, email: email.toLowerCase(), amount, price: 0, status: 'approved', receipt_url: 'MIDTRANS_AUTO' }]);
  const current = await getUserCredits(email);
  await supabase.from('members').update({ credits: Number(current) + Number(amount) }).eq('email', email.toLowerCase());
  sendTelegramNotification(`✅ *TOPUP OTOMATIS BERHASIL*\nUser: ${email}\nNominal: ${amount} CR`);
  return true;
};

export const requestTopup = async (email: string, amount: number, price: number, receiptB64: string) => {
  const tid = `SAT-MAN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  await supabase.from('topup_requests').insert([{ tid, email: email.toLowerCase(), amount, price, receipt_url: receiptB64, status: 'pending' }]);
  sendTelegramNotification(`💰 *TOPUP MANUAL PENDING*\nUser: ${email}\nID: ${tid}`);
  return { success: true, tid };
};

// --- MULTI-KEY ROTATION LOGIC ---
let currentSlot = 1;
export const rotateApiKey = () => {
  currentSlot = currentSlot >= 3 ? 1 : currentSlot + 1;
  const nextKey = getEnv(`VITE_GEMINI_API_${currentSlot}`);
  const win = window as any;
  if (nextKey) {
    if (!win.process) win.process = { env: {} };
    if (!win.process.env) win.process.env = {};
    win.process.env.API_KEY = nextKey;
    console.log(`%c[SYSTEM]%c Rotated to Gemini API Slot ${currentSlot}`, "color: #f59e0b; font-weight: bold", "color: #94a3b8");
  }
  return nextKey || getEnv('VITE_GEMINI_API_1');
};

export const auditApiKeys = () => {
  return {
    slot1: !!getEnv('VITE_GEMINI_API_1'),
    slot2: !!getEnv('VITE_GEMINI_API_2'),
    slot3: !!getEnv('VITE_GEMINI_API_3'),
    activeSlot: currentSlot,
    midtrans: !!getEnv('VITE_MIDTRANS_SERVER_ID'),
    telegram: !!getEnv('VITE_TELEGRAM_BOT_TOKEN'),
    supabase: !!getEnv('VITE_SUPABASE_ANON')
  };
};
