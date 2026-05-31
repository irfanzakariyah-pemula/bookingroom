const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase Init] ERROR: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('[Supabase Init] Supabase client berhasil diinisialisasi.');

module.exports = { supabase };
