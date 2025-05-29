function updateProgressBar(value, itemCount) {
    const progressBar = $(".progress-bar");
    const roundedValue = Math.round(value);
    
    progressBar.css("width", `${roundedValue}%`);
    progressBar.attr("aria-valuenow", roundedValue);
    
    if (itemCount > 0) {
        $(".progress-text").text(`${itemCount} items loaded (${roundedValue}%)`);
    }
}

function formatNumber(num) {
    if (!num || isNaN(parseInt(num))) return "0";
    
    const n = parseInt(num);
    if (n >= 1000000) {
        return (n / 1000000).toFixed(1) + 'M';
    } else if (n >= 1000) {
        return (n / 1000).toFixed(1) + 'K';
    }
    return n.toString();
}

function showLLMLoadingScreen(show) {
    const existingLoadingScreen = document.querySelector('#llmLoadingScreen');
    if (existingLoadingScreen) {
        existingLoadingScreen.remove();
    }

    if (show) {
        const loadingScreenHTML = `
            <div id="llmLoadingScreen" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                color: white;
                font-family: 'Segoe UI', sans-serif;
            ">
            <div class="loading-container text-center">
                <div class="spinner-border text-primary" style="width: 5rem; height: 5rem;" role="status"></div>
                <h3 class="mt-4 mb-2 fw-bold">AI Analysis in Progress</h3>
                <p class="lead">Please wait while we process your request</p>
            </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', loadingScreenHTML);
    }
}

function displaySearchResultItem(item) {
    const currentCategory = $("#categorySelect").val();
    const isVideo = currentCategory === 'online_videos';
    
    let sentimentClass = 'sentiment-neutral';
    let sentimentIcon = 'fas fa-minus';
    
    if (item.sentiment === 'positive') {
        sentimentClass = 'sentiment-positive';
        sentimentIcon = 'fas fa-thumbs-up';
    } else if (item.sentiment === 'negative') {
        sentimentClass = 'sentiment-negative';
        sentimentIcon = 'fas fa-thumbs-down';
    }
    
    if (isVideo) {
        $("#resultsList").append(createVideoResultItem(item, sentimentClass, sentimentIcon));
    } else {
        $("#resultsList").append(createNewsResultItem(item, sentimentClass, sentimentIcon));
    }
}

function createVideoResultItem(item, sentimentClass, sentimentIcon) {
    return `
        <div class="col-lg-6 mb-4">
            <div class="card h-100 result-item">
                <div class="card-body p-0">
                    <div class="row g-0">
                        <div class="col-md-5">
                            <div class="video-thumbnail h-100">
                                <img src="${item.thumbnail}" alt="${item.title}" class="img-fluid h-100 w-100" style="object-fit: cover;">
                            </div>
                        </div>
                        <div class="col-md-7 p-3">
                            <h5 class="card-title">${item.title}</h5>
                            <p class="card-text small">${item.description ? item.description.substring(0, 100) + '...' : 'No description available'}</p>
                            <div class="d-flex flex-wrap gap-2 mb-2">
                                <span class="badge bg-secondary">${item.channel}</span>
                                <span class="badge bg-info text-dark">
                                    <i class="fas fa-eye me-1"></i>${formatNumber(item.viewCount)}
                                </span>
                                <span class="badge bg-primary">
                                    <i class="fas fa-thumbs-up me-1"></i>${formatNumber(item.likeCount)}
                                </span>
                            </div>
                            <div class="sentiment-section mt-2">
                                <div class="d-flex align-items-center">
                                    <div class="me-2">Sentiment:</div>
                                    <div class="${sentimentClass} me-auto">
                                        <i class="${sentimentIcon} me-1"></i>${item.sentiment}
                                    </div>
                                    <button class="btn btn-sm btn-outline-primary explain-btn" 
                                            data-id="${item.id}" data-source-type="video">
                                        <i class="fas fa-info-circle me-1"></i>Explain
                                    </button>
                                </div>
                            </div>
                            <div class="mt-3">
                                <a href="${item.url}" target="_blank" class="btn btn-sm btn-outline-secondary">
                                    <i class="fab fa-youtube me-1"></i>Watch Video
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createNewsResultItem(item, sentimentClass, sentimentIcon) {
    return `
        <div class="col-lg-6 mb-4">
            <div class="card h-100 result-item">
                <div class="card-body">
                    <h5 class="card-title">${item.title}</h5>
                    <p class="card-text">${item.description || 'No description available'}</p>
                    <div class="sentiment-section mb-3">
                        <div class="d-flex align-items-center">
                            <div class="me-2">Sentiment:</div>
                            <div class="${sentimentClass} me-auto">
                                <i class="${sentimentIcon} me-1"></i>${item.sentiment}
                            </div>
                            <button class="btn btn-sm btn-outline-primary explain-btn" 
                                    data-id="${item.id}" data-source-type="news">
                                <i class="fas fa-info-circle me-1"></i>Explain
                            </button>
                        </div>
                    </div>
                    <a href="${item.url}" target="_blank" class="btn btn-sm btn-outline-secondary">
                        <i class="fas fa-external-link-alt me-1"></i>Read Article
                    </a>
                </div>
            </div>
        </div>
    `;
}