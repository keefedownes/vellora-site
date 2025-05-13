import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, // reuse same URL
  process.env.SUPABASE_SERVICE_ROLE_KEY // secret server-only key
);

export default supabase;
