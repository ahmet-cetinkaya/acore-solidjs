import EasingHelper from "@packages/acore-ts/ui/animation/EasingHelper";
import { mergeCls } from "@packages/acore-ts/ui/ClassHelpers";
import { createSignal, onCleanup, Show, createEffect, type JSX } from "solid-js";
import {
  AmbientLight,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from "three";
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
  autoRotate?: boolean;
  enableInitialAnimation?: boolean;
  initializationDelay?: number;

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
 * @param props.autoRotate - Whether to enable auto-rotation. Defaults to true.
 * @param props.enableInitialAnimation - Whether to enable the initial rotation animation. Defaults to true.
 * @param props.initializationDelay - Delay in milliseconds before scene initialization. Defaults to 0.
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

  // Effect to ensure proper viewport setup after canvas is attached to DOM
  createEffect(() => {
    const canvas = renderElement();
    if (canvas && renderer && containerRef) {
      // Ensure the canvas has proper dimensions and viewport is set
      const { clientWidth: width, clientHeight: height } = containerRef;

      // Multiple frames to ensure proper DOM and canvas synchronization
      requestAnimationFrame(() => {
        if (renderer && canvas) {
          // Synchronize canvas dimensions with container
          const canvasWidth = canvas.width || width * window.devicePixelRatio;
          const canvasHeight = canvas.height || height * window.devicePixelRatio;

          // Update viewport based on actual canvas drawing surface
          const drawWidth = canvasWidth / window.devicePixelRatio;
          const drawHeight = canvasHeight / window.devicePixelRatio;

          renderer.setViewport(0, 0, drawWidth, drawHeight);

          // Force a second frame update to ensure WebGL context is aware
          requestAnimationFrame(() => {
            if (renderer) {
              renderer.setViewport(0, 0, drawWidth, drawHeight);
            }
          });
        }
      });
    }
  });

  /**
   * Handles the mounting of the container element.
   *
   * @param {HTMLDivElement} element - The container element.
   */
  function onContainerElementMount(element: HTMLDivElement) {
    containerRef = element;

    if (typeof window !== "undefined") {
      window.addEventListener("resize", onWindowResized);
    }

    const delay = props.initializationDelay ?? 0;

    if (delay > 0) {
      // Use setTimeout for longer delays to avoid blocking the main thread
      setTimeout(() => {
        requestAnimationFrame(() => {
          initThree();
          loadModel();
          onWindowResized();
        });
      }, delay);
    } else {
      // For zero or no delay, use requestAnimationFrame immediately
      requestAnimationFrame(() => {
        initThree();
        loadModel();
        onWindowResized();
      });
    }
  }

  onCleanup(() => {
    if (controls) controls.dispose();

    // Dispose renderer first - let renderer.dispose() handle DOM cleanup internally
    if (renderer) {
      try {
        renderer.dispose();
      } catch (error) {
        // Ignore disposal errors, DOM may already be cleaned up by SolidJS
        console.debug("Renderer disposal error (expected during SolidJS cleanup):", error);
      }
    }

    if (loader) loader = undefined;
    if (scene) scene = undefined;
    if (camera) camera = undefined;
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", onWindowResized);
    }
  });

  /**
   * Initializes the Three.js renderer, scene, camera, and controls.
   *
   * @throws Will throw an error if the container element is not mounted.
   */
  function initThree() {
    if (!containerRef) throw new Error("Container element is not mounted yet.");
    const { clientWidth: width, clientHeight: height } = containerRef;

    // Renderer with enhanced WebGL context configuration
    renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });

    // Configure renderer settings
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap DPR for performance
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Ensure proper WebGL context state
    const webglContext = renderer.getContext();
    if (webglContext) {
      webglContext.disable(webglContext.SCISSOR_TEST);
      webglContext.viewport(0, 0, webglContext.drawingBufferWidth, webglContext.drawingBufferHeight);
    }

    // Set explicit viewport to match canvas dimensions
    renderer.setViewport(0, 0, width, height);

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

    // Store the control target for initial animation to respect model configuration
    initialControlTarget = controls.target.clone();

    // Loader
    loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    const decoderPath = props.decoderPath;
    dracoLoader.setDecoderPath(decoderPath);
    loader.setDRACOLoader(dracoLoader);

    // Configure canvas for proper sizing and remove wrapper issues
    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.zIndex = "0";
    canvas.style.display = "block";

    // Force WebGL context state initialization to prevent viewport warnings
    const gl = renderer.getContext();
    if (gl) {
      // Ensure clean WebGL state
      gl.disable(gl.SCISSOR_TEST);
      gl.disable(gl.STENCIL_TEST);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      // Set initial viewport to drawing buffer dimensions
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

      // Clear any potential framebuffer issues
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    // Set the render element - SolidJS will handle DOM attachment
    setRenderElement(canvas);
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
    const dpr = Math.min(window.devicePixelRatio, 2);
    const scale = height * 0.005 + 4.8;
    const aspect = width / height;

    // Update camera projection
    camera.left = -scale * aspect;
    camera.right = scale * aspect;
    camera.top = scale;
    camera.bottom = -scale;
    camera.updateProjectionMatrix();

    // Update renderer size with capped DPR
    renderer.setSize(width, height);

    // Force WebGL context state reset to prevent viewport issues
    const webglContext = renderer.getContext();
    if (webglContext) {
      // Disable scissor test which can cause viewport rect issues
      webglContext.disable(webglContext.SCISSOR_TEST);

      // Ensure viewport matches drawing buffer dimensions
      webglContext.viewport(0, 0, webglContext.drawingBufferWidth, webglContext.drawingBufferHeight);

      // Clear any potential WebGL state issues
      webglContext.bindFramebuffer(webglContext.FRAMEBUFFER, null);
    }

    // Update Three.js viewport to match logical dimensions
    renderer.setViewport(0, 0, width, height);

    // Force a render pass to ensure context is properly initialized
    renderer.clear();
  }

  let frame: number | undefined = 0;
  let initialCameraPosition: Vector3 | undefined;
  let initialControlTarget: Vector3 | undefined;
  /** Animates the scene. */
  function animate() {
    if (isLoading()) return;
    if (!controls || !scene || !renderer || !camera) return;

    const shouldAutoRotate = props.autoRotate !== false; // Default to true unless explicitly false
    const shouldDoInitialAnimation = props.enableInitialAnimation !== false; // Default to true unless explicitly false

    if (frame !== undefined && frame <= 100) {
      // Only do initial rotation if initial animation is enabled, regardless of autoRotate
      if (shouldDoInitialAnimation) {
        frame = frame! <= 100 ? frame + 1 : frame;
        const rotateSpeed = -EasingHelper.easeOutCirc(frame / 120) * Math.PI * 6;

        // Use the control target that was set during configuration
        const target = initialControlTarget || new Vector3(-0.5, -1, 0);
        if (!initialCameraPosition) initialCameraPosition = camera.position.clone();

        camera.position.y = 10;
        camera.position.x =
          initialCameraPosition.x * Math.cos(rotateSpeed) + initialCameraPosition.z * Math.sin(rotateSpeed);
        camera.position.z =
          initialCameraPosition.z * Math.cos(rotateSpeed) - initialCameraPosition.x * Math.sin(rotateSpeed);
        camera.lookAt(target);
      } else {
        // Skip initial animation if disabled
        frame = undefined;
        initialCameraPosition = undefined;
        initialControlTarget = undefined;
      }
    } else {
      if (frame) frame = undefined;
      if (initialCameraPosition) initialCameraPosition = undefined;
      if (initialControlTarget) initialControlTarget = undefined;

      // Only update controls for auto-rotation if enabled
      if (shouldAutoRotate) {
        controls.update();
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  return (
    <div ref={(element) => onContainerElementMount(element)} class={mergeCls("relative size-full", props.class)}>
      {/* Loading Element - Always positioned at front of scene stack */}
      <div
        class={mergeCls(
          "absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200",
          isLoading() ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Show when={isLoading()}>
          {props.loadingElement || (
            <span class="flex size-full items-center justify-center text-xs text-gray-500">Loading...</span>
          )}
        </Show>
      </div>

      {/* Canvas Element - Directly positioned without wrapper */}
      <Show when={renderElement()}>{renderElement()}</Show>
    </div>
  );
}
