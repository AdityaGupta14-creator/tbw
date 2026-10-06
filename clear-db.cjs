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
  const { data, error } = await supabase.from('assignments').select('id, title');
  console.log('Assignments in DB:', data ? data.length : error);
  if (data && data.length > 0) {
     for (let a of data) {
         await supabase.from('assignments').delete().eq('id', a.id);
     }
     console.log('Deleted all assignments successfully by ID');
  }
  
  const { data: subs, error: err2 } = await supabase.from('submissions').select('id');
  console.log('Submissions in DB:', subs ? subs.length : err2);
  if (subs && subs.length > 0) {
     for (let s of subs) {
         await supabase.from('submissions').delete().eq('id', s.id);
     }
     console.log('Deleted all submissions successfully by ID');
  }
  
  // Now, INSERT 3 assignments for each EXCS subject!
  const subjects = [
    "Electrical circuit analysis",
    "Electronics device circuit",
    "Technical Business writing",
    "Python Programming",
    "Maths - 3",
  ];
  const inserts = [];
  subjects.forEach((subject, idx) => {
    for (let i = 1; i <= 3; i++) {
      inserts.push({
        course_code: "EXCS",
        title: `${subject} - Assignment ${i}`,
        subject: subject,
        total_points: 60,
        due_date: "2026-11-15T23:59:00Z"
      });
    }
  });
  
  const { data: insData, error: insErr } = await supabase.from('assignments').insert(inserts).select();
  if (insErr) {
     console.log('Error inserting:', insErr);
  } else {
     console.log(`Inserted ${insData.length} mock assignments into Supabase`);
  }

})();
