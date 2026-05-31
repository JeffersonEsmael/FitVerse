import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aefjmuktgytoumlqilgp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZmptdWt0Z3l0b3VtbHFpbGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNzc1MzQsImV4cCI6MjA5Mzk1MzUzNH0.gZetn8wl60siqNdjiSPbUlnJNosrWvYO3rwwGwPqi4s';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const dummyUserId = '00000000-0000-0000-0000-000000000000'; // Or any UUID

  console.log("Trying to insert with sender_id...");
  const res1 = await supabase
    .from('notifications')
    .insert({
      user_id: dummyUserId,
      sender_id: dummyUserId,
      type: 'follow'
    });
  
  if (res1.error) {
    console.error("Insert with sender_id FAILED:", res1.error);
  } else {
    console.log("Insert with sender_id SUCCEEDED!");
  }

  console.log("Trying to insert with from_user_id...");
  const res2 = await supabase
    .from('notifications')
    .insert({
      user_id: dummyUserId,
      from_user_id: dummyUserId,
      type: 'follow'
    });
  
  if (res2.error) {
    console.error("Insert with from_user_id FAILED:", res2.error);
  } else {
    console.log("Insert with from_user_id SUCCEEDED!");
  }
}

run();
