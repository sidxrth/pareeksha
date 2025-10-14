// login-renderer.js

window.onload = async () => {
    const video = document.getElementById('video-login');
    const loginBtn = document.getElementById('loginBtn');
    const loginStatus = document.getElementById('login-status');
    const loginInstruction = document.getElementById('login-instruction');

    let faceMatcher = null;
    let allUsers = [];

    // --- Load Models and User Face Data ---
    async function setupFaceAPI() {
        try {
            loginStatus.textContent = '> LOADING BIOMETRIC MODELS...';
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri('../models'), // Using a more accurate model
                faceapi.nets.faceLandmark68Net.loadFromUri('../models'),
                faceapi.nets.faceRecognitionNet.loadFromUri('../models')
            ]);
            
            loginStatus.textContent = '> LOADING USER PROFILES...';
            const response = await fetch('http://localhost:3000/get-all-face-data');
            const data = await response.json();
            if (!response.ok) {
                throw new Error('Could not load user profiles from server.');
            }

            allUsers = data.users;
            
            if (allUsers.length > 0) {
                const labeledFaceDescriptors = allUsers.map(user => 
                    // --- CORRECTED LOGIC ---
                    // Create a LabeledFaceDescriptors instance by mapping over the array of descriptors
                    new faceapi.LabeledFaceDescriptors(
                        user.email,
                        user.face_descriptor.map(d => new Float32Array(d))
                    )
                );
                // Set a stricter distance threshold for login verification (e.g., 0.4)
                faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.4);
            } else {
                loginInstruction.textContent = '> No biometric profiles found in the system.';
                loginStatus.textContent = '> SYSTEM READY';
            }

        } catch (err) {
            console.error("Initialization Error:", err);
            loginStatus.textContent = `> FATAL ERROR: ${err.message}`;
            loginInstruction.textContent = '> System initialization failed.';
            if (loginBtn) loginBtn.disabled = true;
        }
    }

    // --- Start Camera ---
    async function startVideo() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
            video.style.transform = 'scaleX(-1)'; // Flip the video horizontally
            loginStatus.textContent = '> SCANNER READY';
            if (faceMatcher) { // Only enable if there are profiles to match against
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = '> AUTHENTICATE';
                }
            }
        } catch (err) {
            console.error("Camera Error:", err);
            loginStatus.textContent = `> ERROR: ${err.name}`;
            loginInstruction.textContent = '> Camera access failed.';
            if (loginBtn) loginBtn.disabled = true;
        }
    }

    // Initialize everything
    await setupFaceAPI();
    await startVideo();

    // --- Handle Login Button Click ---
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            if (!faceMatcher) return;

            loginBtn.disabled = true;
            loginStatus.textContent = '> ANALYZING...';
            loginInstruction.textContent = '> Matching biometric signature...';

            try {
                const detection = await faceapi.detectSingleFace(video)
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!detection) {
                    throw new Error('No face detected. Please try again.');
                }

                const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
                
                if (bestMatch.label === 'unknown') {
                     throw new Error('User not recognized.');
                }

                const matchedUser = allUsers.find(user => user.email === bestMatch.label);
                
                if (!matchedUser) {
                    throw new Error('Internal error: Matched user profile not found.');
                }

                loginStatus.textContent = '> AUTHENTICATION SUCCESSFUL';
                loginInstruction.textContent = `> Welcome, ${matchedUser.name}. Redirecting...`;

                const queryParams = new URLSearchParams({
                    name: matchedUser.name,
                    email: matchedUser.email,
                    city: matchedUser.city
                }).toString();

                setTimeout(() => {
                    window.location.href = `../home.html?${queryParams}`;
                }, 2000);

            } catch (error) {
                loginStatus.textContent = `> AUTH FAILED: ${error.message}`;
                loginInstruction.textContent = '> Please align your face and try again.';
                loginBtn.disabled = false;
            }
        });
    }
};