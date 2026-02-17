# VerifyCert - Full Setup Guide

This guide will walk you through the process of setting up and running the **VerifyCert** project on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Docker & Docker Desktop** (Required for OnlyOffice)
- **MongoDB** (You can run it locally or use MongoDB Atlas)
- **LibreOffice** (Required for PDF conversion and thumbnail generation)
- **NPM** (Comes with Node.js)

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone <repository-url>
cd VerifyCert2
```

### 2. Backend Setup (`/server`)
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server` folder and configure the following:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/verifycert
   BASE_URL=http://localhost:3000
   JWT_SECRET=your-secret-key
   
   # Admin Credentials
   ADMIN_EMAIL=admin@vc.com
   ADMIN_PASSWORD=Admin$123
   
   # SMTP Configuration (For Emailing Certificates)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM="VerifyCert <your-email@gmail.com>"
   
   # OnlyOffice Configuration
   ONLYOFFICE_URL=http://localhost:8080
   SERVER_PUBLIC_URL=http://host.docker.internal:5000
   
   # AI Integration
   API_KEY=your-gemini-api-key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup (`/client`)
1. Navigate to the client directory:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### 4. OnlyOffice Docker Setup
The project uses OnlyOffice for document editing. You must run it via Docker.
1. Return to the root directory.
2. Run Docker Compose:
   ```bash
   docker-compose up -d
   ```
   *Note: It may take ~60 seconds for the Document Server to fully initialize.*

---

## 🔧 Important Configurations

### Host Mapping (CRITICAL)
OnlyOffice runs inside a container. For it to communicate back to your Express server (for saving files), you must ensure `host.docker.internal` is mapped.
The provided `docker-compose.yml` already includes:
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```
Ensure your `SERVER_PUBLIC_URL` in the server's `.env` uses `http://host.docker.internal:5000`.

### LibreOffice Path
The backend uses LibreOffice (`soffice`) to generate thumbnails and PDFs. Ensure LibreOffice is installed and its folder is in your system's `PATH`.
On Windows, it usually looks for:
`C:\Program Files\LibreOffice\program\soffice.exe`

---

## 📈 Usage Flow
1. Login with the Admin credentials (from `.env`).
2. Upload a `.docx` template with `{{PLACEHOLDERS}}`.
3. Use the Editor to modify the template.
4. Click **Save Changes** to sync placeholders.
5. Generate PDFs from the "Issue Certificate" or "Bulk Generation" sections.

## 🛠️ Debugging
- **OnlyOffice not loading**: Check `http://localhost:8080` in your browser. If it doesn't show a welcome page, the container isn't ready.
- **Save Failed**: Ensure the server is running and reachable by Docker via `host.docker.internal`.
- **Thumbnail Error**: Verify `soffice` command works in your terminal.
