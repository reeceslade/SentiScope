document.addEventListener('DOMContentLoaded', loadStats);

async function loadStats() {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('no-data').style.display = 'none';
        document.getElementById('sentiment-stats').style.display = 'none';
        
        // First, load the main stats data
        const res = await fetch('/api/sentiment_statistics');
        if (!res.ok) {
            throw new Error(`Failed to load stats: ${res.status} ${res.statusText}`);
        }
        
        let data = await res.json();
        
        if (data.error) {
            throw new Error(data.message || data.error);
        }
        
        // Ensure data is an array
        if (!Array.isArray(data)) {
            console.error("Data is not an array:", data);
            data = [];
        }
        
        // Normalize the data
        data = normalizeData(data);

        if (!data || data.length === 0) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('no-data').style.display = 'block';
            document.getElementById('no-data').innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>No sentiment data available. Please check the database or try again later.</p>
            `;
            return;
        }

        document.getElementById('loading').style.display = 'none';
        document.getElementById('no-data').style.display = 'block';
        document.getElementById('no-data').innerHTML = `
            <i class="fas fa-info-circle"></i>
            <p>Please select a Source, Query, and Model to view sentiment analysis.</p>
        `;

        const sourceDropdown = document.getElementById('source-dropdown');
        const queryDropdown = document.getElementById('query-dropdown');
        const modelDropdown = document.getElementById('model-dropdown');

        // Initialize Three.js using VisUtils
        VisUtils.initThreeJS('threejs-container');
        VisUtils.startAnimation('sentiment-label');

        // Store the original complete datasets for filtering
        const allSources = [...new Set(data.filter(row => row.Source).map(row => row.Source))].sort();
        const allQueries = [...new Set(data.filter(row => row.Query).map(row => row.Query))].sort();
        const allModels = [...new Set(data.filter(row => row.Model).map(row => row.Model))].sort();

        // Store globally for access by filtering functions
        window.allSources = allSources;
        window.allQueries = allQueries; 
        window.allModels = allModels;

        console.log("Available options:", {
            sources: allSources.length,
            queries: allQueries.length,
            models: allModels.length
        });

        // Initially populate with all options using VisUtils
        VisUtils.populateDropdown(sourceDropdown, allSources, 'Select a Source');
        VisUtils.populateDropdown(queryDropdown, allQueries, 'Select a Search Query');
        VisUtils.populateDropdown(modelDropdown, allModels, 'Select an AI Model');

        // Set up event listeners with proper filtering
        setupEventListeners(data);
    } catch (err) {
        console.error("Error loading stats:", err);
        VisUtils.showErrorMessage('sentiment-stats', `Error loading data: ${err.message || 'Unknown error'}. Please try again later or contact support if the problem persists.`);
    }
}

function normalizeData(data) {
    return data.map(row => {
        // Handle both database and CSV field names
        return {
            Query: row.Query || row.query || '',
            Source: row.Source || row.source || '',
            Model: row.Model || row.model || '',
            Sentiment: row.Sentiment || row.sentiment || '',
            // Add other fields as needed
        };
    });
}

function setupEventListeners(data) {
    const sourceDropdown = document.getElementById('source-dropdown');
    const queryDropdown = document.getElementById('query-dropdown');
    const modelDropdown = document.getElementById('model-dropdown');

    sourceDropdown.addEventListener('change', () => {
        try {
            console.log("Source changed to:", sourceDropdown.value);
            
            // Filter dropdown options first
            filterDropdownOptions(data);
            
            // Then update visualization if we have a complete selection
            updateStats(data);
        } catch (e) {
            console.error("Error in source change handler:", e);
            VisUtils.showErrorMessage('sentiment-stats', "An error occurred while updating the display.");
        }
    });
    
    queryDropdown.addEventListener('change', () => {
        try {
            console.log("Query changed to:", queryDropdown.value);
            
            // Filter dropdown options first
            filterDropdownOptions(data);
            
            // Then update visualization if we have a complete selection
            updateStats(data);
        } catch (e) {
            console.error("Error in query change handler:", e);
            VisUtils.showErrorMessage('sentiment-stats', "An error occurred while updating the display.");
        }
    });

    modelDropdown.addEventListener('change', () => {
        try {
            console.log("Model changed to:", modelDropdown.value);
            
            // Filter dropdown options first
            filterDropdownOptions(data);
            
            // Then update visualization if we have a complete selection
            updateStats(data);
        } catch (e) {
            console.error("Error in model change handler:", e);
            VisUtils.showErrorMessage('sentiment-stats', "An error occurred while updating the display.");
        }
    });
}

function filterDropdownOptions(data) {
    const sourceDropdown = document.getElementById('source-dropdown');
    const queryDropdown = document.getElementById('query-dropdown');
    const modelDropdown = document.getElementById('model-dropdown');

    const selectedSource = sourceDropdown.value;
    const selectedQuery = queryDropdown.value;
    const selectedModel = modelDropdown.value;
    
    console.log("Filtering dropdowns with selections:", { 
        source: selectedSource, 
        query: selectedQuery, 
        model: selectedModel 
    });
    
    // First, determine which options are valid based on the current selection
    
    // 1. Find valid source options based on current query and model selections
    let validSources = allSources;
    if (selectedQuery || selectedModel) {
        validSources = [...new Set(data.filter(row => 
            (!selectedQuery || row.Query === selectedQuery) && 
            (!selectedModel || row.Model === selectedModel)
        ).map(row => row.Source))].sort();
        console.log("Valid sources after filtering:", validSources);
    }
    
    // 2. Find valid query options based on current source and model selections
    let validQueries = allQueries;
    if (selectedSource || selectedModel) {
        validQueries = [...new Set(data.filter(row => 
            (!selectedSource || row.Source === selectedSource) && 
            (!selectedModel || row.Model === selectedModel)
        ).map(row => row.Query))].sort();
        console.log("Valid queries after filtering:", validQueries);
    }
    
    // 3. Find valid model options based on current source and query selections
    let validModels = allModels;
    if (selectedSource || selectedQuery) {
        validModels = [...new Set(data.filter(row => 
            (!selectedSource || row.Source === selectedSource) && 
            (!selectedQuery || row.Query === selectedQuery)
        ).map(row => row.Model))].sort();
        console.log("Valid models after filtering:", validModels);
    }
    
    // Then update the dropdowns - always update all dropdowns
    
    // Important: We need to check if the current selected value is still valid
    // If not, we should reset that dropdown's selection
    
    // Update source dropdown
    if (!selectedSource || validSources.includes(selectedSource)) {
        VisUtils.populateDropdown(sourceDropdown, validSources, 'Select a Source', selectedSource);
    } else {
        VisUtils.populateDropdown(sourceDropdown, validSources, 'Select a Source');
        sourceDropdown.value = ""; // Reset selection if current value is invalid
    }
    
    // Update query dropdown
    if (!selectedQuery || validQueries.includes(selectedQuery)) {
        VisUtils.populateDropdown(queryDropdown, validQueries, 'Select a Search Query', selectedQuery);
    } else {
        VisUtils.populateDropdown(queryDropdown, validQueries, 'Select a Search Query');
        queryDropdown.value = ""; // Reset selection if current value is invalid
    }
    
    // Update model dropdown
    if (!selectedModel || validModels.includes(selectedModel)) {
        VisUtils.populateDropdown(modelDropdown, validModels, 'Select an AI Model', selectedModel);
    } else {
        VisUtils.populateDropdown(modelDropdown, validModels, 'Select an AI Model');
        modelDropdown.value = ""; // Reset selection if current value is invalid
    }
    
    // Check if current selections form a valid combination
    if (selectedSource && selectedQuery && selectedModel) {
        const combinationExists = data.some(row => 
            row.Source === selectedSource && 
            row.Query === selectedQuery && 
            row.Model === selectedModel
        );
        
        console.log("Selected combination exists in data:", combinationExists);
        
        if (!combinationExists) {
            // This combination doesn't exist in the data, alert the user
            console.warn("No data available for the selected combination");
            document.getElementById('loading').style.display = 'none';
            document.getElementById('sentiment-stats').style.display = 'none';
            document.getElementById('no-data').style.display = 'block';
            document.getElementById('no-data').innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>No data available for "${selectedQuery}" by ${selectedSource} using ${selectedModel}.</p>
                <p>Please try a different combination.</p>
            `;
            
            // Clear visualization
            VisUtils.clearVisualization('sentiment-label');
        }
    }
}

function updateStats(data) {
    const sourceDropdown = document.getElementById('source-dropdown');
    const queryDropdown = document.getElementById('query-dropdown');
    const modelDropdown = document.getElementById('model-dropdown');

    const selectedSource = sourceDropdown.value;
    const selectedQuery = queryDropdown.value;
    const selectedModel = modelDropdown.value;

    if (selectedSource && selectedQuery && selectedModel) {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('no-data').style.display = 'none';
        document.getElementById('sentiment-stats').style.display = 'none';
        
        // Check if this combination exists in the data
        const combinationExists = data.some(row => 
            row.Source === selectedSource && 
            row.Query === selectedQuery && 
            row.Model === selectedModel
        );
        
        if (!combinationExists) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('sentiment-stats').style.display = 'none';
            document.getElementById('no-data').style.display = 'block';
            document.getElementById('no-data').innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>No data available for "${selectedQuery}" by ${selectedSource} using ${selectedModel}.</p>
                <p>Please try a different combination.</p>
            `;
            return;
        }
        
        setTimeout(() => {
            const filteredData = data.filter(row => 
                row.Source === selectedSource && row.Query === selectedQuery && row.Model === selectedModel
            );
            
            console.log(`Filtered data for ${selectedSource}, ${selectedQuery}, ${selectedModel}:`, filteredData.length);
            
            if (filteredData.length === 0) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('sentiment-stats').style.display = 'none';
                document.getElementById('no-data').style.display = 'block';
                document.getElementById('no-data').innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>No data available for "${selectedQuery}" by ${selectedSource} using ${selectedModel}.</p>
                    <p>Please try a different combination.</p>
                `;
                return;
            }
    
            updateStatsSummary(selectedQuery, selectedSource, selectedModel, filteredData);
            update3DVisualization(filteredData);
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('no-data').style.display = 'none';
            document.getElementById('sentiment-stats').style.display = 'block';
            
            const container = document.getElementById('threejs-container');
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
            
            // Reset camera position for better view
            VisUtils.resetCamera();
        }, 500);
    } else {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('sentiment-stats').style.display = 'none';
        document.getElementById('no-data').style.display = 'block';
        document.getElementById('no-data').innerHTML = `
            <i class="fas fa-info-circle"></i>
            <p>Please select a Source, Query, and Model to view sentiment analysis.</p>
        `;
    }
}

function updateStatsSummary(selectedQuery, selectedSource, selectedModel, data) {
    // Validate input more thoroughly
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.error("No data available for the selected combination:", {
            query: selectedQuery,
            source: selectedSource,
            model: selectedModel,
            dataLength: data ? data.length : 'null'
        });
        
        document.getElementById('stats-heading').innerHTML = 
            `No data available for <strong>${selectedQuery}</strong> by ${selectedSource} using ${selectedModel}`;
        document.getElementById('sentiment-details').innerHTML = '';
        
        // Clear visualization when no data is available
        VisUtils.clearVisualization('sentiment-label');
        
        return;
    }

    // Log successful data retrieval
    
    const groupedStats = {};
    data.forEach(row => {
        // Simplify key creation
        const key = `${selectedQuery}_${selectedSource}_${selectedModel}`;
        
        const sentiment = (row.Sentiment || 'unknown').toLowerCase();
        
        if (!groupedStats[key]) {
            groupedStats[key] = { positive: 0, negative: 0, neutral: 0, total: 0 };
        }
        
        if (sentiment === 'positive') groupedStats[key].positive++;
        else if (sentiment === 'negative') groupedStats[key].negative++;
        else if (sentiment === 'neutral') groupedStats[key].neutral++;
        groupedStats[key].total++;
    });

    const statsKey = `${selectedQuery}_${selectedSource}_${selectedModel}`;

    if (!groupedStats[statsKey] || groupedStats[statsKey].total === 0) {
        document.getElementById('stats-heading').innerHTML = 
            `No sentiment data found for <strong>${selectedQuery}</strong> by ${selectedSource} using ${selectedModel}`;
        document.getElementById('sentiment-details').innerHTML = '';
        return;
    }

    const stats = groupedStats[statsKey];
    const positivePercent = ((stats.positive / stats.total) * 100).toFixed(1);
    const negativePercent = ((stats.negative / stats.total) * 100).toFixed(1);
    const neutralPercent = ((stats.neutral / stats.total) * 100).toFixed(1);

    document.getElementById('stats-heading').innerHTML = `Analysis for <strong>${selectedQuery}</strong> by ${selectedSource} using ${selectedModel}`;
    document.getElementById('sentiment-details').innerHTML = `
        <div class="stat-card">
            <div class="stat-box positive">
                <h4>Positive</h4>
                <p>${positivePercent}%</p>
            </div>
            <div class="stat-box neutral">
                <h4>Neutral</h4>
                <p>${neutralPercent}%</p>
            </div>
            <div class="stat-box negative">
                <h4>Negative</h4>
                <p>${negativePercent}%</p>
            </div>
        </div>
    `;
}

function update3DVisualization(data) {
    VisUtils.clearVisualization('sentiment-label');

    const groupedStats = data.reduce((acc, row) => {
        const sentiment = (row.Sentiment || 'unknown').toLowerCase();
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        acc.total = (acc.total || 0) + 1;
        return acc;
    }, {});
    
    if (!groupedStats.total) return;

    const maxHeight = 12;
    const spacing = 6;

    const sentiments = [
        { name: 'Negative', color: 0xf72585, value: groupedStats.negative || 0 },
        { name: 'Neutral', color: 0xe9ecef, value: groupedStats.neutral || 0 },
        { name: 'Positive', color: 0x4cc9f0, value: groupedStats.positive || 0 }
    ];

    sentiments.forEach((sentiment, index) => {
        const percentage = (sentiment.value / groupedStats.total) * 100;
        const targetHeight = Math.max(0.5, (sentiment.value / groupedStats.total) * maxHeight);
        
        // Create the bar using VisUtils
        VisUtils.createBar(
            sentiment.name,
            sentiment.color,
            sentiment.value,
            percentage,
            targetHeight,
            { x: (index - 1) * spacing, z: 0 },
            'sentiment-label'
        );
    });
}