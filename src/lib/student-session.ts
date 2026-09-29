import { useState, useEffect, useCallback } from "react";
import type { Profile } from "@/types/database";
import { verityApi } from "@/services/verity-api";

const SESSION_STORAGE_KEY = "verity_active_student_id";
const EVENT_NAME = "verity:student-session-changed";

const defaultStudentProfile: Profile = {
  id: "b0000000-0000-0000-0000-000000000002",
  full_name: "Riya Sharma",
  email: "riya.sharma@abcit.edu",
  role: "student",
  roll_number: "22CSE057",
  institution_id: "a0000000-0000-0000-0000-000000000001",
  department_name: "Computer Engineering",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function getStoredStudentId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredStudentId(studentId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (studentId) {
      localStorage.setItem(SESSION_STORAGE_KEY, studentId);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { studentId } }));
  } catch (err) {
    console.warn("Failed to set student session in localStorage:", err);
  }
}

export function useStudentSession() {
  const [currentStudent, setCurrentStudent] = useState<Profile>(defaultStudentProfile);
  const [allStudents, setAllStudents] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const studentsList = await verityApi.students.list();
      setAllStudents(studentsList || []);

      const activeId = getStoredStudentId();
      let matchedStudent: Profile | undefined;

      if (activeId && studentsList) {
        matchedStudent = studentsList.find(
          (s) => s.id === activeId || s.roll_number?.toLowerCase() === activeId.toLowerCase()
        );
      }

      if (!matchedStudent && studentsList && studentsList.length > 0) {
        matchedStudent = studentsList[0];
      }

      if (matchedStudent) {
        setCurrentStudent(matchedStudent);
      } else {
        setCurrentStudent(defaultStudentProfile);
      }
    } catch (err) {
      console.warn("Could not load student session:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();

    const handleEvent = () => {
      loadSession();
    };

    window.addEventListener(EVENT_NAME, handleEvent);
    window.addEventListener("storage", handleEvent);

    return () => {
      window.removeEventListener(EVENT_NAME, handleEvent);
      window.removeEventListener("storage", handleEvent);
    };
  }, [loadSession]);

  const switchStudent = (student: Profile | string) => {
    const studentId = typeof student === "string" ? student : student.id;
    setStoredStudentId(studentId);
    if (typeof student !== "string") {
      setCurrentStudent(student);
    } else {
      const found = allStudents.find((s) => s.id === studentId || s.roll_number === studentId);
      if (found) setCurrentStudent(found);
    }
  };

  const logoutStudent = () => {
    setStoredStudentId(null);
    if (allStudents.length > 0) {
      setCurrentStudent(allStudents[0]!);
    }
  };

  return {
    currentStudent,
    allStudents,
    isLoading,
    switchStudent,
    logoutStudent,
    reloadStudents: loadSession,
  };
}
