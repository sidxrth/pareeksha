Pareeksha: Real-Time Coding Examination & AI Proctoring Platform

Pareeksha is a real-time coding examination platform built with a dual-application architecture: one application for students and another for teachers. It supports live code monitoring, automated evaluation, secure authentication, and in-browser AI proctoring using face-api.js.

The system is designed to be lightweight, scalable, and privacy-first. All face detection and proctoring logic runs inside the student's browser. No video or image data is ever uploaded.

FEATURES

Dual Student and Teacher applications

Browser-based AI proctoring (face detection, face missing, multiple faces)

Real-time code synchronization between student and teacher

Automated code evaluation with test-case checking

Secure login and user management

Full examination workflow: create exams, assign students, monitor, evaluate

SYSTEM ARCHITECTURE

Pareeksha uses an event-driven real-time design:

Student Application
Runs the coding environment and AI proctoring logic locally.

Node.js Event Relay Server
Receives and validates proctoring events.

Firebase Realtime Database
Stores and streams events instantly.

Teacher Dashboard Application
Displays real-time alerts and exam activity.

FOLDER STRUCTURE

pareeksha/
├── server/ (Backend Node.js event relay)
├── student/ (Student interface + AI proctoring)
├── TeacherProject/ (Teacher dashboard)
├── models/ (ML models for face detection)
├── assets/ (For screenshots/diagrams if added later)
├── README.md
└── LICENSE

GETTING STARTED

Clone the repository
git clone https://github.com/sidxrth/pareeksha

cd pareeksha

Install dependencies
npm install

RUNNING THE APPLICATIONS

STUDENT APPLICATION
Run the student application:

npm start

Then open:
student/index.html

TEACHER APPLICATION (MUST BE IN A SEPARATE FOLDER)

The teacher project must be run from outside the main directory.

Copy the teacher project:
cp -R TeacherProject ../Teacher_App

Then run it:
cd ../Teacher_App
npm install
npm start

Open:
TeacherProject/index.html

AI PROCTORING WORKFLOW

Webcam activates in the student's browser

AI models load locally (face-api.js)

Face detection runs continuously

Anomaly events are generated (face missing, multiple faces, etc.)

Node.js server validates the event

Firebase stores the event

Teacher dashboard receives alerts in real time

All proctoring logic runs locally on the student's device for privacy.
