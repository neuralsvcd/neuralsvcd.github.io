import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Mesh,
  PlaneGeometry,
  ShadowMaterial,
  DirectionalLight,
  PCFSoftShadowMap,
  Color,
  AmbientLight,
  Box3,
  LoadingManager,
  MathUtils,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import URDFLoader from './urdf_loader/URDFLoader';

let scene, camera, renderer, robot, controls, container;

init();
render();

function setRendererSize() {
  const { clientWidth: w, clientHeight: h } = container;
  renderer.setSize(w, h, false);       // false → don’t change CSS size
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function init() {

  scene = new Scene();
  scene.background = new Color(0x263238);

  camera = new PerspectiveCamera();
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  container = document.getElementById('ccd-viewer');
  container.appendChild(renderer.domElement);
  
  const directionalLight = new DirectionalLight(0xffffff, 1.0);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.setScalar(1024);
  directionalLight.position.set(5, 30, 5);
  scene.add(directionalLight);

  const ambientLight = new AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  const ground = new Mesh(new PlaneGeometry(), new ShadowMaterial({ opacity: 0.25 }));
  ground.rotation.x = -Math.PI / 2;
  ground.scale.setScalar(30);
  ground.receiveShadow = true;
  scene.add(ground);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 4;
  controls.target.y = 1;
  controls.update();

  // Load robot
  const manager = new LoadingManager();
  const loader = new URDFLoader(manager);
  
  loader.load('ur5/shakey_open.urdf', result => {
      robot = result;
  }, undefined, error => {
    console.error('An error happened', error);
  });

  // wait until all the geometry has loaded to add the model to the scene
  manager.onLoad = () => {
      console.log(robot)
      // robot.rotation.x = Math.PI / 2;
      robot.traverse(c => {
          c.castShadow = true;
      });
      console.log(robot.joints);
      // robot.joints: { [key: string]: Joint }
      
      Object.entries(robot.joints).forEach(([key, joint]) => {
        const jointType = joint._jointType;
        if (jointType === 'revolute') {
          const randomValue = MathUtils.randFloatSpread(360);
          console.log(randomValue);
          joint.setJointValue(MathUtils.degToRad(randomValue));
        }
      });
      console.log(robot.links);
      // robot.joints.forEach(joint => {
      //     const randomValue = MathUtils.randFloatSpread(360);
      //     joint.setJointValue(MathUtils.degToRad(randomValue));
      // });


      // for (let i = 1; i <= 6; i++) {

      //     robot.joints[`HP${ i }`].setJointValue(MathUtils.degToRad(30));
      //     robot.joints[`KP${ i }`].setJointValue(MathUtils.degToRad(120));
      //     robot.joints[`AP${ i }`].setJointValue(MathUtils.degToRad(-60));

      // }
      robot.updateMatrixWorld(true);

      const bb = new Box3();
      bb.setFromObject(robot);

      robot.position.y -= bb.min.y;
      scene.add(robot);

  };

  setRendererSize();
  const resizeObserver = new ResizeObserver(setRendererSize);
  resizeObserver.observe(container);
  window.addEventListener('resize', setRendererSize);
  
}

function render() {

  requestAnimationFrame(render);
  renderer.render(scene, camera);

}