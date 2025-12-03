Pareeksha: Real-Time Coding Examination Platform 👨‍💻
Pareeksha is a fully-featured, real-time coding examination platform designed with a dual-application architecture to facilitate secure, synchronized, and automated technical assessments.

✨ Features
This platform provides a comprehensive workflow for exam management, from distribution to evaluation, offering:

Dual-Application Architecture: Separate applications for Students (Client) and Teachers (Admin).

Secure Authentication: Robust user login system.

AI-Driven Proctoring: Real-time monitoring of students during the exam for academic integrity (inferred from face-api.js and face.html).

Live Synchronization: Real-time updates and synchronization of exam status and code.

Automated Evaluation: System for automatically scoring coding submissions.

Complete Exam Management Workflow: Tools for creating, distributing, and managing examinations.

🛠️ Technology Stack
The project utilizes a web-based architecture packaged for desktop use (likely Electron based on the file structure and dual-app description) with a focus on real-time capabilities.

Frontend: HTML, JavaScript (Inferred: Web technologies for the UI).

Backend/Runtime: Node.js (inferred from package.json, server.js, main.js).

Database: Firebase (inferred from firebase-init.js) and SQLite (inferred from users.db).

AI/Proctoring: face-api.js (for face detection/recognition).

🚀 Getting Started
Follow these steps to set up the project locally.

1. Clone the Repository
Clone the project to your local machine:

Bash

git clone https://github.com/sidxrth/pareeksha.git
cd pareeksha
2. Installation
Install the necessary dependencies using npm:

Bash

npm install
3. Crucial Setup Step (Separate Apps)
The Student Project (default app) and the Teacher Project are designed to run independently and may conflict if run from the same location.

⚠️ IMPORTANT: For smooth operation, you must copy the TeacherProject folder to a separate location on your system before running the applications.

Bash

# Example: Copy the Teacher App to a separate folder outside the main project
cp -R TeacherProject /path/to/another/directory/Teacher_App_Standalone
4. Running the Applications
A. Running the Student App (Default Project)
The core directory (pareeksha/) contains the Student App. Run it from the main directory:

Bash

npm start
B. Running the Teacher App
Navigate to the separate directory where you copied the Teacher App folder (/path/to/another/directory/Teacher_App_Standalone in the example above) and run it from there. You may need to run installation steps again if you moved the project.
