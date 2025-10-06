import EasingHelper from "@packages/acore-ts/ui/animation/EasingHelper";
import { mergeCls } from "@packages/acore-ts/ui/ClassHelpers";
import { createSignal, onCleanup, Show, type JSX } from "solid-js";
import { AmbientLight, OrthographicCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

type Props = {
  /**
   * The path to the Draco decoder. This is required for loading models that use Draco compression. Path should be
   * included `draco_decoder.js`, `draco_decoder.wasm`, `draco_encoder.js`, and `draco_wasm_wrapper.js` in public
   * directory.
   *
   * @see https://threejs.org/docs/?q=drac#examples/en/loaders/DRACOLoader
   */
  decoderPath: string;
  /**
   * The path to the 3D model. The path should be in public directory.
   *
   * @see https://threejs.org/docs/#examples/en/loaders/GLTFLoader
   */
  modelPath: string;
  modelScale: number;
  configureScene?: (scene: Scene) => void;
  configureModel?: (model: GLTF) => void;
  configureCamera?: (camera: OrthographicCamera) => void;
  configureControls?: (controls: OrbitControls) => void;

  class?: string;
  loadingElement?: JSX.Element;
};

/**
 * ThreeDimensionModelViewer component to display a 3D model using Three.js.
 *
 * @param props - The component properties.
 * @param props.decoderPath - The path to the Draco decoder.
 * @param props.modelPath - The path to the 3D model.
 * @param props.modelScale - The scale of the 3D model.
 * @param props.configureScene - The function to configure the scene.
 * @param props.configureModel - The function to configure the model.
 * @param props.configureCamera - The function to configure the camera.
 * @param props.configureControls - The function to configure the controls.
 * @param props.class - The class name for the root element.
 * @param props.loadingElement - The loading element to display while the model is loading.
 */
export default function ThreeDimensionModelViewer(props: Props) {
  let containerRef: HTMLDivElement;
  let renderer: WebGLRenderer | undefined;
  let camera: OrthographicCamera | undefined;
  let scene: Scene | undefined;
  let controls: OrbitControls | undefined;
  let loader: GLTFLoader | undefined;

  const [isLoading, setIsLoading] = createSignal(true);
  const [renderElement, setRenderElement] = createSignal<HTMLCanvasElement>();

  /**
   * Handles the mounting of the container element.
   *
   * @param {HTMLDivElement} element - The container element.
   */
  function onContainerElementMount(element: HTMLDivElement) {
    containerRef = element;

    window.addEventListener("resize", onWindowResized);

    requestAnimationFrame(() => {
      initThree();
      loadModel();
      onWindowResized();
    });
  }

  onCleanup(() => {
    if (controls) controls.dispose();
    if (renderer && containerRef) containerRef.removeChild(renderer.domElement);
    if (renderer) renderer.dispose();
    if (loader) loader = undefined;
    if (scene) scene = undefined;
    if (camera) camera = undefined;
    window.removeEventListener("resize", onWindowResized);
  });

  /**
   * Initializes the Three.js renderer, scene, camera, and controls.
   *
   * @throws Will throw an error if the container element is not mounted.
   */
  function initThree() {
    if (!containerRef) throw new Error("Container element is not mounted yet.");
    const { clientWidth: width, clientHeight: height } = containerRef;

    // Renderer
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = SRGBColorSpace;

    // Scene
    scene = new Scene();

    // Camera
    const scale = height * 0.005 + 4.8;
    const aspect = width / height;
    camera = new OrthographicCamera(-scale * aspect, scale * aspect, scale, -scale, 0.01, 50000);
    const target = new Vector3(-0.5, -1, 0);
    if (props.configureCamera) props.configureCamera(camera);
    else {
      camera.position.set(20 * Math.sin(0.2 * Math.PI), 10, 50 * Math.cos(0.2 * Math.PI));
      camera.lookAt(target);
    }

    if (props.configureScene) props.configureScene(scene);
    else {
      // Lights
      const ambientLight = new AmbientLight("#fff", 1.2);
      scene.add(ambientLight);
    }

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);

    if (props.configureControls) props.configureControls(controls);
    else {
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.dampingFactor = 0.25;
      controls.enableZoom = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 2;
      controls.maxPolarAngle = Math.PI / 2;
      controls.minZoom = 0.4;
      controls.maxZoom = 5;
      controls.target = target;
    }

    // Loader
    loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    const decoderPath = props.decoderPath;
    dracoLoader.setDecoderPath(decoderPath);
    loader.setDRACOLoader(dracoLoader);
    setRenderElement(renderer.domElement);
  }

  /** Loads the 3D model using GLTFLoader. */
  function loadModel() {
    loader?.load(
      props.modelPath,
      (gltf: GLTF) => {
        if (props.configureModel) props.configureModel(gltf);
        else {
          gltf.scene.position.y = 0;
          gltf.scene.position.x = 0;
        }
        gltf.scene.receiveShadow = true;
        gltf.scene.castShadow = true;
        gltf.scene.scale.set(props.modelScale, props.modelScale, props.modelScale);
        scene?.add(gltf.scene);
        setIsLoading(false);
        animate();
      },
      undefined,
      (error: unknown) => {
        setIsLoading(false);
        throw new Error(error as string);
      },
    );
  }

  /** Handles window resize events to adjust the renderer and camera. */
  function onWindowResized() {
    if (!containerRef || !renderer || !camera) return;

    const { clientWidth: width, clientHeight: height } = containerRef;
    const scale = height * 0.005 + 4.8;
    const aspect = width / height;
    camera.left = -scale * aspect;
    camera.right = scale * aspect;
    camera.top = scale;
    camera.bottom = -scale;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  let frame: number | undefined = 0;
  let initialCameraPosition: Vector3 | undefined;
  /** Animates the scene. */
  function animate() {
    if (isLoading()) return;
    if (!controls || !scene || !renderer || !camera) return;

    if (frame !== undefined && frame <= 100) {
      frame = frame! <= 100 ? frame + 1 : frame;
      const rotateSpeed = -EasingHelper.easeOutCirc(frame / 120) * Math.PI * 6;
      const target = new Vector3(-0.5, -1, 0);
      if (!initialCameraPosition) initialCameraPosition = camera.position.clone();

      camera.position.y = 10;
      camera.position.x =
        initialCameraPosition.x * Math.cos(rotateSpeed) + initialCameraPosition.z * Math.sin(rotateSpeed);
      camera.position.z =
        initialCameraPosition.z * Math.cos(rotateSpeed) - initialCameraPosition.x * Math.sin(rotateSpeed);
      camera.lookAt(target);
    } else {
      if (frame) frame = undefined;
      if (initialCameraPosition) initialCameraPosition = undefined;

      controls.update();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  return (
    <div ref={(element) => onContainerElementMount(element)} class={mergeCls("size-full", props.class)}>
      <Show when={isLoading()}>
        {props.loadingElement || (
          <span class="flex size-full items-center justify-center text-xs text-gray-500">Loading...</span>
        )}
      </Show>

      <Show when={renderElement()}>{renderElement()}</Show>
    </div>
  );
}
