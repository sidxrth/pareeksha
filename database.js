// database.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const DB_PATH = 'users.db';

// Check if the database file exists
const dbExists = fs.existsSync(DB_PATH);

// Open the database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to the SQLite database.');
        // Initialize the database tables if the file was just created
        if (!dbExists) {
            initDb(db);
        } else {
            // Ensure schema evolution for score and new exam fields
            checkAndAlterTable(db);
        }
    }
});

function initDb(db) {
    db.serialize(() => {
        // --- MODIFICATION: Removed UNIQUE constraint from 'email' ---
        db.run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                rollno TEXT, 
                email TEXT,                     /* FIX 1: REMOVED UNIQUE CONSTRAINT */
                exam_type TEXT, 
                exam_id TEXT,
                face_descriptor TEXT,
                score INTEGER 
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            } else {
                console.log('Table [users] created successfully.');
            }
        });
        // --- END MODIFICATION ---

        // Create a simple table for OTPs
        db.run(`
            CREATE TABLE otp_codes (
                email TEXT PRIMARY KEY,
                code TEXT,
                timestamp INTEGER
            )
        `, (err) => {
            if (err) {
                // If it fails (e.g. if you already ran the other server setup), it's fine.
            }
        });
    });
}

function checkAndAlterTable(db) {
    // Basic checks to ensure table structure evolution
    db.all("PRAGMA table_info(users)", (err, rows) => {
        if (err) {
            console.error('Error checking users table info:', err.message);
            return;
        }

        const columnNames = rows ? rows.map(col => col.name) : [];
        
        // Add score column if missing
        if (!columnNames.includes('score')) {
            db.run("ALTER TABLE users ADD COLUMN score INTEGER", (err) => {
                if (err) console.error('Error adding score column:', err.message);
                else console.log('Added [score] column to [users] table.');
            });
        }
        
        // Add rollno column if missing (from previous modification)
        if (!columnNames.includes('rollno')) {
             db.run("ALTER TABLE users ADD COLUMN rollno TEXT", (err) => {
                if (err) console.error('Error adding rollno column:', err.message);
                else console.log('Added [rollno] column to [users] table.');
            });
        }

        // --- MODIFICATION: Add exam_id and exam_type columns ---
        if (!columnNames.includes('exam_id')) {
             db.run("ALTER TABLE users ADD COLUMN exam_id TEXT", (err) => {
                if (err) console.error('Error adding exam_id column:', err.message);
                else console.log('Added [exam_id] column to [users] table.');
            });
        }
        if (!columnNames.includes('exam_type')) {
             // For existing DBs, this is tricky. We simply add exam_type.
             db.run("ALTER TABLE users ADD COLUMN exam_type TEXT", (err) => {
                if (err) console.error('Error adding exam_type column:', err.message);
                else console.log('Added [exam_type] column to [users] table.');
            });
        }
        // --- END MODIFICATION ---
    });
}


module.exports = db;