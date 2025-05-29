function createHelpPopupHTML() {
  return `
    <div class="help-popup">
      <div class="card">
        <div class="card-header bg-info text-white" style="background: #4361ee !important;">
          <h5 class="mb-0">
            <i class="fas fa-info-circle me-2"></i>About Our Search
          </h5>
        </div>
        <div class="card-body">
          <p>
            Our search tool uses <strong>strict filtering</strong> to deliver the most relevant content.
            This means your search term must appear exactly in a news headline or YouTube video title.
          </p>
          <p>
            Because of this, you might sometimes see fewer results than expected—or none at all.
          </p>
          <p><strong>Why do we do this?</strong></p>
          <ul>
            <li>
              We use large language models (LLMs) to assign sentiment (positive, negative, or neutral) to news headlines and YouTube video titles.
              If your query isn't clearly mentioned, we exclude it to avoid misattributing sentiment.
            </li>
            <li>
              This helps maintain accuracy in the sentiment statistics we present.
              On the statistics page, you can see how different organisations mention specific people or topics with associated sentiment.
            </li>
          </ul>
          <p class="mb-0">
            <strong>Tip:</strong> For specific people or topics, try multiple news sources.
            For example, <em>Keir Starmer</em> is mentioned more often in UK media than in US outlets.
          </p>
        </div>
        <div class="card-footer text-center">
          <button style="background: #4361ee !important;" type="button" class="btn btn-primary" data-bs-dismiss="modal">Got it</button>
        </div>
      </div>
    </div>
  `;
}

function createErrorMessage(error, suggestions = []) {
  let errorType = "general";
  let errorTitle = "Search Results Issue";
  let errorIcon = "fas fa-exclamation-triangle";
  let errorClass = "alert-warning";
  let defaultSuggestions = [
    "Try different search terms",
    "Check if your search might be too specific",
    "Try a different news source/channel",
    "Try again later",
  ];

  const errorMapping = [
    {
      conditions: ["Error details:", "API error"],
      type: "api_error",
      title: "API Connection Issue",
      icon: "fas fa-server",
      className: "alert-danger",
      suggestions: [
        "This appears to be a technical issue, not a problem with your search terms",
        "Try again in a few minutes",
        "If the problem persists, contact support",
      ],
    },
    {
      conditions: ["Network error"],
      type: "network_error",
      title: "Network Connectivity Issue",
      icon: "fas fa-wifi",
      className: "alert-danger",
      suggestions: [
        "Check your internet connection",
        "Try again in a few minutes",
        "If you're using a VPN, try disabling it temporarily",
      ],
    },
    {
      conditions: ["No videos found"],
      type: "no_videos",
      title: "No Videos Found",
      icon: "fab fa-youtube",
      suggestions: [
        "Try a different spelling or name variation",
        "Search for a broader topic",
        "Try a different YouTube channel",
        "Check if this topic is covered in YouTube videos",
      ],
    },
    {
      conditions: ["No articles found"],
      type: "no_articles",
      title: "No News Articles Found",
      icon: "far fa-newspaper",
      suggestions: [
        "Try different keywords or phrases",
        "Try a different news source",
        "Search for a broader topic",
        "This topic might not be well-covered in recent news",
      ],
    },
    {
      conditions: ["none with", "not well-covered"],
      type: "no_coverage",
      title: "Limited Topic Coverage",
      icon: "fas fa-search",
      suggestions: [
        "This topic may not be widely covered currently",
        "Try variations of your search query",
        "Consider searching a different time period",
        "Try a more general topic related to your search",
      ],
    },
    {
      conditions: ["quota exceeded", "rate limit", "429"],
      type: "quota_error",
      title: "API Quota Exceeded",
      icon: "fas fa-stopwatch",
      className: "alert-danger",
      suggestions: [
        "We've reached our API request limit",
        "Try again in a few hours",
        "Consider using a different content type in the meantime",
      ],
    },
    {
      conditions: ["unauthorized", "authentication", "401"],
      type: "auth_error",
      title: "API Authorization Error",
      icon: "fas fa-key",
      className: "alert-danger",
      suggestions: [
        "This is a technical issue with our API keys",
        "Our team has been notified",
        "Try again later",
      ],
    },
    {
      conditions: ["but none matched all filters"],
      type: "filter_error",
      title: "Search Filters Too Restrictive",
      icon: "fas fa-filter",
      suggestions: [
        "Try removing some search filters",
        "Use more general search terms",
        "Try a different source with better coverage of this topic",
      ],
    },
  ];

  for (const mapping of errorMapping) {
    if (mapping.conditions.some(cond => error.toLowerCase().includes(cond))) {
      errorType = mapping.type;
      errorTitle = mapping.title;
      errorIcon = mapping.icon;
      errorClass = mapping.className || errorClass;
      defaultSuggestions = mapping.suggestions;
      break;
    }
  }

  const finalSuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;
  const helpPopup = createHelpPopupHTML();
  const errorId = "error-" + Date.now().toString(36);

  return `
    <div id="${errorId}" class="col-12 error-message" data-error-type="${errorType}">
      <div class="alert ${errorClass}">
        <div class="d-flex align-items-start">
          <i class="${errorIcon} me-3 fa-2x"></i>
          <div class="flex-grow-1">
            <div class="d-flex align-items-center mb-2">
              <h5 class="mb-0">${errorTitle}</h5>
              <div class="help-icon-container ms-2" data-bs-toggle="tooltip" title="Click for more information">
                <i style="color: #4361ee !important;" class="fas fa-question-circle text-info help-icon"></i>
                ${helpPopup}
              </div>
            </div>
            <p class="mb-2">${error}</p>
            <div class="mt-3">
              <strong>Suggestions:</strong>
              <ul class="mb-0 mt-1">
                ${finalSuggestions.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Help icon click handler
$(document).on('click', '.help-icon', function(event) {
  event.stopPropagation();
  const helpContent = $(this).closest('.help-icon-container').find('.help-popup').html();
  $('#centralHelpModal').remove();

  const modalHTML = `
    <div class="modal fade" id="centralHelpModal" tabindex="-1" aria-labelledby="helpModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          ${helpContent}
        </div>
      </div>
    </div>
  `;

  $('body').append(modalHTML);
  $('#centralHelpModal').modal('show');
});

// Modal close handler
$(document).on('click', '.modal-backdrop, .modal .btn-close', function() {
  $('#centralHelpModal').modal('hide');
});

// Help popup styles
const helpPopupStyles = `
<style>
  .help-icon {
    cursor: pointer;
    font-size: 18px;
    transition: transform 0.2s ease;
  }
  .help-icon:hover {
    color: #0056b3;
    transform: scale(1.2);
  }
  .help-icon-container {
    display: inline-block;
  }
  .help-popup {
    display: none;
  }
  #centralHelpModal .modal-content {
    border: none;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  }
  #centralHelpModal .card {
    border: none;
    margin-bottom: 0;
  }
  #centralHelpModal .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
`;

$(document).ready(function() {
  $('head').append(helpPopupStyles);
});
