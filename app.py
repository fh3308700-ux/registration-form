from flask import Flask, jsonify, request, render_template, redirect, url_for, session
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import ReturnDocument
import re   # ✅ for password validation

app = Flask(__name__)
app.secret_key = "supersecretkey"  # change in production
app.config["MONGO_URI"] = "mongodb://localhost:27017/studentdb"
mongo = PyMongo(app)

# Collections
students_col = mongo.db.students
users_col = mongo.db.users

# Ensure unique usernames
try:
    users_col.create_index("username", unique=True)
except Exception:
    pass

# ---------------- AUTH -----------------
@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        confirm  = request.form.get("confirm", "").strip()

        # validation
        if not username or not password:
            return render_template("signup.html", error="Username and password are required.")
        if password != confirm:
            return render_template("signup.html", error="Passwords do not match.")

        # strong password policy
        password_pattern = re.compile(
            r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
        )
        if not password_pattern.match(password):
            return render_template(
                "signup.html",
                error="Password must be at least 8 characters, include one uppercase, one lowercase, one digit, and one special character (@$!%*?&)."
            )

        # check existing
        if users_col.find_one({"username": username}):
            return render_template("signup.html", error="Username already exists.")

        # create user
        users_col.insert_one({
            "username": username,
            "password_hash": generate_password_hash(password)
        })
        return redirect(url_for("login"))

    return render_template("signup.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        user = users_col.find_one({"username": username})
        if not user or not check_password_hash(user.get("password_hash", ""), password):
            return render_template("login.html", error="Invalid username or password.")

        session["user"] = username
        return redirect(url_for("index"))

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))


# -------------- HOME / REGISTRATION ---------------
@app.route("/")
def index():
    if "user" not in session:
        return redirect(url_for("signup"))
    return render_template("index.html")


# ---------------- STUDENT API -----------------
@app.route("/students", methods=["GET"])
def get_students():
    if "user" not in session:
        return redirect(url_for("login"))

    students = []
    for s in students_col.find():
        students.append({
            "id": str(s["_id"]),
            "name": s.get("name", ""),
            "roll_no": s.get("roll_no", ""),
            "email": s.get("email", ""),
            "course": s.get("course", [])
        })
    return jsonify(students), 200


@app.route("/students", methods=["POST"])
def add_student():
    if "user" not in session:
        return redirect(url_for("login"))
    data = request.json or {}

    required = ["name", "roll_no", "email", "course"]
    if not all(data.get(k) for k in required):
        return jsonify({"error": "All fields (name, roll_no, email, course) are required"}), 400

    # normalize course list
    courses_in = data.get("course", [])
    if isinstance(courses_in, str):
        courses_in = [courses_in]
    courses_in = [c.strip() for c in courses_in if c and isinstance(c, str)]

    def _dedupe_case_insensitive(items):
        seen, out = set(), []
        for c in items:
            key = c.lower()
            if key not in seen:
                seen.add(key)
                out.append(c)
        return out

    courses_in = _dedupe_case_insensitive(courses_in)

    # check if roll_no already exists -> merge courses
    existing = students_col.find_one({"roll_no": data["roll_no"]})
    if existing:
        existing_courses = existing.get("course", [])
        if isinstance(existing_courses, str):
            existing_courses = [existing_courses]
        merged = _dedupe_case_insensitive(existing_courses + courses_in)

        updated = students_col.find_one_and_update(
            {"_id": existing["_id"]},
            {"$set": {
                "name": data["name"],
                "email": data["email"],
                "course": merged
            }},
            return_document=ReturnDocument.AFTER
        )
        return jsonify({
            "id": str(updated["_id"]),
            "name": updated.get("name", ""),
            "roll_no": updated.get("roll_no", ""),
            "email": updated.get("email", ""),
            "course": updated.get("course", [])
        }), 200

    # new student
    new_doc = {
        "name": data["name"],
        "roll_no": data["roll_no"],
        "email": data["email"],
        "course": courses_in
    }
    result = students_col.insert_one(new_doc)
    new_doc["id"] = str(result.inserted_id)
    return jsonify(new_doc), 201


if __name__ == "__main__":
    print("✅ Flask server running at http://127.0.0.1:5000")
    app.run(debug=True, host="127.0.0.1", port=5000)
