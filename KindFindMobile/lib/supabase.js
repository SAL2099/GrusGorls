import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://okyhuhgwghvzqozexrhr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xPqb1ziwZtOo8hOExA3G7A_lP7l3CTX";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
