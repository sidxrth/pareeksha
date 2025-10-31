// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const db = require('./database.js'); // Assuming database.js is created and exports the DB object
const path = require('path');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Gemini API Key ---
// Replace "YOUR_API_KEY" with your actual Gemini API key
const genAI = new GoogleGenerativeAI("AIzaSyB0mT4FcMneMkFRaZXbgjQ7nIGosPoXF9c");

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

const port = 3000;
let otpStore = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'fdecorder@gmail.com', pass: 'xdwlnjwbhhhghtnl' }
});

// Function to send the completion email
function sendCompletionEmail(email, examName, score) {
    const mailOptions = {
        from: 'fdecorder@gmail.com',
        to: email,
        subject: `Pareeksha Exam Submission: ${examName}`,
        text: `Dear Student,\n\nYour ${examName} exam has been submitted and graded.\n\nYour score: ${score} / 50\n\nThank you for taking the exam.\n\nSincerely,\nThe Pareeksha Team`
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Completion Email Error:', error);
        } else {
            console.log('Completion Email sent: ' + info.response);
        }
    });
}


app.post('/generate-otp', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, timestamp: Date.now() };
    console.log(`\n\n>>>> OTP for ${email}: ${otp} <<<<\n\n`);
    const mailOptions = {
        from: 'fdecorder@gmail.com',
        to: email,
        subject: 'Your Pareeksha Verification Code',
        text: `Your OTP for registration is: ${otp}. It is valid for 5 minutes.`
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Email Error:', error);
            return res.status(500).json({ message: 'Failed to send OTP email, but it is available in the terminal.' });
        }
        console.log('Email sent: ' + info.response);
        res.status(200).json({ message: 'OTP has been sent to your email.' });
    });
});

app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const storedOtpData = otpStore[email];
    if (!storedOtpData || storedOtpData.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP.' });
    }
    if (Date.now() - storedOtpData.timestamp > 300000) {
        delete otpStore[email];
        return res.status(400).json({ message: 'OTP has expired.' });
    }
    delete otpStore[email];
    res.status(200).json({ message: 'OTP verified.' });
});

app.post('/register', (req, res) => {
    const { name, city, email, exam } = req.body;
    const sql = `INSERT INTO users (name, city, email, exam) VALUES (?, ?, ?, ?)`;
    db.run(sql, [name, city, email, exam], function(err) {
        if (err) {
            console.error('DB Error (Register):', err.message);
            return res.status(500).json({ message: 'Failed to register.' });
        }
        res.status(201).json({ message: 'User registered.' });
    });
});

app.post('/store-face-data', (req, res) => {
    const { email, faceDescriptors } = req.body;
    if (!email || !faceDescriptors || !Array.isArray(faceDescriptors) || faceDescriptors.length === 0) {
        return res.status(400).json({ message: 'Email and a valid array of face descriptors are required.' });
    }
    const descriptorsString = JSON.stringify(faceDescriptors);
    const sql = `UPDATE users SET face_descriptor = ? WHERE email = ?`;
    db.run(sql, [descriptorsString, email], function(err) {
        if (err) {
            console.error('DB Error (Face Data):', err.message);
            return res.status(500).json({ message: 'Failed to store biometric data.' });
        }
        res.status(200).json({ message: 'Biometric profile saved.' });
    });
});

// --- NEW ENDPOINT: Retrieve single user's face data for client-side proctoring ---
app.get('/get-user-face-data', (req, res) => {
    const { email } = req.query;
    if (!email) {
        // Send JSON error if email is missing
        return res.status(400).json({ message: 'Email query parameter is required.' });
    }
    
    // Select the face_descriptor for the specific user
    const sql = 'SELECT face_descriptor FROM users WHERE email = ?';
    db.get(sql, [email], (err, row) => {
        if (err) {
            console.error('DB Error (Get User Face Data):', err.message);
            return res.status(500).json({ message: 'Database error occurred.' });
        }
        if (!row || !row.face_descriptor) {
            // Send JSON error if descriptor is missing/user not found
            return res.status(404).json({ message: 'User profile or face data not found.' });
        }
        // Send the descriptor string back in a JSON object
        res.status(200).json({ face_descriptor: row.face_descriptor });
    });
});

app.get('/get-all-face-data', (req, res) => {
    const sql = 'SELECT email, name, city, exam, face_descriptor FROM users WHERE face_descriptor IS NOT NULL';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('DB Error (Get All Data):', err.message);
            return res.status(500).json({ message: 'Failed to get user data.' });
        }
        const users = rows.map(user => {
            try {
                return { ...user, face_descriptor: JSON.parse(user.face_descriptor) };
            } catch (e) {
                return { ...user, face_descriptor: null };
            }
        }).filter(user => user.face_descriptor);
        res.status(200).json({ users });
    });
});

// --- EXAM SUBMISSION & SCORING ---
app.post('/submit-exam', async (req, res) => {
    // --- MODIFICATION: Receive the new submittedQuestion object ---
    const { email, exam, userCode, timeRemaining, isCorrect, submittedQuestion } = req.body;
    let score = 0;

    // FIX: Map the generic exam slug to a user-friendly name
    const examFullName = exam === 'program' ? 'Programming Exam' : 
                         exam === 'mcq' ? 'Multiple Choice Exam' :
                         exam === 'theory' ? 'Theory Exam' : submittedQuestion?.title || 'Unknown Exam';

    // 1. Scoring Logic: Award 50 if client-side check passed AND time remains.
    if (isCorrect && timeRemaining > 0) {
        score = 50;
    } else {
        // 2. AI Evaluation Logic for partial/incorrect scores
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
            
            // Construct a detailed prompt for Gemini
            const prompt = `
                You are an automated grading system. Evaluate the student's submitted code against the provided programming question.
                
                The maximum score is 50.
                
                --- QUESTION DETAILS ---
                Title: ${submittedQuestion.title}
                Description: ${submittedQuestion.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')}
                Language: ${exam}
                
                --- SUBMITTED CODE ---
                \`\`\`${exam === 'c' ? 'c' : exam}\n${userCode}\n\`\`\`

                --- EVALUATION CRITERIA ---
                1. Correctness: Does the code solve the problem? (40% weight)
                2. Logic/Algorithm: Is the approach sound, even if incomplete? (40% weight)
                3. Readability/Structure: Is the code well-organized and commented? (20% weight)

                Assign a final score from 0 to 49. A score of 50 is reserved for perfectly correct and optimal solutions.
                The student failed the single automated test case on the client side.
                
                Provide ONLY the final score as a single integer number. DO NOT include any text, reasoning, or markdown formatting (e.g., no asterisks, no quotes, no code blocks, just the number).
            `;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text.trim();
            
            // Extract the score, ensuring it's an integer between 0 and 49 (inclusive)
            const parsedScore = parseInt(text, 10);
            score = isNaN(parsedScore) ? 1 : Math.min(49, Math.max(0, parsedScore)); 

        } catch (error) {
            console.error("Gemini API Error:", error);
            score = 1; // Assign a minimum score if AI fails
        }
    }
    // --- END MODIFICATION ---

    const sql = `UPDATE users SET score = ? WHERE email = ? AND exam = ?`;
    
    // --- DEBUGGING LOGIC ---
    console.log(`\n[DB DEBUG] Score generated: ${score}`);
    console.log(`[DB DEBUG] Attempting to update user: ${email} for exam: ${exam}`);
    console.log(`[DB DEBUG] Query parameters: [${score}, ${email}, ${exam}]`);
    // -----------------------

    db.run(sql, [score, email, exam], function(err) {
        if (err) {
            console.error('DB Error (Submit Exam):', err.message);
            return res.status(500).json({ message: 'Failed to save score. (DB Error)' }); 
        }
        
        if (this.changes === 0) {
            console.error(`[DB FAILED] UPDATE affected 0 rows. User/Exam combination not found in DB.`);
            return res.status(404).json({ message: 'Error: User not found in database or exam name mismatch.' }); 
        }
        
        // Send Email after successful DB update (New Requirement)
        sendCompletionEmail(email, examFullName, score);
        
        console.log(`[DB SUCCESS] Score saved for ${email}. Rows affected: ${this.changes}`);
        res.status(200).json({ message: 'Exam submitted!', score: score });
    });
});


app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(port, () => console.log(`Backend server listening at http://localhost:${port}`));