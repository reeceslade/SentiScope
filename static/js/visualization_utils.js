// Common visualization utilities for 3D charts
let scene, camera, renderer, controls, raycaster, mouse;
let bars = [];
let animationInProgress = false;

// Initialize Three.js scene with all necessary components
function initThreeJS(containerId) {
    const container = document.getElementById(containerId);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x151515);
    
    // Create perspective camera with better default position
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 20, 25);
    
    // Create renderer with improved settings
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Better orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.8;
    controls.minDistance = 10;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    
    // Raycaster for hover effects
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Better lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(10, 20, 10);
    keyLight.castShadow = true;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 100;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-10, 15, -5);
    scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(5, 10, -15);
    scene.add(rimLight);
    
    // More visually appealing grid
    const grid = new THREE.GridHelper(40, 40, 0x444444, 0x333333);
    grid.position.y = -0.01;
    scene.add(grid);
    
    // Handle window resizing
    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
    
    container.addEventListener('mousemove', onMouseMove);
    
    return { scene, camera, renderer, controls };
}

// Animation loop for bar charts
function startAnimation(labelClass) {
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        
        // Smooth animation for bars
        let activeAnimation = false;
        bars.forEach(bar => {
            if (bar.scale.y < 1) {
                bar.scale.y += 0.05;
                bar.position.y = bar.userData.targetHeight * bar.scale.y / 2;
                activeAnimation = true;
            }
            
            // Gentle floating animation when not actively changing
            if (bar.scale.y >= 1 && !animationInProgress) {
                const time = Date.now() * 0.001;
                const index = bars.indexOf(bar);
                bar.position.y = bar.userData.targetHeight * bar.scale.y / 2 + Math.sin(time + index) * 0.1;
            }
        });
        
        if (activeAnimation) {
            animationInProgress = true;
        } else {
            animationInProgress = false;
        }
        
        renderer.render(scene, camera);
        updateLabelPositions(labelClass);
    }
    
    animate();
}

// Handle mouse movement for hover effects
function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bars);
    
    document.body.style.cursor = 'default';
    
    // Reset all bars
    bars.forEach(bar => {
        bar.material.emissive.setHex(0x000000);
        bar.scale.x = 1;
        bar.scale.z = 1;
        
        // Find and reset label (works for both sentiment and feedback labels)
        const sentimentLabel = document.querySelector(`.sentiment-label[data-bar-id="${bar.id}"]`);
        const feedbackLabel = document.querySelector(`.feedback-label[data-bar-id="${bar.id}"]`);
        const label = sentimentLabel || feedbackLabel;
        
        if (label) {
            label.style.transform = 'scale(1)';
            label.style.opacity = '0.8';
        }
    });
    
    if (intersects.length > 0) {
        const hoveredBar = intersects[0].object;
        hoveredBar.material.emissive.setHex(0x333333);
        hoveredBar.scale.x = 1.05;
        hoveredBar.scale.z = 1.05;
        document.body.style.cursor = 'pointer';
        
        // Enhance label (works for both sentiment and feedback labels)
        const sentimentLabel = document.querySelector(`.sentiment-label[data-bar-id="${hoveredBar.id}"]`);
        const feedbackLabel = document.querySelector(`.feedback-label[data-bar-id="${hoveredBar.id}"]`);
        const label = sentimentLabel || feedbackLabel;
        
        if (label) {
            label.style.transform = 'scale(1.1)';
            label.style.opacity = '1';
        }
    }
}

// Update the positions of labels to match their corresponding 3D bars
function updateLabelPositions(labelClass) {
    const container = document.getElementById('threejs-container');
    const rect = container.getBoundingClientRect();
    
    document.querySelectorAll(`.${labelClass}`).forEach(label => {
        const bar = scene.getObjectById(parseInt(label.dataset.barId));
        if (bar) {
            const vector = bar.position.clone();
            vector.y += bar.geometry.parameters.height * bar.scale.y / 2 + 2;
            vector.project(camera);
            
            if (vector.z < 1) {
                const x = (vector.x + 1) * rect.width / 2 + rect.left;
                const y = -(vector.y - 1) * rect.height / 2 + rect.top;
                
                label.style.left = `${x - 40}px`;
                label.style.top = `${y}px`;
                label.style.display = 'block';
            } else {
                label.style.display = 'none';
            }
        }
    });
}

// Create a 3D bar for visualization
function createBar(name, color, value, percentage, targetHeight, position, labelClass) {
    const barWidth = 4;
    const barDepth = 4;
    
    // Create geometry
    const geometry = new THREE.BoxGeometry(barWidth, targetHeight, barDepth);
    
    // Create material with better reflectivity and gradient
    const material = new THREE.MeshPhongMaterial({ 
        color: color,
        shininess: 50,
        specular: 0x333333,
        transparent: true,
        opacity: 0.9
    });
    
    const bar = new THREE.Mesh(geometry, material);
    bar.castShadow = true;
    bar.receiveShadow = true;
    
    // Start with zero height for smooth animation
    bar.scale.y = 0;
    bar.position.set(position.x, 0, position.z || 0);
    bar.userData.targetHeight = targetHeight;
    bar.userData.name = name;
    bar.userData.percentage = percentage;
    bar.userData.value = value;
    
    scene.add(bar);
    bars.push(bar);
    
    // Create label
    const label = document.createElement('div');
    label.className = labelClass;
    label.dataset.barId = bar.id;
    label.innerHTML = `${name}<br>${percentage.toFixed(1)}%`;
    document.getElementById('threejs-container').appendChild(label);
    
    // Add floor highlight
    const highlightGeometry = new THREE.CircleGeometry(barWidth * 0.8, 32);
    const highlightMaterial = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.2
    });
    const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlight.rotation.x = -Math.PI / 2;
    highlight.position.set(bar.position.x, 0.01, bar.position.z);
    scene.add(highlight);
    
    return bar;
}

// Clear all bars and labels
function clearVisualization(labelClass) {
    document.querySelectorAll(`.${labelClass}`).forEach(el => el.remove());
    bars.forEach(bar => scene.remove(bar));
    bars = [];
}

// Reset camera position
function resetCamera() {
    camera.position.set(0, 20, 25);
    controls.update();
}

// Helper function to display error messages
function showErrorMessage(elementId, message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById(elementId).style.display = 'none';
    document.getElementById('no-data').style.display = 'block';
    document.getElementById('no-data').innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
    `;
}

// Helper function to populate dropdown
function populateDropdown(dropdown, options, defaultText, valueToSelect = null) {
    dropdown.innerHTML = `<option value="">${defaultText}</option>`;
    
    options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option;
        optionEl.textContent = option;
        dropdown.appendChild(optionEl);
    });
    
    // Set selected value if provided and valid
    if (valueToSelect && options.includes(valueToSelect)) {
        dropdown.value = valueToSelect;
    }
}

// Export the utilities
window.VisUtils = {
    initThreeJS,
    startAnimation,
    createBar,
    clearVisualization,
    resetCamera,
    showErrorMessage,
    populateDropdown
};