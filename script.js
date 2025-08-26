document.addEventListener("DOMContentLoaded", () => {
  const studentForm = document.getElementById("student-form");
  const submitBtn = document.getElementById("submit-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const studentsTableBody = document.querySelector("#students-table tbody");

  // NEW: optional selects (only used if they exist in HTML)
  const semesterSelect = document.getElementById("semester");
  const courseSelect = document.getElementById("course");

  // keep your original fields as-is
  const fields = ["name", "roll_no", "email", "course"];
  const studentIdInput = document.getElementById("student-id");

  // --- NEW: courses by semester (edit labels as you like)
  const coursesBySemester = {
    "1": ["Calculus I", "Intro to Programming", "English Composition", "Basic Electronics"],
    "2": ["Calculus II", "OOP", "Discrete Mathematics", "Communication Skills"],
    "3": ["Data Structures", "Digital Logic Design", "Linear Algebra", "Probability and Statistics"],
    "4": ["Algorithms", "Database Systems", "Computer Organization", "Technical Writing"],
    "5": ["Operating Systems", "Computer Networks", "Software Engineering", "Numerical Methods"],
    "6": ["Web Engineering", "Distributed Systems", "Information Security", "AI Fundamentals"],
    "7": ["Machine Learning", "Mobile App Development", "Cloud Computing", "HCI"],
    "8": ["Deep Learning", "Big Data Analytics", "DevOps", "Final Year Project"]
  };

  // --- helper to populate course options
  const populateCourses = (sem, selected = []) => {
    if (!courseSelect) return;
    const selectedArr = Array.isArray(selected) ? selected : (selected ? [selected] : []);
    courseSelect.innerHTML = `<option value="" disabled>Select course</option>`;
    if (!sem || !coursesBySemester[sem]) {
      courseSelect.disabled = true;
      return;
    }
    coursesBySemester[sem].forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      if (selectedArr.includes(c)) opt.selected = true;
      courseSelect.appendChild(opt);
    });
    courseSelect.disabled = false;
  };

  if (semesterSelect) {
    semesterSelect.addEventListener("change", () => {
      populateCourses(semesterSelect.value);
    });
  }

  const fetchStudents = async () => {
    try {
      const res = await fetch("/students");
      const data = await res.json();
      studentsTableBody.innerHTML = "";
      data.forEach(student => {
        const tr = document.createElement("tr");
        const courseText = Array.isArray(student.course) ? student.course.join(", ") : (student.course || "");
        tr.innerHTML = `
          <td>${student.name}</td>
          <td>${student.roll_no}</td>
          <td>${student.email}</td>
          <td>${courseText}</td>
          <td>
            <button class="action-btn edit" data-id="${student.id}">Edit</button>
            <button class="action-btn delete" data-id="${student.id}">Delete</button>
          </td>`;
        studentsTableBody.appendChild(tr);
      });
    } catch (err) {
      console.error("❌ Error fetching students:", err);
    }
  };

  const clearForm = () => {
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) el.value = "";
    });

    if (semesterSelect) semesterSelect.value = "";
    if (courseSelect) {
      courseSelect.innerHTML = `<option value="" selected disabled>Select course</option>`;
      courseSelect.disabled = true;
    }

    studentIdInput.value = "";
    submitBtn.textContent = "Add Student";
    cancelBtn.classList.add("hidden");
  };

  const validateForm = () => {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const roll_no = document.getElementById("roll_no").value.trim();

    if (!/^[A-Za-z\s]+$/.test(name)) {
      alert("Name should contain only letters and spaces");
      return false;
    }

    if (!/^\d+$/.test(roll_no)) {
      alert("Roll number should contain only digits");
      return false;
    }

    if (email.length > 40) {
      alert("Email should not exceed 40 characters");
      return false;
    }

    if (semesterSelect && !semesterSelect.value) {
      alert("Please select a semester");
      return false;
    }

    if (courseSelect) {
      const selectedCourses = Array.from(courseSelect.selectedOptions).map(o => o.value.trim()).filter(Boolean);
      if (!selectedCourses.length) {
        alert("Please select at least one course");
        return false;
      }
      const uniq = new Set(selectedCourses.map(v => v.toLowerCase()));
      if (uniq.size !== selectedCourses.length) {
        alert("You selected the same course more than once.");
        return false;
      }
    }

    return true;
  };

  studentForm.addEventListener("submit", async e => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) payload[f] = el.value;
    });

    if (semesterSelect) {
      payload["semester"] = semesterSelect.value || "";
    }

    if (courseSelect) {
      const selectedCourses = Array.from(courseSelect.selectedOptions).map(o => o.value.trim()).filter(Boolean);
      payload["course"] = selectedCourses;  // ✅ send array
    }

    console.log("📤 Sending payload:", payload);  // <--- Debug log

    const id = studentIdInput.value;
    const method = id ? "PUT" : "POST";
    const url = id ? `/students/${id}` : "/students";
    try {
      const res = await fetch(url, {
        method,
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        clearForm();
        fetchStudents();
      } else {
        const errText = await res.text();
        console.error("❌ Server error:", errText);
        alert("Server error: " + errText);
      }
    } catch (err) {
      console.error("❌ Request failed:", err);
      alert("Request failed: " + err.message);
    }
  });

  cancelBtn.addEventListener("click", e => {
    clearForm();
  });

  studentsTableBody.addEventListener("click", async e => {
    if (e.target.classList.contains("edit")) {
      const id = e.target.dataset.id;
      const res = await fetch("/students");
      const data = await res.json();
      const student = data.find(s => s.id === id);
      if (student) {
        fields.forEach(f => {
          const el = document.getElementById(f);
          if (el) el.value = Array.isArray(student[f]) ? student[f].join(", ") : (student[f] || "");
        });

        if (semesterSelect) {
          semesterSelect.value = student.semester || "";
          const pre = Array.isArray(student.course) ? student.course : (student.course ? [student.course] : []);
          populateCourses(semesterSelect.value, pre);
        } else if (courseSelect) {
          const pre = Array.isArray(student.course) ? student.course : (student.course ? [student.course] : []);
          populateCourses("", pre);
        }

        studentIdInput.value = student.id;
        submitBtn.textContent = "Update Student";
        cancelBtn.classList.remove("hidden");
      }
    }

    if (e.target.classList.contains("delete")) {
      const id = e.target.dataset.id;
      if (confirm("Are you sure you want to delete this student?")) {
        const res = await fetch(`/students/${id}`, { method: "DELETE" });
        if (res.ok) {
          fetchStudents();
        } else {
          const errText = await res.text();
          console.error("❌ Delete failed:", errText);
          alert("Delete failed: " + errText);
        }
      }
    }
  });

  if (courseSelect) {
    courseSelect.innerHTML = `<option value="" selected disabled>Select course</option>`;
    courseSelect.disabled = true;
  }
  fetchStudents();
});
