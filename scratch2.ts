const subs = [
  {
    assignment_id: "asg-test",
    assignment_title: "Test Assignment",
    student_id: "p0000000-0000-0000-0000-000000000001", // Faculty ID
    student_name: "Keyur",
    student_roll: "KEYUR123"
  }
];

const currentStudent = {
  id: "p0000000-0000-0000-0000-000000000002",
  full_name: "Riya Sharma",
  roll_number: "22CSE057"
};

const studentSubs = (subs || []).filter((s) => {
  const matchId = s.student_id && s.student_id === currentStudent.id;
  const matchRoll =
    s.student_roll &&
    currentStudent.roll_number &&
    s.student_roll.trim().toLowerCase() === currentStudent.roll_number.trim().toLowerCase();
  const matchName =
    s.student_name &&
    currentStudent.full_name &&
    s.student_name.trim().toLowerCase() === currentStudent.full_name.trim().toLowerCase();
  return matchId || matchRoll || matchName;
});

console.log("studentSubs:", studentSubs);

const a = { id: "asg-test", title: "Test Assignment" };

const existingSub = studentSubs.find(
  (s) =>
    s.assignment_id?.toLowerCase() === a.id?.toLowerCase() ||
    (s.assignment_title || (s as any).assignment)?.trim().toLowerCase() ===
      a.title?.trim().toLowerCase()
);

console.log("existingSub:", existingSub);
