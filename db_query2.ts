import { supabase } from './src/lib/backend/supabase';
async function test() {
  const { data } = await supabase.from('submissions').select('id, student_name, similarity_percentage, assignment_id');
  console.dir(data, { depth: null });
}
test();
