import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'

// Load Assets

var textures = {
    
}

var characterModel, lightsaberModel;
var holdingLightsaber = false;
var walking = false;

function loadAssets(resolve, reject) {
    var textureloader = new THREE.TextureLoader();
    var fbxloader = new FBXLoader();
    var assetsLoaded = 3;

    textureloader.load(
        "textures/ground/ground.jpg",
        function (texture) {
            textures.ground = texture
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            assetsLoaded -= 1
            if (assetsLoaded == 0) {
                resolve()
            }
        }
    )

    fbxloader.load(
        "models/Anakin Skywalker/final.fbx",
        (object) => {
            var box = new THREE.Box3().setFromObject( object );
            var size = new THREE.Vector3();
            box.getSize( size );
            var scale = 3/size.y;

            object.scale.set(scale, scale, scale)

            characterModel = object
            assetsLoaded -= 1
            if (assetsLoaded == 0) {
                resolve()
            }
        }
    )

    fbxloader.load(
        "models/lightsaber/lightsaber.fbx",
        (object) => {
            var box = new THREE.Box3().setFromObject( object );
            var size = new THREE.Vector3();
            box.getSize( size );
            var scale = 2/size.y*65;

            object.scale.set(scale, scale, scale)

            lightsaberModel = object
            assetsLoaded -= 1
            if (assetsLoaded == 0) {
                resolve()
            }
        }
    )
}

var loadGamePromise = new Promise(loadAssets)
loadGamePromise.then(loadGame)

function loadGame() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.z = 3;
    camera.position.y = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    const light = new THREE.AmbientLight( 0x404040, 20);
    scene.add( light );

    // Ground

    var w = 200, d = 200;
    var repeat = w/25;
    const groundgeo = new THREE.BoxGeometry( w, 0.1, d );
    textures.ground.repeat.set( repeat, repeat );
    const groundmat = new THREE.MeshBasicMaterial( { map: textures.ground } );
    const ground = new THREE.Mesh( groundgeo, groundmat );
    scene.add( ground );

    ground.position.y = 0;

    // Character Model

    var mixer;
    mixer = new THREE.AnimationMixer(characterModel);
    var idleAnimation = mixer.clipAction(characterModel.animations.find((clip) => clip.name === 'Armature|Idle'))
    var idleSwordAnimation = mixer.clipAction(characterModel.animations.find((clip) => clip.name === 'Armature|idlesword'))
    var activeAction = idleAnimation
    var lastAction;
    activeAction.play(activeAction)

    var handBone = characterModel.getObjectByName("mixamorigRightHandThumb3")
    lightsaberModel.rotation.x = -Math.PI/2
    lightsaberModel.rotation.z = -Math.PI/2
    lightsaberModel.position.x = -30
    lightsaberModel.position.z = -2
    handBone.add( lightsaberModel );

    scene.add(characterModel)

    function playAction(animation) {
        if (animation != activeAction) {
            lastAction = activeAction
            activeAction = animation
            lastAction.fadeOut(0.4)
            activeAction.reset()
            activeAction.fadeIn(0.4)
            activeAction.play()
        }
    }

    // Background

    var sky = new Sky();
    sky.scale.setScalar( 450000 );
    scene.add( sky );

    var sun = new THREE.Vector3();

    var effectController = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
        elevation: 2,
        azimuth: 180,
        exposure: renderer.toneMappingExposure
    };

    var uniforms = sky.material.uniforms;
    uniforms[ 'turbidity' ].value = effectController.turbidity;
    uniforms[ 'rayleigh' ].value = effectController.rayleigh;
    uniforms[ 'mieCoefficient' ].value = effectController.mieCoefficient;
    uniforms[ 'mieDirectionalG' ].value = effectController.mieDirectionalG;

    var phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
    var theta = THREE.MathUtils.degToRad( effectController.azimuth );

    sun.setFromSphericalCoords( 1, phi, theta );

    uniforms[ 'sunPosition' ].value.copy( sun );

    renderer.toneMappingExposure = effectController.exposure;

    window.addEventListener( 'resize', onWindowResize, false );

    function updateAnimation() {
        if (holdingLightsaber && !walking && activeAction != idleSwordAnimation) {
            playAction(idleSwordAnimation)
        } if (!holdingLightsaber && !walking && activeAction != idleAnimation) {
            console.log(activeAction)
            playAction(idleAnimation)
        }
    }

    function onWindowResize(){
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    }

    var clock = new THREE.Clock()

    function animate() {
        requestAnimationFrame( animate );

        updateAnimation()

        mixer.update(clock.getDelta())

        renderer.render( scene, camera );
    }
    animate();

    setTimeout(() => {
        holdingLightsaber = true
    }, 10000)
}