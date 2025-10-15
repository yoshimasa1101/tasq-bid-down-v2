import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// フロントから使うため、NEXT_PUBLIC_* を必須にしています
export const supabase = createClient(url, anonKey);
