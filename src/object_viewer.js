import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, OBJLoader } from 'three/examples/jsm/Addons.js';

// object_viewer.js — drop-in module to render four synchronised Three.js views (GLB/GLTF **or** OBJ)
// -----------------------------------------------------------------------------------------
// Usage example (place after <div id="object-viewer"> in your HTML):
//
// <script type="module">
//   import { initMultiMeshViewer } from './object_viewer.js';
//   initMultiMeshViewer({
//     containerId: 'object-viewer',
//     meshUrls: [
//       'models/original.obj',   // original mesh (OBJ)
//       'models/sphere.obj',     // sphere approximation (OBJ)
//       'models/latent.glb',     // latent-vector approximation (GLB)
//       'models/points.obj'      // point-cloud approximation (OBJ)
//     ]
//   });
// </script>
//
// You can freely mix OBJ and GLB/GLTF formats; the loader is chosen by file
// extension. All four panes share one camera, so any orbit/zoom pans every view.

export function initMultiMeshViewer({
  paneIds   = [],
  meshUrls  = [],
  labels    = ['Original', 'Sphere', 'Latent', 'Point']
} = {}) {
  if (paneIds.length !== 4 || meshUrls.length !== 4) {
    console.error('[MultiMeshViewer] Need exactly four paneIds and four meshUrls');
    return;
  }

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(2, 2, 2);

  const scenes    = [];
  const renderers = [];
  const controls  = [];

  const gltfLoader = new GLTFLoader();
  const objLoader  = new OBJLoader();

  function chooseLoader(url) {
    const ext = url.split('.').pop().toLowerCase();
    if (ext === 'obj')  return objLoader;
    if (ext === 'glb' || ext === 'gltf') return gltfLoader;
    throw new Error(`Unsupported file extension “.${ext}”`);
  }

  function loadMesh(url) {
    return new Promise((resolve, reject) => {
      chooseLoader(url).load(
        url,
        asset => {
          const sceneGraph = asset.scene || asset; // GLB vs OBJ
          sceneGraph.traverse(c => {
            if (c.isMesh && !c.material) {
              c.material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
            }
          });
          resolve(sceneGraph);
        },
        undefined,
        reject
      );
    });
  }

  /* --------------------------------------------------------------------- */
  /* 3.  Build panes from provided <div>s                                  */
  /* --------------------------------------------------------------------- */
  for (let i = 0; i < 4; ++i) {
    const host = document.getElementById(paneIds[i]);
    if (!host) {
      console.error(`[MultiMeshViewer] Element #${paneIds[i]} not found.`);
      return;
    }

    // Ensure the host is positioned (we leave sizing to external CSS).
    host.style.position = host.style.position || 'relative';

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    host.appendChild(renderer.domElement);

    // Scene + simple lights
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.7));

    // OrbitControls — share SAME camera across panes
    const ctrl = new OrbitControls(camera, renderer.domElement);
    ctrl.enableDamping = true;
    ctrl.addEventListener('change', renderAll);

    // Overlay label (if host has none already)
    if (!host.querySelector('.mesh-label')) {
      const label = document.createElement('span');
      label.className = 'mesh-label';
      label.textContent = labels[i] || `Mesh ${i + 1}`;
      Object.assign(label.style, {
        position: 'absolute',
        top: '8px',
        left: '8px',
        padding: '2px 6px',
        borderRadius: '4px',
        font: '14px/1 sans-serif',
        background: 'rgba(0,0,0,0.55)',
        color: '#fff',
        pointerEvents: 'none',
        userSelect: 'none',
      });
      host.appendChild(label);
    }

    scenes.push(scene);
    renderers.push(renderer);
    controls.push(ctrl);
  }

  /* --------------------------------------------------------------------- */
  /* 4.  Load meshes and kick-off loop                                     */
  /* --------------------------------------------------------------------- */
  Promise.all(meshUrls.map(loadMesh)).then(meshes => {
    meshes.forEach((graph, i) => scenes[i].add(graph.clone()));
    onResize();
    animate();
  }).catch(err => console.error('[MultiMeshViewer] Mesh load error →', err));

  /* --------------------------------------------------------------------- */
  /* 5.  Render / resize loop                                              */
  /* --------------------------------------------------------------------- */
  function onResize() {
    console.log(renderers[0].domElement);
    const rect = renderers[0].domElement.getBoundingClientRect();
    width = rect.width / 2;
    height = rect.height / 2;
    renderers.forEach(renderer => {
        const parent = renderer.domElement.parentElement;
        renderer.setSize(parent.clientWidth, parent.clientHeight, false);
    });
    camera.aspect = width / height;
    console.log(rect.width, rect.height);
    camera.updateProjectionMatrix();
    renderAll();
  }
  window.addEventListener('resize', onResize);

  function renderAll() {
    for (let i = 0; i < 4; ++i) renderers[i].render(scenes[i], camera);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.forEach(c => c.update());
    renderAll();
  }
}

initMultiMeshViewer({
    containerId: 'object-viewer',
    paneIds: [
        "orig-view",
        "sphere-view",
        "latent-view",
        "points-view"
    ],
    meshUrls: [
        "ur5/meshes/ur5/visual/base_mobile.obj",
        "ur5/meshes/ur5/visual/base_mobile.obj",
        "ur5/meshes/ur5/visual/base_mobile.obj",
        "ur5/meshes/ur5/visual/base_mobile.obj",
    ]
});