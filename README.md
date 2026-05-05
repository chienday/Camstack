# 📸 Camstack — AI Face-Recognition Attendance

A modern full-stack web application for **classroom attendance via AI face recognition**. Upload photos/videos or stream live from a webcam — the system identifies students in real-time using a YOLO model (`best.pt`) and records attendance in MongoDB.

<p align="center">
  <em>FastAPI · MongoDB · YOLO / Ultralytics · React + Vite · TailwindCSS · Framer Motion · WebSocket</em>
</p>

---

## ✨ Features

- 🖼️ **Upload Image/Video Detection** — drag & drop files, view annotated output + detections table
- 🎥 **Realtime Attendance** — live webcam stream over WebSocket, bounding boxes overlaid, animated list of checked-in students, audible notification on new check-in
- ✅ **Tracking logic** — students only counted once per session; confidence threshold + N-consecutive-frame confirmation to eliminate false positives
- 👥 **Students CRUD** — manage student records (MSSV, name, class, email)
- 📚 **Attendance History** — browse sessions, filter by class/date, export to Excel (`.xlsx`)
- 📊 **Dashboard** — stats cards + Recharts weekly charts
- 🌓 **Dark / Light Mode** — glassmorphism design with gradient pastel palette (indigo → fuchsia → pink)
- 📱 **Fully Responsive** — Desktop, Tablet, Mobile

---

## 🏗️ Tech Stack

| Layer       | Technology                                                             |
| ----------- | ---------------------------------------------------------------------- |
| Frontend    | React 18, Vite, TailwindCSS, Radix UI, Framer Motion, Axios, Sonner    |
| Backend     | FastAPI, Uvicorn, Motor (async MongoDB), WebSockets                    |
| Database    | MongoDB 7                                                              |
| AI / CV     | PyTorch, Ultralytics YOLO (`best.pt`), OpenCV, Pillow                  |
| Export      | openpyxl                                                               |

---

## 📂 Project Structure

```
Camstack/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry
│   │   ├── config.py            # pydantic-settings
│   │   ├── database.py          # Motor connection
│   │   ├── models/              # Pydantic schemas
│   │   ├── routes/              # students, detection, sessions, websocket
│   │   ├── services/            # face_detector (YOLO), tracker (confirmation)
│   │   └── utils/               # image_utils, export (Excel)
│   ├── models/
│   │   ├── best.pt              # YOUR YOLO model
│   │   └── student_id_map.json  # class index/name → student_id
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router + theme + toaster
│   │   ├── main.jsx
│   │   ├── components/          # Navbar, Layout, UploadZone, RealtimeCamera, AttendanceList, ui/*
│   │   ├── pages/               # Dashboard, UploadPage, RealtimePage, StudentsPage, HistoryPage
│   │   ├── hooks/               # useWebSocket
│   │   ├── services/            # api.js (axios)
│   │   └── context/             # ThemeContext
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start

### Option A — Docker (recommended)

```bash
# 1. Make sure best.pt is at backend/models/best.pt
# 2. Adjust backend/models/student_id_map.json to map your YOLO classes to student IDs
# 3. Start backend + MongoDB
docker compose up --build

# 4. In another terminal, run the frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

### Option B — Manual

**Backend**

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # edit if needed

# Start MongoDB locally (or via docker run -d -p 27017:27017 mongo:7)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

**Frontend**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

---

## 🧠 Configure Your YOLO Model

1. Place your trained YOLO weights at `backend/models/best.pt`.
2. Edit `backend/models/student_id_map.json` to map each **class index or class name** produced by your model to a **student_id**:

   ```json
   {
     "0": "SV001",
     "1": "SV002",
     "Nguyen_Van_A": "SV001"
   }
   ```

   - Keys can be the numeric class index as a string, OR the class name string returned by the model.
   - Values MUST match `student_id` fields stored in the `students` collection so names resolve.
3. Add the corresponding students via **Students** page or the API `POST /api/students`.

---

## 🔌 Key API Endpoints

| Method | Endpoint                                  | Description                      |
| ------ | ----------------------------------------- | -------------------------------- |
| GET    | `/api/health`                             | Liveness probe                   |
| GET    | `/api/students`                           | List students                    |
| POST   | `/api/students`                           | Create student                   |
| PUT    | `/api/students/{id}`                      | Update student                   |
| DELETE | `/api/students/{id}`                      | Delete student                   |
| POST   | `/api/detect/image`                       | Detect faces in uploaded image   |
| POST   | `/api/detect/video`                       | Detect faces in uploaded video   |
| POST   | `/api/sessions/start`                     | Start a new attendance session   |
| POST   | `/api/sessions/{id}/end`                  | End an attendance session        |
| GET    | `/api/sessions`                           | List sessions                    |
| GET    | `/api/sessions/{id}/records`              | Records for a session            |
| GET    | `/api/sessions/{id}/export/excel`         | Export records as Excel          |
| GET    | `/api/sessions/stats/overview`            | Dashboard stats                  |
| WS     | `/ws/attendance/{session_id}`             | Realtime attendance stream       |

### WebSocket Protocol

**Client → Server**

```json
{ "type": "frame", "frame": "data:image/jpeg;base64,..." }
```

**Server → Client**

```json
{
  "type": "frame_result",
  "frame": "base64_processed_frame",
  "detections": [{ "student_id": "SV001", "name": "...", "confidence": 0.95, "bbox": [x1,y1,x2,y2] }],
  "new_attendance": { "student_id": "SV005", "name": "...", "time": "08:15:23" },
  "total_attended": 15,
  "attended_list": [ ... ]
}
```

---

## ⚙️ Important Business Rules

- ✅ A student is recorded **at most once per session**.
- ✅ Only detections with `confidence >= CONFIDENCE_THRESHOLD` (default **0.7**) count.
- ✅ A student must be detected in **`CONFIRMATION_FRAMES` consecutive frames** (default **3**) before being confirmed — prevents false positives.
- ✅ Confirmed records are persisted to the `attendance_records` collection immediately.
- ✅ Upload mode (image/video) also produces records but is not de-duplicated by session.

---

## 🗄️ MongoDB Collections

- **students** — `{ student_id, full_name, class, email, avatar_url, created_at }`
- **attendance_sessions** — `{ session_name, class, teacher, start_time, end_time, total_students, attended_count }`
- **attendance_records** — `{ session_id, student_id, student_name, check_in_time, confidence, method }`

Indexes created automatically on startup:
- `students.student_id` (unique)
- `attendance_records(session_id, student_id)` (unique compound)

---

## 🧪 Development Tips

- Frontend auto-proxies `/api`, `/uploads` and `/ws` to `http://localhost:8000` (see `vite.config.js`).
- Set `VITE_API_URL` / `VITE_WS_URL` in `frontend/.env` to point to a different backend.
- The first run takes time: PyTorch + Ultralytics download CUDA wheels if available.
- If you don't have a GPU, inference still works on CPU (slower).

---

## 📜 License

MIT — adapt freely for academic or commercial use.
