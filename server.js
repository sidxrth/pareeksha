// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const db = require('./database.js'); 
const path = require('path');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
// --- NEW MODULES FOR CODE EXECUTION ---
const { exec } = require('child_process');
const fs = require('fs');
// --- END NEW MODULES ---

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


// --- NEW ENDPOINT: CODE COMPILATION AND EXECUTION ---
app.post('/compile-and-run', (req, res) => {
    const { userCode, language, inputData } = req.body;
    const tempFileName = `temp_${Date.now()}`;
    let fileExtension, compileCommand, runCommand;

    // 1. Determine commands and file extension
    switch (language.toLowerCase()) {
        case 'c':
            fileExtension = 'c';
            compileCommand = `gcc ${tempFileName}.c -o ${tempFileName}.out`;
            runCommand = `./${tempFileName}.out`;
            break;
        case 'java':
            fileExtension = 'java';
            // Use tempFileName for the Java class name to match the file name.
            compileCommand = `javac ${tempFileName}.java`;
            runCommand = `java ${tempFileName}`;
            break;
        case 'python':
            fileExtension = 'py';
            compileCommand = null; 
            // --- FIX: Use 'python' instead of 'python3' for better Windows compatibility ---
            runCommand = `python ${tempFileName}.py`; 
            // ----------------------------------------------------------------------------------
            break;
        default:
            return res.status(400).json({ message: 'Unsupported language for compilation.' });
    }

    const fullFileName = `${tempFileName}.${fileExtension}`;
    
    // For Java, replace the class name in the code to match the temporary filename
    const codeToWrite = language.toLowerCase() === 'java' 
        ? userCode.replace(/class\s+Solution/g, `class ${tempFileName}`)
        : userCode;

    // 2. Write code to a temporary file
    fs.writeFile(fullFileName, codeToWrite, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to write temporary file.' });

        // 3. Define Cleanup function
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

        // 4. Execution logic: Compile (if needed) then Run
        const executeCode = (execCmd, input) => {
            // Set a timeout of 5 seconds for execution
            const executionProcess = exec(execCmd, { timeout: 5000 }, (runtimeErr, stdout, stderr) => {
                cleanup();

                if (runtimeErr) {
                    // Check for timeout
                    if (runtimeErr.signal === 'SIGTERM' || runtimeErr.killed) {
                        return res.status(400).json({ status: 'TIMEOUT', output: 'Execution Timed Out (Max 5s).', error: 'Process execution exceeded 5 seconds. This usually indicates an infinite loop or high complexity.' });
                    }
                    // Capture runtime errors
                    return res.status(400).json({ status: 'RUNTIME_ERROR', output: stderr || stdout, error: runtimeErr.message });
                }
                
                // Return successful output (stdout)
                res.status(200).json({ status: 'SUCCESS', output: stdout.trim(), error: stderr.trim() });
            });

            // Pipe input data to the process
            if (input) {
                executionProcess.stdin.write(input);
                executionProcess.stdin.end();
            }
        };

        // 5. Start Compilation or Execution
        if (compileCommand) {
            exec(compileCommand, { timeout: 3000 }, (compileErr, stdout, stderr) => {
                if (compileErr) {
                    cleanup();
                    // Send back compilation errors
                    return res.status(400).json({ status: 'COMPILE_ERROR', output: stderr || stdout, error: compileErr.message });
                }
                
                // If compilation succeeds, run the compiled executable
                executeCode(runCommand, inputData);
            });
        } else {
            // For interpreted languages (Python)
            executeCode(runCommand, inputData);
        }
    });
});

// --- EXAM SUBMISSION & SCORING ---
app.post('/submit-exam', async (req, res) => {
    const { email, exam, userCode, timeRemaining, isCorrect, submittedQuestion } = req.body;
    let score = 0;

    const examFullName = exam === 'program' ? 'Programming Exam' : 
                         exam === 'mcq' ? 'Multiple Choice Exam' :
                         exam === 'theory' ? 'Theory Exam' : submittedQuestion?.title || 'Unknown Exam';

    // 1. Scoring Logic: Award 50 if client-side check passed AND time remains (PERFECT SCORE PATH)
    if (isCorrect && timeRemaining > 0) {
        score = 50;
    } else {
        // 2. AI Evaluation Logic for partial/incorrect scores (AI GRADING PATH)
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
            
            const prompt = `
                You are an automated grading system. Evaluate the student's submitted code against the provided programming question.
                
                The maximum score is 50.
                
                --- QUESTION DETAILS ---
                Title: ${submittedQuestion.title}
                Description: ${submittedQuestion.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')}
                Language: ${submittedQuestion.language}
                
                --- SUBMITTED CODE ---
                \`\`\`${submittedQuestion.language}\n${userCode}\n\`\`\`

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
            
            const parsedScore = parseInt(text, 10);
            score = isNaN(parsedScore) ? 1 : Math.min(49, Math.max(0, parsedScore)); 

        } catch (error) {
            console.error("Gemini API Error:", error);
            score = 1; // Assign a minimum score if AI fails
        }
    }

    const sql = `UPDATE users SET score = ? WHERE email = ? AND exam = ?`;
    
    db.run(sql, [score, email, exam], function(err) {
        if (err) {
            console.error('DB Error (Submit Exam):', err.message);
            return res.status(500).json({ message: 'Failed to save score. (DB Error)' }); 
        }
        
        if (this.changes === 0) {
            console.error(`[DB FAILED] UPDATE affected 0 rows. User/Exam combination not found in DB.`);
            return res.status(404).json({ message: 'Error: User not found in database or exam name mismatch.' }); 
        }
        
        sendCompletionEmail(email, examFullName, score);
        
        console.log(`[DB SUCCESS] Score saved for ${email}. Rows affected: ${this.changes}`);
        res.status(200).json({ message: 'Exam submitted!', score: score });
    });
});


app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(port, () => console.log(`Backend server listening at http://localhost:${port}`));