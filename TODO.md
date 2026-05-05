# 📋 Camstack - Face Recognition Attendance System - TODO

## Phase 1: Backend (FastAPI) ✅
- [x] Create TODO.md
- [x] Create `backend/requirements.txt`
- [x] Create `backend/.env.example`
- [x] Move `best.pt` → `backend/models/best.pt`
- [x] Create `backend/models/student_id_map.json`
- [x] Create `backend/app/__init__.py`
- [x] Create `backend/app/config.py`
- [x] Create `backend/app/database.py`
- [x] Create `backend/app/models/` (student, session, attendance)
- [x] Create `backend/app/services/face_detector.py`
- [x] Create `backend/app/services/tracker.py`
- [x] Create `backend/app/utils/image_utils.py`
- [x] Create `backend/app/utils/export.py`
- [x] Create `backend/app/routes/students.py`
- [x] Create `backend/app/routes/detection.py`
- [x] Create `backend/app/routes/sessions.py`
- [x] Create `backend/app/routes/websocket.py`
- [x] Create `backend/app/main.py`
- [x] Create `backend/Dockerfile`

## Phase 2: Frontend (React + Vite + Tailwind) ✅
- [x] Create `frontend/package.json`
- [x] Create `frontend/vite.config.js`
- [x] Create `frontend/tailwind.config.js`
- [x] Create `frontend/postcss.config.js`
- [x] Create `frontend/index.html`
- [x] Create `frontend/.env.example`
- [x] Create `frontend/jsconfig.json`
- [x] Create `frontend/src/main.jsx`
- [x] Create `frontend/src/App.jsx`
- [x] Create `frontend/src/index.css`
- [x] Create `frontend/src/lib/utils.js`
- [x] Create `frontend/src/services/api.js`
- [x] Create `frontend/src/hooks/useWebSocket.js`
- [x] Create `frontend/src/context/ThemeContext.jsx`
- [x] UI primitives (button, card, input, badge, dialog, table)
- [x] Create `frontend/src/components/Navbar.jsx`
- [x] Create `frontend/src/components/Footer.jsx`
- [x] Create `frontend/src/components/Layout.jsx`
- [x] Create `frontend/src/components/ThemeToggle.jsx`
- [x] Create `frontend/src/components/UploadZone.jsx`
- [x] Create `frontend/src/components/ResultDisplay.jsx`
- [x] Create `frontend/src/components/RealtimeCamera.jsx`
- [x] Create `frontend/src/components/AttendanceList.jsx`
- [x] Create `frontend/src/components/StatsCard.jsx`
- [x] Create `frontend/src/pages/Dashboard.jsx`
- [x] Create `frontend/src/pages/UploadPage.jsx`
- [x] Create `frontend/src/pages/RealtimePage.jsx`
- [x] Create `frontend/src/pages/StudentsPage.jsx`
- [x] Create `frontend/src/pages/HistoryPage.jsx`

## Phase 3: Docs & DevOps ✅
- [x] Create root `README.md`
- [x] Create `docker-compose.yml`
- [x] Create `.gitignore`

## 🎉 Project scaffolded! Next steps for the user:

1. **Install backend deps**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate         # Windows
   pip install -r requirements.txt
   copy .env.example .env
   ```
2. **Install frontend deps**
   ```bash
   cd frontend
   copy .env.example .env
   npm install
   ```
3. **Start MongoDB** (local or `docker run -d -p 27017:27017 mongo:7`).
4. **Edit `backend/models/student_id_map.json`** to map your YOLO classes to student IDs.
5. **Seed students** via Students page or API.
6. **Run**:
   - Backend: `uvicorn app.main:app --reload` (from `backend/`)
   - Frontend: `npm run dev` (from `frontend/`)
7. Open http://localhost:5173
