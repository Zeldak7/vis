var noise = new SimplexNoise();
var audio = new Audio("audio.mp3"); //"/media/The-Stars.mp3"
var play = false;



document.body.addEventListener('click', () => {
    //console.log("Play");
    if (isPlaying(audio)) {
        console.log("Pause");
        audio.pause();
    } else {
        console.log("Play");
        audio.play();
    }
});

function isPlaying(audioIn) {
    return !audioIn.paused;
}


function startViz() {
    //audio anayser setup
    var context = new AudioContext();
    var src = context.createMediaElementSource(audio);
    var analyser = context.createAnalyser();
    src.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 512;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    //webgl
    var scene = new THREE.Scene();
    var group = new THREE.Group();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100;
    scene.add(camera);

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);

    var geometry = new THREE.IcosahedronGeometry(20, 3);
    var wireframe = new THREE.EdgesGeometry(geometry);

    var geometry2 = new THREE.TorusGeometry(90, 40, 50);
    var wireframe = new THREE.EdgesGeometry(geometry2);


    var material2 = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false });
    var color1 = "#008800";
    var color2 = "#008800";



    var material = new THREE.ShaderMaterial({
        uniforms: {
            color1: {
                value: new THREE.Color(color1)
            },
            color2: {
                value: new THREE.Color(color2)
            }

        },
        vertexShader: `
          varying vec2 vUv;
      
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
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

    var ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    var ball = new THREE.Mesh(geometry, material);
    ball.position.set(0, 0, 0);

    var ball2 = new THREE.Mesh(geometry2, material);
    ball2.position.set(0, 0, 0);

    var ground1 = new THREE.Mesh(geometry2, material);
    ground1.position.set(0, 0, 0);


    const line = new THREE.Line(geometry, material2);
    scene.add(line);


    // group.add(ground1);
    group.add(ball);
    group.add(ball2);
    scene.add(group);

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    function render() {
        analyser.getByteFrequencyData(dataArray);

        var lowerHalfArray = dataArray.slice(0, (dataArray.length / 2) - 1);
        var upperHalfArray = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

        var overallAvg = avg(dataArray);
        var lowerMax = max(lowerHalfArray);
        var lowerAvg = avg(lowerHalfArray);
        var upperMax = max(upperHalfArray);
        var upperAvg = avg(upperHalfArray);

        var lowerMaxFr = lowerMax / lowerHalfArray.length;
        var lowerAvgFr = lowerAvg / lowerHalfArray.length;
        var upperMaxFr = upperMax / upperHalfArray.length;
        var upperAvgFr = upperAvg / upperHalfArray.length;

        ball.rotation.x += 0.001;
        ball.rotation.y += 0.001;
        ball.rotation.z += 0.001;


        ball2.rotation.x += 0.000;
        ball2.rotation.y += 0.000;
        ball2.rotation.z += 0.01;
        ground1.rotation.z += 0.01;


        WarpBall(ball, modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8), modulate(upperAvgFr, 0, 1, 1, 7));
        WarpBall(ball2, modulate(Math.pow(lowerMaxFr, 0.001), 0, 1, 0, 80), modulate(upperAvgFr, 0, 1, 1, 4));


        requestAnimationFrame(render);
        renderer.render(scene, camera);
    };

    function WarpBall(mesh, bassFr, treFr) {
        mesh.geometry.vertices.forEach(function(vertex, i) {
            var offset = mesh.geometry.parameters.radius;
            var amp = 4;
            var time = window.performance.now();
            vertex.normalize();
            var rf = 0.00004;
            var distance = (offset + bassFr) + noise.noise3D(vertex.x + time * rf * 6, vertex.y + time * rf * 7, vertex.z + time * rf * 8) * amp * treFr;
            vertex.multiplyScalar(distance);
            var lol = noise.noise3D(vertex.x + time * rf * 6, vertex.y + time * rf * 7, vertex.z + time * rf * 8) * amp * treFr;
            console.log(lol);
            if (lol > 5 || lol > -5) {

                ball.material.uniforms.color2.value.set(0xff8800);
                ball.material.uniforms.color1.value.set(0xff0000);


            };






            if (lol < 5 || lol < -5) {

                console.log("istance2");

                ball.material.uniforms.color2.value.set(0x3d85c6);
                ball.material.uniforms.color1.value.set(0x3d85c6);


                //ball.material.color.setHex(0x00ffff);



            }








        });
        mesh.geometry.verticesNeedUpdate = true;
        mesh.geometry.normalsNeedUpdate = true;
        mesh.geometry.computeVertexNormals();
        mesh.geometry.computeFaceNormals();
    }

    render();
};

//helper functions
function fractionate(val, minVal, maxVal) {
    return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
    var fr = fractionate(val, minVal, maxVal);
    var delta = outMax - outMin;
    return outMin + (fr * delta);
}

function avg(arr) {
    var total = arr.reduce(function(sum, b) { return sum + b; });
    return (total / arr.length);
}

function max(arr) {
    return arr.reduce(function(a, b) { return Math.max(a, b); })
}