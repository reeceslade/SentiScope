document.addEventListener('DOMContentLoaded', function () {
    setupProfileDropdown();
    setupFeedbackLink();
});

function setupProfileDropdown() {
    const profilePicElement = document.getElementById('profile-pic');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (profilePicElement && profileDropdown) {
        profilePicElement.addEventListener('click', function () {
            const isVisible = profileDropdown.style.display === 'block';
            profileDropdown.style.display = isVisible ? 'none' : 'block';
        });

        window.addEventListener('click', function (event) {
            if (!profilePicElement.contains(event.target) && !profileDropdown.contains(event.target)) {
                profileDropdown.style.display = 'none';
            }
        });
    }
}

function setupFeedbackLink() {
    const feedbackLinks = document.querySelectorAll('.model-feedback-link');
    const isAuthenticated = document.body.dataset.authenticated === 'true';

    if (!isAuthenticated) {
        feedbackLinks.forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault(); // Block navigation
                const loginModal = new bootstrap.Modal(document.getElementById('loginRequiredModal'));
                loginModal.show();
            });
        });
    }
}
