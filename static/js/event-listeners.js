document.addEventListener('DOMContentLoaded', function() {
    const categorySelect = document.getElementById('categorySelect');
    const customElementsContainer = document.getElementById('customElementsContainer');
    
    // Initialize categories
    initializeCategories();
    
    // Load initial form based on default selection
    loadFormForCategory(categorySelect.value);
    
    // Event listener for category changes
    categorySelect.addEventListener('change', function() {
        loadFormForCategory(this.value);
    });
});

// Model selection change handler
$("#modelSelect").on("change", function() {
    // Clear client-side cache when model changes
    itemsCache = {};
});

// Main search form submission handler
$(document).ready(function() {
    $("#searchForm").on("submit", function(event) {
        event.preventDefault();
        handleSearchFormSubmit();
    });

    // Explain button click handler
    $(document).on('click', '.explain-btn', function() {
        handleExplainButtonClick($(this));
    });

    // Feedback button handlers
    $(document).on('click', '.thumbs-up, .thumbs-down', function(event) {
        handleFeedbackButtonClick($(this), event);
    });

    $(document).on('click', '.submit-feedback', function(event) {
        handleFeedbackSubmission($(this), event);
    });
});