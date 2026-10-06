import { verityApi } from './src/services/verity-api';
import fs from 'fs';

async function run() {
  const fileData = fs.readFileSync('src/lib/backend/__tests__/expanded-benchmark.ts');
  const file = new File([fileData], 'test.ts', { type: 'text/typescript' });
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('studentName', 'Test Student');
  formData.append('studentRoll', '22CSE001');
  formData.append('assignmentId', 'asg-test-123');
  
  const sub = await verityApi.submissions.submit({
    assignmentId: 'asg-test-123',
    file: file,
    studentName: 'Test Student',
    studentRoll: '22CSE001'
  });
  
  console.log('Submission ID:', sub.id);
  console.log('Similarity:', sub.similarity);
  console.log('Similarity Percentage:', sub.similarity_percentage);
  console.log('Analysis Similarity:', sub.analysis?.similarity_percentage);
  console.log('Max Source Overlap (Matches[0]):', sub.analysis?.matches?.[0]?.similarity_percentage);
  console.log('Student Overlap:', sub.analysis?.student_overlap_percentage);
  console.log('Evidence Breakdown:', sub.analysis?.evidence_breakdown);
}

run();
