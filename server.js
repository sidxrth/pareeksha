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

// --- NEW ENDPOINT FOR EXAM SUBMISSION & SCORING ---
app.post('/submit-exam', async (req, res) => {
    const { email, exam, code, timeRemaining, isCorrect } = req.body;
    let score = 0;

    if (isCorrect && timeRemaining > 0) {
        score = 50;
    } else {
        try {
            // --- FIX 1: Changed model name to gemini-2.5-flash ---
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
            const prompt = `
                The following code was submitted for an exam problem. 
                The problem was to find the duplicate number in an array.
                The user's code is:
                \`\`\`${code}\`\`\`
                The user's output was incorrect or they ran out of time. 
                Please analyze the code for correctness, efficiency, and logic.
                Provide a score out of 50. Your response should be a single number.
            `;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = await response.text();
            score = parseInt(text, 10) || 0; // Default to 0 if parsing fails
        } catch (error) {
            console.error("Gemini API Error:", error);
            score = 10; // Assign a default low score if AI fails
        }
    }

    const sql = `UPDATE users SET score = ? WHERE email = ? AND exam = ?`;
    
    // --- DEBUGGING LOGIC: Check parameters before query (Retained for safety) ---
    console.log(`\n[DB DEBUG] Score generated: ${score}`);
    console.log(`[DB DEBUG] Attempting to update user: ${email} for exam: ${exam}`);
    console.log(`[DB DEBUG] Query parameters: [${score}, ${email}, ${exam}]`);
    // --------------------------------------------------------------------------

    db.run(sql, [score, email, exam], function(err) {
        if (err) {
            // This catches actual DB execution errors (like missing 'score' column if fix wasn't applied)
            console.error('DB Error (Submit Exam):', err.message);
            return res.status(500).json({ message: 'Failed to save score. (DB Error)' }); 
        }
        
        // --- FIX 2: Check for 0 rows affected (The initial error you reported) ---
        if (this.changes === 0) {
            console.error(`[DB FAILED] UPDATE affected 0 rows. User/Exam combination not found in DB.`);
            return res.status(404).json({ message: 'Error: User not found in database or exam name mismatch.' }); 
        }
        // --------------------------------------------------------------------------
        
        console.log(`[DB SUCCESS] Score saved for ${email}. Rows affected: ${this.changes}`);
        res.status(200).json({ message: 'Exam submitted!', score: score });
    });
});


app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(port, () => console.log(`Backend server listening at http://localhost:${port}`));