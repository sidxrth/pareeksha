// renderer.js
const emailStep = document.getElementById('emailStep');
const detailsStep = document.getElementById('detailsStep');
const otpModal = document.getElementById('otpModal');
const generateOtpBtn = document.getElementById('generateOtpBtn');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const completeSignupBtn = document.getElementById('completeSignupBtn');
const signupEmailInput = document.getElementById('signup-email');
const signupNameInput = document.getElementById('signup-name');
const signupCityInput = document.getElementById('signup-city');
const otpInputs = document.querySelectorAll('#otp-inputs .otp-box');
const statusMessage = document.getElementById('status-message');
const otpMessage = document.getElementById('otp-message');

function updateStatus(message, isError = false) {
    statusMessage.textContent = `> ${message}`;
    statusMessage.className = isError 
        ? 'text-center text-lg mb-4 h-6 text-red-500' 
        : 'text-center text-lg mb-4 h-6 text-green-400';
    
    setTimeout(() => {
        statusMessage.textContent = '';
    }, 5000);
}

generateOtpBtn.addEventListener('click', async () => {
    const email = signupEmailInput.value;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        updateStatus('ERROR: Please provide a valid email address.', true);
        return;
    }
    generateOtpBtn.disabled = true;
    updateStatus('Dispatching OTP...', false);
    try {
        const response = await fetch('http://localhost:3000/generate-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        otpMessage.textContent = data.message;
        signupEmailInput.disabled = true;
        otpModal.classList.remove('hidden');
        otpInputs[0].focus();
    } catch (error) {
        updateStatus(`ERROR: ${error.message}`, true);
        generateOtpBtn.disabled = false;
    }
});
    
otpInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
            otpInputs[index - 1].focus();
        }
    });
});

verifyOtpBtn.addEventListener('click', async () => {
    const enteredOtp = Array.from(otpInputs).map(input => input.value).join('');
    if (enteredOtp.length !== 6) {
        otpMessage.textContent = "Please enter the full 6-digit code.";
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: signupEmailInput.value, otp: enteredOtp })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        updateStatus('SUCCESS: E-mail verified. Please provide details.', false);
        otpModal.classList.add('hidden');
        emailStep.classList.add('hidden');
        detailsStep.classList.remove('hidden');
        document.querySelector('legend').textContent = '[ FINALIZING ]';
        signupNameInput.focus();
    } catch (error) {
        otpMessage.textContent = `ERROR: ${error.message}`;
    }
});


// MODIFIED: 'exam' parameter is now read and sent to the server
completeSignupBtn.addEventListener('click', async () => {
    const userName = signupNameInput.value;
    const userCity = signupCityInput.value;
    const userEmail = signupEmailInput.value;
    
    // --- MODIFICATION: Read the 'exam' and 'id' parameter from the URL ---
    const urlParams = new URLSearchParams(window.location.search); 
    const exam = urlParams.get('exam'); // examTypeSlug
    const examId = urlParams.get('id'); // <-- NEW
    // --- END MODIFICATION ---

    if (!userName || !userCity) {
        updateStatus('ERROR: Full Name and Living City are required.', true);
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: userName, city: userCity, email: userEmail, exam: exam })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        updateStatus(`REGISTRATION COMPLETE. Proceeding to biometric setup...`, false);
        
        completeSignupBtn.disabled = true;
        signupNameInput.disabled = true;
        signupCityInput.disabled = true;

        // Redirect to face setup page after a delay, carrying the exam type slug AND the exam ID
        setTimeout(() => {
            // --- MODIFICATION: Pass the exam ID (`id`) in the URL ---
            window.location.href = `../face.html?email=${encodeURIComponent(userEmail)}&exam=${encodeURIComponent(exam)}&id=${encodeURIComponent(examId)}`; 
            // --- END MODIFICATION ---
        }, 2000);

    } catch (error) {
        updateStatus(`ERROR: ${error.message}`, true);
    }
});