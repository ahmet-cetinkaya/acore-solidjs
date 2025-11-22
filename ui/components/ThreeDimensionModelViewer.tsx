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
  Box3,
  Group,
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
  /** Optional scale factor to apply ON TOP of the normalized scale. Defaults to 1. */
  modelScale?: number;
  configureScene?: (scene: Scene) => void;
  configureModel?: (model: GLTF) => void;
  configureCamera?: (camera: OrthographicCamera) => void;
  configureControls?: (controls: OrbitControls) => void;
  autoRotate?: boolean;
  enableInitialAnimation?: boolean;
  initializationDelay?: number;

  /**
   * Minimum horizontal scale (in world units) to ensure visibility on narrow screens. If the calculated horizontal
   * frustum width is smaller than this, the camera zoom will be adjusted.
   */
  minHorizontalScale?: number;

  /** Target point for the camera to look at. Defaults to (0, 0, 0). */
  cameraTarget?: Vector3;

  class?: string;
  loadingElement?: JSX.Element;
};

/**
 * ThreeDimensionModelViewer component to display a 3D model using Three.js.
 *
 * @param props - The component properties.
 */
export default function ThreeDimensionModelViewer(props: Props) {
  let containerRef: HTMLDivElement;
  let renderer: WebGLRenderer | undefined;
  let camera: OrthographicCamera | undefined;
  let scene: Scene | undefined;
  let controls: OrbitControls | undefined;
  let loader: GLTFLoader | undefined;
  let contentGroup: Group | undefined;

  const [isLoading, setIsLoading] = createSignal(true);
  const [renderElement, setRenderElement] = createSignal<HTMLCanvasElement>();

  // Constants for normalization
  const TARGET_SIZE = 6; // Standard size for all models
  const CAMERA_FRUSTUM_SIZE = 10; // Vertical size of the view

  /**
   * Handles the mounting of the container element.
   *
   * @param {HTMLDivElement} element - The container element.
   */
  function onContainerElementMount(element: HTMLDivElement) {
    containerRef = element;

    const resizeObserver = new ResizeObserver(() => {
      onWindowResized();
    });
    resizeObserver.observe(element);

    onCleanup(() => {
      resizeObserver.disconnect();
    });

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
      } catch {
        // Ignore disposal errors, DOM may already be cleaned up by SolidJS
      }
    }

    if (loader) loader = undefined;
    if (scene) scene = undefined;
    if (camera) camera = undefined;
    if (contentGroup) contentGroup = undefined;
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
    renderer.setClearColor(0, 0);

    // Scene
    scene = new Scene();

    // Camera
    // Use fixed vertical size, horizontal size depends on aspect ratio
    const aspect = width / height;
    const frustumSize = CAMERA_FRUSTUM_SIZE;

    camera = new OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.01,
      50000,
    );

    const target = props.cameraTarget || new Vector3(0, 0, 0);

    if (props.configureCamera) props.configureCamera(camera);
    else {
      // Standard isometric-ish view
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
    const { decoderPath } = props;
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

    // Set the render element - SolidJS will handle DOM attachment
    setRenderElement(canvas);
  }

  /** Loads the 3D model using GLTFLoader. */
  function loadModel() {
    loader?.load(
      props.modelPath,
      (gltf: GLTF) => {
        if (props.configureModel) props.configureModel(gltf);

        // Normalization Logic
        contentGroup = new Group();
        scene?.add(contentGroup);
        contentGroup.add(gltf.scene);

        // Ensure transforms are up to date before calculating bounding box
        gltf.scene.updateMatrixWorld(true);

        // Calculate bounding box
        const box = new Box3().setFromObject(gltf.scene);
        const size = new Vector3();
        box.getSize(size);
        const center = new Vector3();
        box.getCenter(center);

        // Center the model
        gltf.scene.position.sub(center);

        // Scale to fit target size
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = TARGET_SIZE / maxDim;

        // Apply base normalization scale
        contentGroup.scale.set(scale, scale, scale);

        // Apply optional prop scale on top
        if (props.modelScale) {
          contentGroup.scale.multiplyScalar(props.modelScale);
        }

        gltf.scene.receiveShadow = true;
        gltf.scene.castShadow = true;

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
    const aspect = width / height;
    const frustumSize = CAMERA_FRUSTUM_SIZE;

    // Update camera projection
    let halfWidth = (frustumSize * aspect) / 2;
    const halfHeight = frustumSize / 2;

    // Check for minimum horizontal scale
    if (props.minHorizontalScale) {
      const currentWidth = halfWidth * 2;
      if (currentWidth < props.minHorizontalScale) {
        // If viewport is too narrow, we need to zoom out (increase frustum size)
        // to maintain the minimum horizontal scale
        const requiredFrustumSize = props.minHorizontalScale / aspect;
        // We adjust the camera zoom to achieve this effect without changing the frustum calculation logic too much
        // Or simpler: just override the left/right planes
        halfWidth = props.minHorizontalScale / 2;
        // Note: This might distort aspect ratio if we don't adjust top/bottom too.
        // Correct approach for Orthographic camera to maintain aspect ratio but ensure min width:
        // If we increase width, we must increase height to keep aspect ratio,
        // OR we accept that we see more vertical content.
        // Let's stick to standard behavior:
        // If width < min, we set width = min. Height = width / aspect.

        // Actually, for orthographic camera:
        // left/right/top/bottom define the view volume.
        // If we want to ensure X width, we set left=-X/2, right=X/2.
        // To keep aspect ratio correct, top/bottom must be derived from this width and aspect ratio.
        // top = width / aspect / 2

        // BUT, we usually want fixed vertical height (CAMERA_FRUSTUM_SIZE).
        // So we have a conflict: Fixed Height vs Min Width.
        // Strategy: Use the larger of the two requirements.
        // 1. Height-based width: height * aspect
        // 2. Min width: props.minHorizontalScale

        const heightBasedWidth = frustumSize * aspect;

        if (heightBasedWidth < props.minHorizontalScale) {
          // We need to be wider.
          halfWidth = props.minHorizontalScale / 2;
          // To maintain aspect ratio, we must increase height too?
          // No, in Three.js OrthographicCamera, the projection matrix maps the defined box to the viewport.
          // If the box aspect ratio doesn't match the viewport aspect ratio, the image is stretched.
          // So we MUST ensure (right-left)/(top-bottom) == width/height (aspect).

          // So if we force width to be minHorizontalScale, we must set height to minHorizontalScale / aspect.
          const newHeight = props.minHorizontalScale / aspect;
          camera.top = newHeight / 2;
          camera.bottom = -newHeight / 2;
        } else {
          camera.top = halfHeight;
          camera.bottom = -halfHeight;
        }
      }
    } else {
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
    }

    camera.left = -halfWidth;
    camera.right = halfWidth;

    camera.updateProjectionMatrix();

    // Update renderer size with capped DPR
    renderer.setSize(width, height);

    // Force a render pass to ensure context is properly initialized
    if (scene && camera) {
      renderer.render(scene, camera);
    }
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
        const target = initialControlTarget || new Vector3(0, 0, 0);
        if (!initialCameraPosition) initialCameraPosition = camera.position.clone();

        // Simple orbit animation
        const radius = initialCameraPosition.length();
        // We want to rotate around Y axis

        // Re-calculate based on initial position relative to target
        // This is a bit complex to generalize, so let's keep the simple circular orbit for now
        // assuming standard isometric view

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
