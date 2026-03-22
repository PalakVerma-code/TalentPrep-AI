# AI Interview Coach 🤖🎤

An AI-powered interview preparation platform that simulates real interview scenarios using text and voice interaction, evaluates user responses, and generates personalized feedback and skill-gap reports.

---

## 🚀 Overview

AI Interview Coach helps students and job seekers practice technical and behavioral interviews in a realistic environment. The system asks questions, evaluates responses using AI, detects weaknesses, and provides actionable improvement insights.

This project demonstrates full-stack development, AI integration, voice interaction, authentication, and secure data handling.

---

## ✨ Key Features

### 🧠 AI-Powered Interview Questions

* Generates dynamic interview questions based on:

  * User resume
  * Selected mode (with resume / without resume)

### 🎤 Voice Interview Mode

* AI reads questions aloud
* Users can answer by speaking
* Speech is converted to text automatically

### 📝 Real-Time AI Feedback

* Each answer is evaluated by AI
* Users receive:

  * feedback
  * improved answer suggestion
  * performance score

### 📄 Resume-Based Interviewing

* Users can upload a resume
* AI extracts text from the resume and generates personalized questions

### 📊 Skill Gap & Weakness Detection Report

* After multiple interview sessions, users can generate a full performance report including:

  * strengths
  * weaknesses
  * topics to improve
  * overall summary

### 🔐 User Authentication & Data Ownership

* Secure login system
* Each user can only access their own interview sessions

### 🗂️ Session History Dashboard

* Users can view past interview sessions and feedback

---

## 🧱 Technologies Used

### Frontend

* **React** – UI development
* **Vite** – Fast development and build tool
* **CSS** – Styling
* **Web Speech API** – Voice recognition and speech synthesis

### Backend

* **Node.js** – Runtime environment
* **Express.js** – API and server logic

### Database & Authentication

* **Supabase** – PostgreSQL database + authentication + row level security

### AI Integration

* **Google Gemini API** – Used for:

  * generating interview questions
  * evaluating answers
  * generating skill-gap reports

### File Processing

* **Multer** – Resume upload handling
* **PDF text extraction library** – To extract resume content for AI analysis

---

## 🧠 How the System Works

1. User logs into the platform
2. User starts an interview session
3. User may upload a resume (optional)
4. AI generates questions
5. User answers using text or voice
6. AI evaluates each answer and stores feedback
7. All sessions are saved securely in the database
8. User can generate a skill-gap report based on all past sessions

---

## 🛠️ Installation & Setup

### 1. Clone the repository

```
git clone <your-repo-url>
cd <project-folder>
```

### 2. Install dependencies

```
npm install
```

### 3. Create environment variables

Create a `.env` file and add:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the development server

```
npm run dev
```

### 5. Start backend server

```
npm run dev
```

---

## 👤 How to Use the Application

### Step 1: Sign Up / Log In

Create an account or log in using your credentials.

### Step 2: Start an Interview

* Choose whether you want to upload a resume or proceed without it
* The system will generate AI-based questions

### Step 3: Answer Questions

You can answer in two ways:

* Typing your response
* Using voice mode to speak your answer

### Step 4: View Feedback

After submitting each answer, you will see:

* AI feedback
* Improved answer suggestion
* Score for your response

### Step 5: Review Past Sessions

Go to your dashboard to view all previous interviews and feedback.

### Step 6: Generate Skill Gap Report

Click on **Generate Skill Gap Report** to receive:

* Your strengths
* Your weaknesses
* Topics you should study next
* Overall performance summary

---

## 🔒 Security Features

* Row Level Security (RLS) ensures users can only access their own data
* Resume uploads are restricted to PDF format
* API routes include validation and error handling
* Sensitive keys are stored in environment variables

---

## 📈 Future Improvements

* Export skill reports as PDF
* Add performance graphs and progress tracking
* Support for multiple languages in voice mode
* Mock HR behavioral interview mode

---

## 🤝 Contribution

Contributions are welcome. You can fork the repository and submit pull requests with improvements or new features.

---

## 📄 License

This project is intended for educational and portfolio purposes.
