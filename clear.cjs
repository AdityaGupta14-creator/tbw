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
  console.log('Deleting all submissions...');
  await supabase.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Deleting all assignments...');
  await supabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Done.');
})();
