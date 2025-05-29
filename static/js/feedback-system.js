function handleExplainButtonClick(button) {
    const itemId = button.data('id');
    const sourceType = button.data('source-type') || 'news';
    const item = itemsCache[itemId];
    const sentimentSection = button.closest('.sentiment-section');
    
    button.remove();
    
    const explanationContainer = document.createElement('div');
    explanationContainer.id = `explanation-container-${itemId}`;
    explanationContainer.className = 'explanation-container mt-2';
    sentimentSection.append(explanationContainer);
    
    const currentModel = $("#modelSelect").val();
    if (!currentModel) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-warning mt-2';
        errorMessage.textContent = 'Please select a model first';
        explanationContainer.appendChild(errorMessage);
        return;
    }
    
    showLLMLoadingScreen(true);
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'mt-2 d-flex align-items-center';
    loadingIndicator.innerHTML = `
        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
        <span>Analyzing sentiment...</span>
    `;
    explanationContainer.appendChild(loadingIndicator);
    
    const params = new URLSearchParams();
    params.append('text', item.title);
    params.append('model', currentModel);
    params.append('source_type', sourceType);
    
    fetch(`/get-explanation/${itemId}?${params.toString()}`)
    .then(response => response.json())
    .then(data => {
        $(explanationContainer).empty();
        
        if (data.error) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'alert alert-danger mt-2';
            errorMessage.textContent = data.error;
            explanationContainer.appendChild(errorMessage);
        } else {
            handleExplanationResponse(data, itemId, sourceType, explanationContainer);
        }
    })
    .catch(error => {
        $(explanationContainer).empty();
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger mt-2';
        errorMessage.textContent = `Error: ${error.message}`;
        explanationContainer.appendChild(errorMessage);
    })
    .finally(() => {
        showLLMLoadingScreen(false);
    });
}

function handleExplanationResponse(data, itemId, sourceType, container) {
    if (data.model) {
        const feedbackWrapper = document.createElement('div');
        feedbackWrapper.id = `feedback-wrapper-${itemId}`;
        feedbackWrapper.className = 'feedback-wrapper mt-3';
        feedbackWrapper.setAttribute('data-source-type', sourceType);
        feedbackWrapper.setAttribute('data-model-used', data.model);
        
        const explanationElement = document.createElement('div');
        explanationElement.className = 'mt-2';
        
        const explanationText = document.createElement('small');
        explanationText.className = 'text-muted';
        explanationText.textContent = data.explanation;
        explanationElement.appendChild(explanationText);
        container.appendChild(explanationElement);
        
        feedbackWrapper.innerHTML = `
            <div class="thumbs-feedback" id="thumbs-feedback-${itemId}">
                <button class="btn btn-sm btn-outline-success thumbs-up" data-id="${itemId}">👍</button>
                <button class="btn btn-sm btn-outline-danger thumbs-down" data-id="${itemId}">👎</button>
            </div>
            <div class="feedback-status mt-2" id="feedback-status-${itemId}"></div>
        `;
        container.appendChild(feedbackWrapper);
    }
}

function handleFeedbackButtonClick(button, event) {
    event.preventDefault();
    const itemId = button.data('id');
    const isThumbsUp = button.hasClass('thumbs-up');
    const feedbackWrapper = $(`#feedback-wrapper-${itemId}`);
    
    let feedbackContainer = $(`#feedback-container-${itemId}`);
    
    if (feedbackContainer.length === 0) {
        const newFeedbackContainer = document.createElement('div');
        newFeedbackContainer.id = `feedback-container-${itemId}`;
        newFeedbackContainer.className = 'feedback-container mt-3';
        
        newFeedbackContainer.innerHTML = `
            <textarea class="form-control feedback-text" id="feedback-${itemId}" rows="2" 
                placeholder="Why do you ${isThumbsUp ? 'agree' : 'disagree'} with the sentiment? (optional)"></textarea>
            <button class="btn btn-sm btn-primary mt-2 submit-feedback" data-id="${itemId}">Submit Feedback</button>
        `;
        
        feedbackWrapper.append(newFeedbackContainer);
        feedbackContainer = $(newFeedbackContainer);
    }
    
    if (isThumbsUp) {
        button.addClass('active').removeClass('btn-outline-success').addClass('btn-success');
        button.siblings('.thumbs-down').removeClass('active').addClass('btn-outline-danger').removeClass('btn-danger');
        $(`#feedback-${itemId}`).attr('placeholder', 'Why do you agree with this sentiment? (Optional)');
    } else {
        button.addClass('active').removeClass('btn-outline-danger').addClass('btn-danger');
        button.siblings('.thumbs-up').removeClass('active').addClass('btn-outline-success').removeClass('btn-success');
        $(`#feedback-${itemId}`).attr('placeholder', 'Why do you disagree with this sentiment? (Optional)');
    }
    
    feedbackContainer.show();
}

function handleFeedbackSubmission(button, event) {
    event.preventDefault();
    const itemId = button.data('id');
    const feedbackText = $(`#feedback-${itemId}`).val();
    const item = itemsCache[itemId];
    
    const feedbackType = $(`.thumbs-up[data-id="${itemId}"]`).hasClass('active') ? 'thumbs_up' : 'thumbs_down';
    const modelUsed = $(`#feedback-wrapper-${itemId}`).data('model-used') || window.modelUsed;
    const now = new Date();
    const formattedDate = now.getFullYear() + '-' + 
                         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(now.getDate()).padStart(2, '0') + ' ' + 
                         String(now.getHours()).padStart(2, '0') + ':' + 
                         String(now.getMinutes()).padStart(2, '0') + ':' + 
                         String(now.getSeconds()).padStart(2, '0');
    
    const feedbackData = {
        item_id: itemId,
        item_title: item.title,
        predicted_sentiment: item.sentiment,
        feedback_type: feedbackType,
        feedback_text: feedbackText,
        timestamp: formattedDate,
        source_type: $(`#feedback-wrapper-${itemId}`).data('source-type') || 'news',
        model_used: modelUsed
    };

    submitFeedback(feedbackData, itemId);
}

function submitFeedback(feedbackData, itemId) {
    fetch('/submit-feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'Failed to submit feedback');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            const feedbackWrapper = $(`#feedback-wrapper-${itemId}`);
            feedbackWrapper.html(`
                <div class="alert alert-success">
                    Feedback submitted successfully!
                </div>
            `);
        } else {
            throw new Error(data.message || 'Unknown error');
        }
    })
    .catch(error => {
        const feedbackWrapper = $(`#feedback-wrapper-${itemId}`);
        const sourceType = $(`.explain-btn[data-id="${itemId}"]`).data('source-type') || 'news';
        const contentType = sourceType === 'video' ? 'video' : 'article';
        
        if (error.message.includes('already provided feedback')) {
            feedbackWrapper.html(`
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    You have already provided feedback for this ${contentType}.
                </div>
            `);
        } else {
            $(`#feedback-status-${itemId}`).html(`
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error submitting feedback: ${error.message}
                </div>
            `);
        }
    });
}