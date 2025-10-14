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
            // Ensure the 'score' column is present if the database already existed
            // This is a common pattern for handling schema evolution in simple setups
            checkAndAlterTable(db);
        }
    }
});

function initDb(db) {
    db.serialize(() => {
        // Create the main user table with the new 'score' column
        db.run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                city TEXT,
                email TEXT UNIQUE,
                exam TEXT, 
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

        // Create a simple table for OTPs (though currently managed in memory in server.js)
        // This is good practice if you decide to move OTP persistence out of memory
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
    // Check if the 'score' column exists and add it if it doesn't
    db.get("PRAGMA table_info(users)", (err, row) => {
        if (err) {
            console.error('Error checking users table info:', err.message);
            return;
        }

        let columnExists = false;
        db.all("PRAGMA table_info(users)", (err, rows) => {
            if (rows) {
                columnExists = rows.some(col => col.name === 'score');
            }

            if (!columnExists) {
                db.run("ALTER TABLE users ADD COLUMN score INTEGER", (err) => {
                    if (err) {
                        console.error('Error adding score column:', err.message);
                    } else {
                        console.log('Added [score] column to [users] table.');
                    }
                });
            }
        });
    });
}


module.exports = db;