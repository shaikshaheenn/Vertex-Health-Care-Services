document.addEventListener('DOMContentLoaded', () => {
    // === 1. DOM Elements ===
    const menuToggle = document.getElementById('mobile-menu');
    const navMenu = document.querySelector('.nav-menu');
    const appointmentForm = document.getElementById('appointmentForm');
    const bookAppointmentBtn = document.getElementById('bookAppointmentBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modal = document.getElementById('appointmentModal');
    const successMessage = document.getElementById('successMessage');

    // === 2. Mobile Menu Logic ===
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });

        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                menuToggle.classList.remove('active');
            });
        });
    }

    // === 3. Modal Logic ===
    if (bookAppointmentBtn) {
        bookAppointmentBtn.addEventListener('click', () => {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
    }

    const closeTargetModal = () => {
        modal.style.display = 'none';
        appointmentForm.style.display = 'block';
        successMessage.style.display = 'none';
        document.body.style.overflow = 'auto';
        appointmentForm.reset();
    };

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeTargetModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeTargetModal(); });

    // === 4. Form Submission Logic ===
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Extract values
            const formData = {
                fullName: document.getElementById('fullName').value,
                mobileNumber: document.getElementById('mobileNumber').value,
                emailAddress: document.getElementById('emailAddress').value,
                department: document.getElementById('department').value,
                doctorName: document.getElementById('doctorName').value,
                reasonForVisit: document.getElementById('reasonForVisit').value
            };

            const submitBtn = appointmentForm.querySelector('.btn-submit');
            const originalText = submitBtn.innerText;
            
            submitBtn.innerText = "Processing...";
            submitBtn.disabled = true;

            try {
                // Change 'http://localhost:5000' to your actual production URL when deploying
                const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                                ? 'http://localhost:5000/api/appointments' 
                                : '/api/appointments';

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    appointmentForm.style.display = 'none';
                    successMessage.style.display = 'block';
                } else {
                    alert("Error: " + (result.message || "Failed to book"));
                }
            } catch (error) {
                console.error("Fetch Error:", error);
                alert("Cannot connect to server. Is the backend running on port 5000?");
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    console.log('Vertex Healthcare - Site Ready');
});
