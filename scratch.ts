import { runFullAcademicIntegrityAnalysis } from "./src/lib/backend/similarity-engine";

const text = `Digital learning platforms have changed the way engineering students access educational resources, communicate with instructors, and collaborate with their peers. Modern engineering education increasingly combines classroom instruction with online lectures, digital assignments, recorded demonstrations, discussion forums, and electronic assessment systems.`;

async function main() {
  console.log("Running analysis...");
  const result = await runFullAcademicIntegrityAnalysis({
    submissionId: "scratch-test",
    submissionText: text,
    peerSubmissions: []
  });
  
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
