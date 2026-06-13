import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ikodyhxukvclgzydvztu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_Sx4xUWrLVpfq0e3-L0qbAg_ucB5SY8M'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)