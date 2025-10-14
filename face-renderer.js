// face-renderer.js
const video = document.getElementById('video');
const scanBtn = document.getElementById('scanBtn');
const scanStatus = document.getElementById('scan-status');
const instruction = document.getElementById('instruction');

const urlParams = new URLSearchParams(window.location.search);
const userEmail = urlParams.get('email');
const examName = urlParams.get('exam');

if (!userEmail || !examName) {
    instruction.textContent = '> ERROR: Missing user email or exam information.';
    scanStatus.textContent = '> FATAL ERROR';
    if(scanBtn) scanBtn.disabled = true;
}

// ... (keep the existing startVideo and model loading functions)

if(scanBtn) {
    scanBtn.addEventListener('click', async () => {
        if (!userEmail) return;
        scanBtn.disabled = true;
        scanStatus.textContent = '> SCANNING...';
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        
        if (detection) {
            instruction.textContent = '> Saving biometric profile...';
            try {
                const response = await fetch('http://localhost:3000/store-face-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, faceDescriptor: Array.from(detection.descriptor) })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                scanStatus.textContent = '> BIOMETRIC PROFILE SAVED';
                instruction.textContent = `> Redirecting to ${examName} exam...`;
                setTimeout(() => { 
                    window.location.href = `../exam/${examName.toLowerCase()}_exam.html`;
                }, 2000);
            } catch (error) {
                scanStatus.textContent = `> ERROR: ${error.message}`;
                scanBtn.disabled = false;
            }
        } else {
            scanStatus.textContent = '> FAILED: NO FACE DETECTED. TRY AGAIN.';
            scanBtn.disabled = false;
        }
    });
}