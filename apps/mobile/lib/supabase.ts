/**
 * Supabase client (mobile).
 *
 * Reads EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from
 * Expo's process.env. Configures auth to persist sessions in AsyncStorage
 * and to detect URL sessions for magic-link callbacks.
 *
 * Never import the service role key on the client.
 */

// import 'react-native-url-polyfill/auto';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
// const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// export const supabase = createClient<Database>(url, anonKey, {
//   auth: {
//     storage: AsyncStorage,
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
// });

export {};
