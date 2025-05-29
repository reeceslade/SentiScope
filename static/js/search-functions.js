let currentEventSource = null;
let searchInProgress = false;
let progressInterval = null;
let analyzeButtonSelector = ".search-btn";
let itemsCache = {};

function handleSearchFormSubmit() {
    $(analyzeButtonSelector).prop('disabled', true);
    
    if (searchInProgress) {
        cancelCurrentSearch();
    }
    
    itemsCache = {};
    searchInProgress = true;
    $("#results").show();
    
    const formData = getFormData();
    initializeSearchUI();
    
    // Track progress
    let itemsLoaded = 0;
    let progressValue = 0;
    const updateInterval = 300;
    
    currentEventSource = new EventSource(`/search?data=${encodeURIComponent(JSON.stringify(formData))}`);
      progressInterval = setInterval(() => {
        if (progressValue < 90) {
            progressValue += Math.random() * 3;
            progressValue = Math.min(progressValue, 90);
            updateProgressBar(progressValue, itemsLoaded);
        }
    }, updateInterval);

    currentEventSource.onmessage = function(event) {
        handleSearchResultMessage(event, itemsLoaded++);
    };

    currentEventSource.onerror = function() {
        completeSearch(itemsLoaded);
    };
}

function getFormData() {
    const currentCategory = $("#categorySelect").val();
    let formData = {
        query: $("#query").val(),
        category: currentCategory,
        country: $("#country").val(),
        model: $("#modelSelect").val()
    };
    
    if (currentCategory === 'online_news') {
        formData.source = $("#sourceSelect").val();
        formData.num_articles = $("#num_articles").val();
        formData.sort_by = $("#sort_by").val();
    } else if (currentCategory === 'online_videos') {
        formData.platform = $("#platformSelect").val();
        formData.channel = $("#channel").val();
        formData.num_videos = $("#num_videos").val();
        formData.video_sort = $("#video_sort").val();
    }
    
    return formData;
}

function initializeSearchUI() {
    $("#results").html(`
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3 class="m-0"><i class="fas fa-chart-bar me-2"></i>Analysis Results</h3>
            <button id="cancelSearchBtn" class="btn btn-outline-danger btn-sm">
                <i class="fas fa-times me-1"></i> Cancel
            </button>
        </div>
        <div class="progress mb-3">
            <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                 role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%">
            </div>
        </div>
        <div id="progress-status" class="text-muted mb-4 fst-italic">
            <i class="fas fa-sync fa-spin me-2"></i>Initializing analysis...
        </div>
        <div class="row" id="resultsList"></div>
    `);

    $("#cancelSearchBtn").on("click", function() {
        cancelCurrentSearch();
        $("#progress-status").html(`
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>Search cancelled by user.
            </div>
        `);
        $(this).hide();
    });
}

function handleSearchResultMessage(event, itemsLoaded) {
    try {
        const item = JSON.parse(event.data);
        
        if (item.error) {
            $("#resultsList").append(createErrorMessage(item.error));
            $(".progress-bar")
                .removeClass("progress-bar-animated")
                .addClass("bg-warning")
                .css("width", "100%");
            $("#progress-status").html(`
                <i class="fas fa-exclamation-triangle me-2"></i>${item.error}
            `);
            return;
        }
        
        itemsLoaded++;
        $("#progress-status").html(`
            <i class="fas fa-search me-2"></i>Found&nbsp<strong>${itemsLoaded}</strong>&nbspresults matching your query
        `);
        
        itemsCache[item.id] = item;
        displaySearchResultItem(item);
    } catch (e) {
        console.error("Error parsing event data:", e);
    }
}

function cancelCurrentSearch() {
    if (currentEventSource) {
        currentEventSource.close();
        currentEventSource = null;
    }
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    $(".progress-bar")
        .removeClass("progress-bar-animated")
        .addClass("bg-secondary")
        .css("width", "100%");
        
    searchInProgress = false;
    $(analyzeButtonSelector).prop('disabled', false);
    
    fetch('/cancel-search', { method: 'POST' })
        .catch(err => console.error("Failed to notify backend about cancellation:", err));
}

function completeSearch(itemsCount) {
    if (!searchInProgress) return;
    
    if (currentEventSource) {
        currentEventSource.close();
        currentEventSource = null;
    }
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    const hasOnlyErrors = $("#resultsList .alert-warning, #resultsList .alert-danger").length > 0 && 
                          $("#resultsList .result-item").length === 0;
    
    if (hasOnlyErrors) {
        $(".progress-bar")
            .removeClass("progress-bar-animated")
            .addClass("bg-warning")
            .css("width", "100%");
    } else {
        $(".progress-bar")
            .removeClass("progress-bar-animated")
            .addClass("bg-success")
            .css("width", "100%");
            
        $("#progress-status").html(`
            <i class="fas fa-check-circle me-2"></i>Analysis complete:&nbsp<strong>${itemsCount}</strong>&nbspresults analyzed
        `);
    }
    
    $("#cancelSearchBtn").hide();
    $(analyzeButtonSelector).prop('disabled', false);
    searchInProgress = false;
}