const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await supabase.from('assignments').select('id');
  if (data && data.length > 0) {
     for (let a of data) {
         await supabase.from('assignments').delete().eq('id', a.id);
     }
  }
  
  const { data: subs } = await supabase.from('submissions').select('id');
  if (subs && subs.length > 0) {
     for (let s of subs) {
         await supabase.from('submissions').delete().eq('id', s.id);
     }
  }
  
  // INSERT EXACTLY 3 ASSIGNMENTS TOTAL
  const subject = "Electrical circuit analysis";
  const inserts = [
    { course_code: "EXCS", title: `${subject} - Assignment 1`, subject, total_points: 60, due_date: "2026-11-15T23:59:00Z" },
    { course_code: "EXCS", title: `${subject} - Assignment 2`, subject, total_points: 60, due_date: "2026-11-20T23:59:00Z" },
    { course_code: "EXCS", title: `${subject} - Assignment 3`, subject, total_points: 60, due_date: "2026-11-25T23:59:00Z" }
  ];
  
  await supabase.from('assignments').insert(inserts);
  console.log('Database reset to EXACTLY 3 assignments total.');
})();
