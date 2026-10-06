import { db } from './src/lib/backend/db';
console.log(db.getSubmissions().map(s => ({
  id: s.id,
  sim: s.similarity_percentage,
  ana: s.analysis?.similarity_percentage
})));
