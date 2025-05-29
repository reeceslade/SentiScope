document.addEventListener('DOMContentLoaded', loadModelPerformance);

async function loadModelPerformance() {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('no-data').style.display = 'none';
        document.getElementById('model-performance').style.display = 'none';
        
        const res = await fetch('/api/model_performance_stats');
        const data = await res.json();
        
        document.getElementById('loading').style.display = 'none';
        
        if (!data || data.length === 0 || data.error) {
            document.getElementById('no-data').style.display = 'block';
            document.getElementById('no-data').innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>${data.error || 'No model feedback data available'}</p>
            `;
            return;
        }
        
        document.getElementById('no-data').style.display = 'block';
        
        const modelDropdown = document.getElementById('model-dropdown');
        
        // Initialize the 3D visualization
        const { scene, camera, renderer, controls } = VisUtils.initThreeJS('threejs-container');
        VisUtils.startAnimation('feedback-label');
        
        // Populate dropdown
        const models = data.map(item => item.model).sort();
        VisUtils.populateDropdown(modelDropdown, models, 'Select an AI Model');
        
        // Add event listener
        modelDropdown.addEventListener('change', () => {
            updateModelStats(data);
        });
        
        function updateModelStats(data) {
            const selectedModel = modelDropdown.value;
            
            if (selectedModel) {
                document.getElementById('loading').style.display = 'block';
                document.getElementById('no-data').style.display = 'none';
                document.getElementById('model-performance').style.display = 'none';
                
                setTimeout(() => {
                    const modelData = data.find(item => item.model === selectedModel);
                    
                    if (modelData) {
                        updateStatsSummary(selectedModel, modelData);
                        update3DVisualization(modelData);
                        
                        document.getElementById('loading').style.display = 'none';
                        document.getElementById('no-data').style.display = 'none';
                        document.getElementById('model-performance').style.display = 'block';
                        
                        const container = document.getElementById('threejs-container');
                        camera.aspect = container.clientWidth / container.clientHeight;
                        camera.updateProjectionMatrix();
                        renderer.setSize(container.clientWidth, container.clientHeight);
                        
                        // Reset camera position for better view
                        VisUtils.resetCamera();
                    } else {
                        VisUtils.showErrorMessage('model-performance', `No data available for ${selectedModel}`);
                    }
                }, 500);
            } else {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('model-performance').style.display = 'none';
                document.getElementById('no-data').style.display = 'block';
            }
        }
        
        function updateStatsSummary(selectedModel, data) {
            document.getElementById('stats-heading').innerHTML = `Feedback Analysis for <strong>${selectedModel}</strong>`;
            
            const upPercent = data.up_percentage.toFixed(1);
            const downPercent = data.down_percentage.toFixed(1);
            
            document.getElementById('feedback-details').innerHTML = `
                <div class="stat-card">
                    <div class="stat-box positive">
                        <h4>Thumbs Up</h4>
                        <p>${upPercent}%</p>
                        <small>(${data.thumbs_up} ratings)</small>
                    </div>
                    <div class="stat-box negative">
                        <h4>Thumbs Down</h4>
                        <p>${downPercent}%</p>
                        <small>(${data.thumbs_down} ratings)</small>
                    </div>
                    <div class="stat-box neutral">
                        <h4>Total Feedback</h4>
                        <p>${data.total}</p>
                        <small>ratings</small>
                    </div>
                </div>
            `;
        }
        
        function update3DVisualization(data) {
            VisUtils.clearVisualization('feedback-label');
            
            if (!data || !data.total) return;
            
            const maxHeight = 12;
            const spacing = 8;
            
            const feedbackTypes = [
                { name: 'Thumbs Down', color: 0xf72585, value: data.thumbs_down, percentage: data.down_percentage },
                { name: 'Thumbs Up', color: 0x4cc9f0, value: data.thumbs_up, percentage: data.up_percentage }
            ];
            
            feedbackTypes.forEach((feedback, index) => {
                // Calculate position to center the bars
                const xPosition = (index - 0.5) * spacing;
                const targetHeight = Math.max(0.5, (feedback.value / data.total) * maxHeight);
                
                // Create the bar
                VisUtils.createBar(
                    feedback.name,
                    feedback.color,
                    feedback.value,
                    feedback.percentage,
                    targetHeight,
                    { x: xPosition, z: 0 },
                    'feedback-label'
                );
            });
        }
    } catch (err) {
        console.error("Error loading model performance:", err);
        VisUtils.showErrorMessage('model-performance', 'Error loading data. Please try again later.');
    }
}