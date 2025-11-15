// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const db = require('./database.js'); // Assuming database.js is created and exports the DB object
const path = require('path');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- MODULES FOR CODE EXECUTION ---
const { exec } = require('child_process');
const fs = require('fs');
// --- END MODULES ---

// -----------------------------------------------------------
// --- Firebase Admin SDK Setup (ACTIVATED) ---
// -----------------------------------------------------------
const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json"); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();
// -----------------------------------------------------------


// --- Gemini API Key ---
const genAI = new GoogleGenerativeAI("AIzaSyB0mT4FcMneMkFRaZXbgjQ7nIGosPoXF9c");

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

const port = 3000;
let otpStore = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: 'fdecoder@gmail.com', 
        pass: 'xdwlnjwbhhhghtnl' 
    }
});

// Function to send the completion email
function sendCompletionEmail(email, examName, score) {
    const mailOptions = {
        from: 'fdecoder@gmail.com',
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
        from: 'fdecoder@gmail.com',
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

// MODIFICATION: Update /register endpoint to perform uniqueness check and save to both DBs
app.post('/register', (req, res) => {
    const { name, rollno, email, examType, examId } = req.body;

    // --- 1. UNQIUENESS CHECK (SQLite) ---
    const checkSql = `
        SELECT id FROM users 
        WHERE exam_id = ? AND (email = ? OR rollno = ?)
    `;

    db.get(checkSql, [examId, email, rollno], (err, row) => {
        if (err) {
            console.error('DB Error (Uniqueness Check):', err.message);
            return res.status(500).json({ message: `Database error during registration check: ${err.message}` });
        }
        
        if (row) {
            return res.status(400).json({ message: 'Error: This student is already registered for this examination.' });
        }
        
        // --- 2. Store user details in SQLite (Primary storage) ---
        const sqliteSql = `INSERT INTO users (name, rollno, email, exam_type, exam_id, face_descriptor) VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(sqliteSql, [name, rollno, email, examType, examId, null], function(sqliteErr) {
            if (sqliteErr) {
                console.error('DB Error (Register to SQLite):', sqliteErr.message);
                return res.status(500).json({ message: `Failed to register user to SQLite: ${sqliteErr.message}` });
            }
            
            // --- 3. Store details in Firebase (Secondary storage) ---
            try {
                const firebaseDocId = `${email}_${examId}`;
                
                console.log(`[FIREBASE ACTION - REGISTER] Preparing registration data for document: ${firebaseDocId}`);

                firestore.collection('registrations').doc(firebaseDocId).set({
                    name: name,
                    rollno: rollno,
                    email: email,
                    examId: examId,
                    examType: examType,
                    score: null, 
                    timestamp: admin.firestore.FieldValue.serverTimestamp() 
                }, { merge: false });

            } catch (firebaseError) {
                console.error('FIREBASE WRITE FAILED:', firebaseError);
            }
            
            res.status(201).json({ message: 'User registered.' });
        });
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

app.get('/get-user-face-data', (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ message: 'Email query parameter is required.' });
    }
    
    const sql = 'SELECT face_descriptor FROM users WHERE email = ?';
    db.get(sql, [email], (err, row) => {
        if (err) {
            console.error('DB Error (Get User Face Data):', err.message);
            return res.status(500).json({ message: 'Database error occurred.' });
        }
        if (!row || !row.face_descriptor) {
            return res.status(404).json({ message: 'User profile or face data not found.' });
        }
        res.status(200).json({ face_descriptor: row.face_descriptor });
    });
});


// --- CODE COMPILATION AND EXECUTION (MODIFIED FOR CLEANING AND EXECUTION FIX) ---
app.post('/compile-and-run', (req, res) => {
    let { userCode, language, inputData } = req.body;
    const tempFileName = `temp_${Date.now()}`;
    let fileExtension, compileCommand, runCommand;

    // FIX 1: Sanitize code to remove invisible Unicode/stray characters
    const cleanUserCode = userCode.replace(/[^\x00-\x7F\n\r\t]/g, '');

    switch (language.toLowerCase()) {
        case 'c':
            fileExtension = 'c';
            compileCommand = `gcc ${tempFileName}.c -o ${tempFileName}.out`;
            // FIX 2: Use executable name directly (Windows execution fix)
            runCommand = `${tempFileName}.out`; 
            break;
        case 'java':
            fileExtension = 'java';
            compileCommand = `javac ${tempFileName}.java`;
            runCommand = `java -cp . ${tempFileName}`; 
            break;
        case 'python':
            fileExtension = 'py';
            compileCommand = null; 
            runCommand = `python ${tempFileName}.py`; 
            break;
        default:
            return res.status(400).json({ message: 'Unsupported language for compilation.' });
    }

    const fullFileName = `${tempFileName}.${fileExtension}`;
    
    const codeToWrite = language.toLowerCase() === 'java' 
        ? cleanUserCode.replace(/class\s+Solution/g, `class ${tempFileName}`)
        : cleanUserCode;

    fs.writeFile(fullFileName, codeToWrite, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to write temporary file.' });

        const cleanup = () => {
            try {
                fs.unlinkSync(fullFileName);
                if (language.toLowerCase() === 'c') {
                    fs.unlinkSync(`${tempFileName}.out`);
                } else if (language.toLowerCase() === 'java') {
                    fs.unlinkSync(`${tempFileName}.class`);
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        };

        const executeCode = (execCmd, input) => {
            const executionProcess = exec(execCmd, { timeout: 5000 }, (runtimeErr, stdout, stderr) => {
                cleanup();

                if (runtimeErr) {
                    const commandOutput = `Command failed: ${execCmd}\n${stderr || stdout}`;
                    if (runtimeErr.signal === 'SIGTERM' || runtimeErr.killed) {
                        return res.status(400).json({ status: 'TIMEOUT', output: 'Execution Timed Out (Max 5s).', error: 'Process execution exceeded 5 seconds. This usually indicates an infinite loop or high complexity.' });
                    }
                    return res.status(400).json({ status: 'RUNTIME_ERROR', output: commandOutput, error: runtimeErr.message });
                }
                
                res.status(200).json({ status: 'SUCCESS', output: stdout.trim(), error: stderr.trim() });
            });

            if (input) {
                executionProcess.stdin.write(input);
                executionProcess.stdin.end();
            }
        };

        if (compileCommand) {
            exec(compileCommand, { timeout: 3000 }, (compileErr, stdout, stderr) => {
                if (compileErr) {
                    cleanup();
                    const commandOutput = `Command failed: ${compileCommand}\n${stderr || stdout}`;
                    return res.status(400).json({ status: 'COMPILE_ERROR', output: commandOutput, error: compileErr.message });
                }
                
                executeCode(runCommand, inputData);
            });
        } else {
            executeCode(runCommand, inputData);
        }
    });
});


// MODIFICATION: Update /submit-exam endpoint (Robust AI Grading Logic)
app.post('/submit-exam', async (req, res) => {
    const { email, exam, userCode, timeRemaining, isCorrect, submittedQuestion, examId } = req.body; 
    let score = 0;

    const examFullName = exam === 'program' ? 'Programming Exam' : 
                         exam === 'mcq' ? 'Multiple Choice Exam' :
                         exam === 'theory' ? 'Theory Exam' : submittedQuestion?.title || 'Unknown Exam';

    // 1. Calculate Score (Gemini AI grading logic)
    if (isCorrect && timeRemaining > 0) {
        // Path 1: Test Case Passed (Full Score)
        score = 50;
    } else if (isCorrect === false && timeRemaining > 0) {
        // Path 2: Test Case Failed (Score 1-49, graded by AI)
        
        let aiScore = 1; // Default minimum score if everything fails

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
            
            const testInput = submittedQuestion.test_input || 'N/A';
            const expectedOutput = submittedQuestion.expected_output || 'N/A';
            const actualOutput = submittedQuestion.actual_output || 'N/A'; 
            const problemDescription = submittedQuestion.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

            const prompt = `
                You are an automated grading system. The student's code failed the hardcoded test case. Evaluate the code based on the detailed context provided.
                
                The final score must be in the range of 1 to 49 (inclusive). A score of 50 is reserved for passing all test cases.
                
                --- EVALUATION CONTEXT ---
                Question Title: ${submittedQuestion.title}
                Problem Description: ${problemDescription}
                Language: ${submittedQuestion.language}
                
                --- TEST CASE FAILURE DETAILS ---
                Input: \n${testInput}\n
                Expected Output: \n${expectedOutput}\n
                Student's Actual Output: \n${actualOutput}\n

                --- GRADING CRITERIA ---
                1. Correctness (Weight 40%): How close is the logic/output to the expected result?
                2. Logic/Algorithm (Weight 40%): Soundness and efficiency of the approach.
                3. Readability/Structure (Weight 20%): Quality of code organization and comments.

                Assign a final score from 1 to 49.
                Provide ONLY the final score as a single integer number. DO NOT include any text, reasoning, or markdown formatting (e.g., no asterisks, no quotes, no code blocks, just the number).
            `;
            
            const result = await model.generateContent(prompt);
            const response = result.response;
            
            // FIX 1: Safely convert response text to string and trim to prevent AI error
            const text = String(response.text || '').trim(); 
            
            const parsedScore = parseInt(text, 10);
            
            // FIX 2: Correctly assign and clamp AI score between 1 and 49
            if (!isNaN(parsedScore)) {
                aiScore = Math.min(49, Math.max(1, parsedScore)); 
            } else {
                console.warn(`AI returned non-numeric score: "${text}". Defaulting to 1.`);
            }
            
            score = aiScore;

        } catch (error) {
            console.error("Gemini AI Error:", error);
            score = 1; // Score is 1 on AI error
        }
    } else {
        // Path 3: Time ran out or Malpractice redirect (score=0 enforced)
         score = 0;
    }

    // 3. Update Score in SQLite (Primary Storage)
    const sqliteSql = `UPDATE users SET score = ? WHERE email = ? AND exam_id = ?`; 
    
    db.run(sqliteSql, [score, email, examId], function(err) {
        if (err) {
            console.error('DB Error (Submit Exam):', err.message);
        }
        
        if (this.changes === 0) {
            console.error(`[DB FAILED] UPDATE affected 0 rows. User/Exam combination not found in DB. Falling back.`);
            const fallbackSql = `UPDATE users SET score = ? WHERE email = ?`;
             db.run(fallbackSql, [score, email], (err) => {
                 if (err || this.changes === 0) {
                     console.error(`[DB CRITICAL FAILED] Could not save score for ${email}.`);
                 } else {
                     console.log(`[DB SUCCESS] Score saved using fallback for ${email}.`);
                 }
             });
        }
        
        // 4. Update Score in Firebase (Secondary Storage)
        try {
            const firebaseDocId = `${email}_${examId}`; 
            
            console.log(`[FIREBASE ACTION - SUBMIT] Updating score (${score}) for document: ${firebaseDocId}`);

            firestore.collection('registrations').doc(firebaseDocId).set({
                score: score, 
                submissionTime: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
        } catch (firebaseError) {
            console.error('FIREBASE SCORE UPDATE FAILED:', firebaseError);
        }

        // 5. Final response and email
        sendCompletionEmail(email, examFullName, score);
        
        res.status(200).json({ message: 'Exam submitted!', score: score });
    });
});


app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(port, () => console.log(`Backend server listening at http://localhost:${port}`));