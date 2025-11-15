// renderer.js
const emailStep = document.getElementById('emailStep');
const detailsStep = document.getElementById('detailsStep');
const otpModal = document.getElementById('otpModal');
const generateOtpBtn = document.getElementById('generateOtpBtn');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const completeSignupBtn = document.getElementById('completeSignupBtn');
const signupEmailInput = document.getElementById('signup-email');
const signupNameInput = document.getElementById('signup-name');
const signupRollNoInput = document.getElementById('signup-rollno'); // RollNo from auth/signup.html
const otpInputs = document.querySelectorAll('#otp-inputs .otp-box');
const statusMessage = document.getElementById('status-message');
const otpMessage = document.getElementById('otp-message');

// NEW: Selection for the back button
const backToAccessBtn = document.getElementById('backToAccessBtn');

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

// NEW: Handle back button click
backToAccessBtn.addEventListener('click', () => {
    // Navigate back to the index page (the exam access link page)
    window.location.href = '../index.html'; 
});


completeSignupBtn.addEventListener('click', async () => {
    const userName = signupNameInput.value;
    const userRollNo = signupRollNoInput.value;
    const userEmail = signupEmailInput.value;
    const urlParams = new URLSearchParams(window.location.search);
    const examType = urlParams.get('exam'); 
    const examId = urlParams.get('id'); 

    if (!userName || !userRollNo) {
        updateStatus('ERROR: Full Name and Roll No are required.', true);
        return;
    }
    
    // Disable inputs and hide the back button at start of attempt
    completeSignupBtn.disabled = true;
    signupNameInput.disabled = true;
    signupRollNoInput.disabled = true;
    backToAccessBtn.classList.add('hidden');

    try {
        const response = await fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: userName, 
                rollno: userRollNo, 
                email: userEmail, 
                examType: examType, 
                examId: examId 
            })
        });
        const data = await response.json();
        
        if (!response.ok) {
            // CRITICAL: Handle duplicate enrollment error
            if (data.message && data.message.includes('already registered for this examination')) {
                updateStatus("ERROR: Already enrolled for this exam. Please use the button below to go back.", true);
                
                // Keep input fields disabled and show the Back button
                backToAccessBtn.classList.remove('hidden');
                
                // Do NOT redirect
                return; 
            }
            throw new Error(data.message); // Handle other server errors
        }
        
        // --- SUCCESS PATH ---
        updateStatus(`REGISTRATION COMPLETE. Proceeding to biometric setup...`, false);
        
        setTimeout(() => {
            window.location.href = `../face.html?email=${encodeURIComponent(userEmail)}&exam=${encodeURIComponent(examType)}&id=${encodeURIComponent(examId)}`;
        }, 2000);

    } catch (error) {
        updateStatus(`ERROR: ${error.message}`, true);
        
        // Re-enable input fields on failure (but keep the main button disabled)
        signupNameInput.disabled = false;
        signupRollNoInput.disabled = false;
        completeSignupBtn.disabled = false; // Allow another attempt if it wasn't a duplicate error
    }
});