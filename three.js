// Initialize SimplexNoise
const noise = new SimplexNoise();

// Audio and play state
const audio = new Audio("audio.mp3");
let isPlaying = false;

// Toggle play/pause on body click
document.body.addEventListener('click', () => {
    if (isPlaying) {
        pauseAudio();
    } else {
        playAudio();
    }
});

// Play audio
function playAudio() {
    audio.play();
    isPlaying = true;
}

// Pause audio
function pauseAudio() {
    audio.pause();
    isPlaying = false;
}

// Check if audio is playing
function isAudioPlaying() {
    return !audio.paused;
}

// Start visualization
function startVisualization() {
    const context = new AudioContext();
    const src = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    src.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Set up WebGL
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100;
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create geometries and materials
    const geometry = new THREE.IcosahedronGeometry(20, 2);
    const material = createShaderMaterial("#ffffff", "#0000ff"); // Changing colors to blue
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(bufferLength * 3); // Three components per particle (x, y, z)
    particleGeometry.addAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: 0x0000ff, size: 1 }); // Changing particle color to blue
    
    // Create mesh objects
    const ball = createMesh(geometry, material);
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    ball.position.set(-1, 0, 0)
    group.add(particleSystem);
    group.add(ball);
    scene.add(group);

    // Event listener for window resize
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    function updateParticles(dataArray) {
        const positions = particleSystem.geometry.attributes.position.array;
        for (let i = 0; i < bufferLength; i++) {
            positions[i * 3] = (i / bufferLength) * 1000 - 500; // X position
            positions[i * 3 + 1] = mapRange(dataArray[i], 0, 255, -100, 100); // Y position (based on audio data)
            positions[i * 3 + 2] = 0; // Z position
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // Render function
    function render() {
        analyser.getByteFrequencyData(dataArray);
        updateVisualizations(dataArray, ball);
        updateParticles(dataArray); // Update particle positions
        requestAnimationFrame(render);
        renderer.render(scene, camera);
    }

    render();
}

// Update visualizations based on audio data
function updateVisualizations(dataArray, ball) {
    const bass = calculateBass(dataArray);

    // Example: Rotate the ball based on bass level
    const rotationSpeed = mapRange(bass, 0, 255, 0.001, 0.01);
    ball.rotation.x += rotationSpeed;
    ball.rotation.y += rotationSpeed;

    // Example: Scale the ball based on bass intensity
    const scaleValue = mapRange(bass, 0, 255, 0.5, 2); // Scale between 0.5 and 2
    ball.scale.set(scaleValue, scaleValue, scaleValue);

    // Interpolate colors based on bass intensity
    const color1 = new THREE.Color(0xffffff); // White color
    const color2 = new THREE.Color(0x0000ff); // Blue color
    const bassInterpolation = mapRange(bass, 0, 255, 0, 1); // Map bass to interpolation range [0, 1]
    const interpolatedColor = color1.clone().lerp(color2, bassInterpolation); // Interpolate between color1 and color2 based on bass intensity
    ball.material.uniforms.color2.value.copy(interpolatedColor); // Apply interpolated color to ball
}

// Create a shader material
function createShaderMaterial(color1, color2) {
    return new THREE.ShaderMaterial({
        uniforms: {
            color1: { value: new THREE.Color(color1) },
            color2: { value: new THREE.Color(color2) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color1;
            uniform vec3 color2;
            varying vec2 vUv;
            void main() {
                gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
            }
        `,
        wireframe: true
    });
}

// Create a mesh with given geometry and material
function createMesh(geometry, material) {
    return new THREE.Mesh(geometry, material);
}

// Calculate bass from audio data
function calculateBass(dataArray) {
    const bassArray = dataArray.slice(0, dataArray.length / 4); // Considering only the lower frequencies
    return avg(bassArray);
}

// Map a value from one range to another
function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// Calculate average of an array
function avg(arr) {
    const total = arr.reduce((sum, b) => sum + b, 0);
    return total / arr.length;
}

// Start the visualization
startVisualization();