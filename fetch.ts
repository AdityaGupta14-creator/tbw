async function run() {
  const res = await fetch('http://localhost:5173/api/submissions');
  const text = await res.text();
  console.log(text);
}
run();
