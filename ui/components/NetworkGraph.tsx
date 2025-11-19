import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";

export type Node = {
  id: string;
  label: string;
  x?: number;
  y?: number;
  targetX?: number;
  targetY?: number;
  edges?: string[];
};

type Props = {
  nodes: Node[];
  renderNode?: (node: Node, context: CanvasRenderingContext2D) => void;
};

type State = {
  nodes: Node[];
  nodeDragging: { id: string; x: number; y: number } | null;
  isPanning: boolean;
  panOffset: { x: number; y: number };
  scale: number;
  lastPinchDistance: number | null;
};

const layoutSettings = {
  repulsionForce: 50,
  attractionForce: 0.1,
  distanceThreshold: 100,
  minAttractionDistance: 150,
  springForce: 0.005,
  initialAnimationSpeed: 25,
  minAnimationSpeed: 5,
  animationSpeedDecreaseRate: 0.1,
  animationSpeedDecreaseInterval: 10,
  visualizationOpacityFactor: 0.5,
  nodeRadius: 15,
  canvasScaleMin: 0.1,
  canvasScaleMax: 5,
  canvasScaleStep: 0.001,
};

/**
 * A component that renders a network graph with nodes and edges. The graph can be panned, zoomed, and nodes can be
 * dragged.
 *
 * @param props The component properties.
 * @param props.nodes The nodes to render in the graph.
 * @param props.renderNode An optional function to render custom nodes.
 * @returns The rendered component.
 */
export default function NetworkGraph(props: Props) {
  const [state, setState] = createSignal<State>({
    nodes: props.nodes,
    nodeDragging: null,
    isPanning: false,
    panOffset: { x: 0, y: 0 },
    scale: 0.9,
    lastPinchDistance: null,
  });

  const memoizedNodes = createMemo(() => state().nodes);

  let containerElement: HTMLDivElement | undefined;
  let canvasElement: HTMLCanvasElement | undefined;
  let canvasContext: CanvasRenderingContext2D | null = null;
  let animationSpeed = layoutSettings.initialAnimationSpeed;
  let animationFrameId: number | null = null;

  onMount(() => {
    initializeCanvas();
    beginAnimationSpeedThrottling();
    window.addEventListener("resize", resizeCanvas);
    observeContainerResize();
    centerNodesOnCanvas();
  });

  createEffect(() => {
    if (canvasElement) drawGraph();
  });

  onCleanup(() => {
    window.removeEventListener("resize", resizeCanvas);
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);

    canvasElement!.removeEventListener("mousemove", onMouseMove);
    canvasElement!.removeEventListener("touchmove", onTouchMove);
    canvasElement!.removeEventListener("touchstart", onTouchStart);
    canvasElement!.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("mouseup", onMouseUp);
    canvasElement!.removeEventListener("wheel", onWheel);

    if (resizeObserver) resizeObserver.disconnect();
  });

  function onCanvasMount(el: HTMLCanvasElement) {
    canvasElement = el;
    canvasContext = canvasElement.getContext("2d");
    resizeCanvas();

    canvasElement.addEventListener("mousemove", onMouseMove);
    canvasElement.addEventListener("touchmove", onTouchMove, { passive: false });
    canvasElement.addEventListener("touchstart", onTouchStart, { passive: false });
    canvasElement.addEventListener("touchend", onTouchEnd);
    window.addEventListener("mouseup", onMouseUp);
    canvasElement.addEventListener("wheel", onWheel);
  }

  function initializeCanvas() {
    resizeCanvas();
    startAnimationLoop();
  }

  function startAnimationLoop() {
    const animate = () => {
      drawGraph();
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
  }

  function beginAnimationSpeedThrottling() {
    const decreaseAnimationSpeed = setInterval(() => {
      if (animationSpeed > layoutSettings.minAnimationSpeed)
        animationSpeed -= layoutSettings.animationSpeedDecreaseRate;
      else clearInterval(decreaseAnimationSpeed);
    }, layoutSettings.animationSpeedDecreaseInterval);
  }

  let resizeObserver: ResizeObserver | undefined;
  function observeContainerResize() {
    resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (containerElement) resizeObserver.observe(containerElement);
  }

  function applyForces() {
    if (!canvasElement) return;

    const centerX = canvasElement.width / 2;
    const centerY = canvasElement.height / 2;
    if (!centerX && !centerY) return;

    positionNodes(centerX, centerY);
    applyRepulsionForces();
    applyAttractionForces();
    applySpringForces();
  }

  function positionNodes(centerX: number, centerY: number) {
    const positionedNodes = new Set<string>();

    const orderNodes = (node: Node, length: number, index: number, radius: number) => {
      if (node.x && node.y) return;

      // Position the node in a circle around the center
      const angle = (index / length) * 2 * Math.PI; // Distribute nodes evenly around the circle
      let x = centerX + radius * Math.cos(angle);
      let y = centerY + radius * Math.sin(angle);

      // Check all directions for an empty spot
      let foundEmptySpot = false;
      for (let i = 0; i < 360; i += 10) {
        // Check every 10 degrees
        const testAngle = (i / 360) * 2 * Math.PI;
        const testX = centerX + radius * Math.cos(testAngle);
        const testY = centerY + radius * Math.sin(testAngle);

        // Euclidean distance between nodes
        if (!memoizedNodes().some((n) => Math.hypot(n.x! - testX, n.y! - testY) < 50)) {
          x = testX;
          y = testY;
          foundEmptySpot = true;
          break;
        }
      }

      // If no completely empty spot is found, use the existing logic to find a spot with some distance
      if (!foundEmptySpot) {
        while (memoizedNodes().some((n) => Math.hypot(n.x! - x, n.y! - y) < 50)) {
          radius += 10;
          x = centerX + radius * Math.cos(angle);
          y = centerY + radius * Math.sin(angle);
        }
      }

      node.x = x;
      node.y = y;
      positionedNodes.add(node.id);

      const connectedNodes = memoizedNodes().filter((n) => n.edges && n.edges.includes(node.id));
      connectedNodes.forEach((connectedNode, connectedIndex) =>
        orderNodes(connectedNode, connectedNodes.length, connectedIndex, radius),
      );
    };

    const nodesWithoutEdges = memoizedNodes().filter((n) => !n.edges || n.edges.length === 0);
    nodesWithoutEdges.forEach((node, index) => orderNodes(node, nodesWithoutEdges.length, index, 200));
  }

  function applyRepulsionForces() {
    const { repulsionForce, distanceThreshold, visualizationOpacityFactor } = layoutSettings;

    memoizedNodes().forEach((nodeA, indexA) => {
      memoizedNodes().forEach((nodeB, indexB) => {
        if (indexA === indexB) return;
        if (nodeA.x === undefined || nodeA.y === undefined || nodeB.x === undefined || nodeB.y === undefined) return;

        // Calculate the distance between nodes
        const distanceX = nodeA.x - nodeB.x;
        const distanceY = nodeA.y - nodeB.y;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        if (distance < distanceThreshold) {
          // Calculate the repulsion force
          const force = repulsionForce / (distance * distance);
          const angle = Math.atan2(distanceY, distanceX);

          // Apply the repulsion force to both nodes
          const visualizationOpacity = visualizationOpacityFactor * animationSpeed;
          nodeA.x += force * Math.cos(angle) * visualizationOpacity;
          nodeA.y += force * Math.sin(angle) * visualizationOpacity;
          nodeB.x -= force * Math.cos(angle) * visualizationOpacity;
          nodeB.y -= force * Math.sin(angle) * visualizationOpacity;
        }
      });
    });
  }

  function applyAttractionForces() {
    const { attractionForce, minAttractionDistance } = layoutSettings;

    memoizedNodes().forEach((node) => {
      if (!node.edges) return;
      node.edges.forEach((edgeTargetNodeId) => {
        const targetNode = memoizedNodes().find((n) => n.id === edgeTargetNodeId);
        if (
          !targetNode ||
          targetNode.x === undefined ||
          targetNode.y === undefined ||
          node.x === undefined ||
          node.y === undefined
        )
          return;

        const distanceX = targetNode.x - node.x;
        const distanceY = targetNode.y - node.y;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        if (distance > minAttractionDistance) {
          const force = attractionForce * (distance - minAttractionDistance);
          const angle = Math.atan2(distanceY, distanceX);

          node.x += force * Math.cos(angle);
          node.y += force * Math.sin(angle);
          targetNode.x -= force * Math.cos(angle);
          targetNode.y -= force * Math.sin(angle);
        }
      });
    });
  }

  function applySpringForces() {
    const { springForce } = layoutSettings;

    memoizedNodes().forEach((node) => {
      if (node.targetX === undefined || node.targetY === undefined) return;
      if (node.x === undefined || node.y === undefined) return;

      // Move the node towards its target position
      node.x += (node.targetX - node.x) * springForce;
      node.y += (node.targetY - node.y) * springForce;
    });
  }

  function drawGraph() {
    if (!canvasContext) return;
    if (!props.nodes) return;

    // Clear the entire canvas with pixel ratio consideration
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvasContext.clearRect(0, 0, canvasElement!.width, canvasElement!.height);

    applyForces();

    canvasContext.save();

    // Set up proper clipping that accounts for device pixel ratio first
    const canvasWidth = canvasElement!.width / devicePixelRatio;
    const canvasHeight = canvasElement!.height / devicePixelRatio;

    // Scale for device pixel ratio
    canvasContext.scale(devicePixelRatio, devicePixelRatio);

    // Set clipping in CSS pixel coordinates
    canvasContext.beginPath();
    canvasContext.rect(0, 0, canvasWidth, canvasHeight);
    canvasContext.clip();

    // Scale for zoom level (applies on top of device pixel ratio scaling)
    canvasContext.scale(state().scale, state().scale);

    drawEdges();
    drawNodes();

    canvasContext.restore();
  }

  function drawEdges() {
    if (!canvasContext) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasWidth = canvasElement!.width / devicePixelRatio;
    const canvasHeight = canvasElement!.height / devicePixelRatio;
    const scale = state().scale;

    // Define viewport bounds in world coordinates (accounting for zoom)
    const padding = 50 / scale; // Add padding relative to the scaled viewport
    const viewportBounds = {
      left: -padding,
      top: -padding,
      right: canvasWidth / scale + padding,
      bottom: canvasHeight / scale + padding,
    };

    memoizedNodes().forEach((node) => {
      if (!node.edges) return;

      node.edges.forEach((edgeTargetNodeId) => {
        const sourceNode = memoizedNodes().find((n) => n.id === node.id);
        const targetNode = memoizedNodes().find((n) => n.id === edgeTargetNodeId);
        if (!sourceNode || !targetNode) return;
        if (
          sourceNode.x === undefined ||
          sourceNode.y === undefined ||
          targetNode.x === undefined ||
          targetNode.y === undefined
        )
          return;

        // Check if edge intersects viewport bounds for performance culling
        const edgeIntersectsViewport =
          (sourceNode.x >= viewportBounds.left &&
            sourceNode.x <= viewportBounds.right &&
            sourceNode.y >= viewportBounds.top &&
            sourceNode.y <= viewportBounds.bottom) ||
          (targetNode.x >= viewportBounds.left &&
            targetNode.x <= viewportBounds.right &&
            targetNode.y >= viewportBounds.top &&
            targetNode.y <= viewportBounds.bottom) ||
          // Line-rectangle intersection check for edges that pass through viewport
          lineIntersectsRect(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y, viewportBounds);

        if (!edgeIntersectsViewport) return;

        const ctx = canvasContext!;
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        if (state().nodeDragging?.id === node.id || state().nodeDragging?.id === edgeTargetNodeId)
          ctx.strokeStyle = "yellow";
        else ctx.strokeStyle = "gray";
        ctx.lineWidth = 1;
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
      });
    });
  }

  // Helper function to check if a line segment intersects a rectangle
  function lineIntersectsRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rect: { left: number; top: number; right: number; bottom: number },
  ): boolean {
    // Check if either endpoint is inside the rectangle
    if (
      (x1 >= rect.left && x1 <= rect.right && y1 >= rect.top && y1 <= rect.bottom) ||
      (x2 >= rect.left && x2 <= rect.right && y2 >= rect.top && y2 <= rect.bottom)
    ) {
      return true;
    }

    // Check if line segment intersects any of the rectangle's edges
    return (
      lineIntersectsLine(x1, y1, x2, y2, rect.left, rect.top, rect.right, rect.top) || // Top
      lineIntersectsLine(x1, y1, x2, y2, rect.right, rect.top, rect.right, rect.bottom) || // Right
      lineIntersectsLine(x1, y1, x2, y2, rect.right, rect.bottom, rect.left, rect.bottom) || // Bottom
      lineIntersectsLine(x1, y1, x2, y2, rect.left, rect.bottom, rect.left, rect.top)
    ); // Left
  }

  // Helper function to check if two line segments intersect
  function lineIntersectsLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): boolean {
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denominator === 0) return false; // Lines are parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  function drawNodes() {
    if (!canvasContext) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasWidth = canvasElement!.width / devicePixelRatio;
    const canvasHeight = canvasElement!.height / devicePixelRatio;
    const scale = state().scale;

    // Define viewport bounds in world coordinates (accounting for zoom)
    const padding = (layoutSettings.nodeRadius + 30) / scale; // Account for node radius and text
    const viewportBounds = {
      left: -padding,
      top: -padding,
      right: canvasWidth / scale + padding,
      bottom: canvasHeight / scale + padding,
    };

    memoizedNodes().forEach((node) => {
      if (node.x === undefined || node.y === undefined) return;

      // Skip nodes that are completely outside the viewport
      if (
        node.x < viewportBounds.left ||
        node.x > viewportBounds.right ||
        node.y < viewportBounds.top ||
        node.y > viewportBounds.bottom
      ) {
        return;
      }

      if (props.renderNode) return props.renderNode(node, canvasContext!);

      const ctx = canvasContext!;
      ctx.beginPath();
      ctx.fillStyle = "black";
      ctx.arc(node.x, node.y, layoutSettings.nodeRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillText(node.label, node.x - 15, node.y + 30);
    });
  }

  function resizeCanvas() {
    if (!canvasElement) return;

    // Get the device pixel ratio and the parent element dimensions
    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = canvasElement.parentElement!.clientWidth;
    const displayHeight = canvasElement.parentElement!.clientHeight;

    // Set the canvas size in CSS pixels (for layout)
    canvasElement.style.width = `${displayWidth}px`;
    canvasElement.style.height = `${displayHeight}px`;

    // Set the canvas internal dimensions accounting for pixel ratio
    canvasElement.width = Math.floor(displayWidth * devicePixelRatio);
    canvasElement.height = Math.floor(displayHeight * devicePixelRatio);

    // Note: Device pixel ratio scaling is now handled in drawGraph() to ensure proper clipping

    drawGraph();
  }

  function onMouseDown(event: MouseEvent, node?: Node) {
    const scale = state().scale;
    if (node) handleNodeDraggingOnMouseDown(node, event, scale);
    else handleCanvasPanningOnMouseDown(event);
  }

  function handleNodeDraggingOnMouseDown(node: Node, event: MouseEvent, scale: number) {
    setState((prevState) => ({
      ...prevState,
      nodeDragging: { id: node.id, x: event.clientX / scale, y: event.clientY / scale },
    }));
  }

  function handleCanvasPanningOnMouseDown(event: MouseEvent) {
    setState((prevState) => ({
      ...prevState,
      isPanning: true,
      panOffset: { x: event.clientX, y: event.clientY },
    }));
  }

  function onMouseMove(event: MouseEvent) {
    const scale = state().scale;
    if (state().nodeDragging?.id) handleDraggingOnMouseMove(event, scale);
    else if (state().isPanning) handleCanvasPanningOnMouseMove(event, scale);
  }

  function handleDraggingOnMouseMove(event: MouseEvent, scale: number) {
    const rect = canvasElement!.getBoundingClientRect();
    const newX = (event.clientX - rect.left) / scale;
    const newY = (event.clientY - rect.top) / scale;

    setState((prevState) => ({
      ...prevState,
      nodes: memoizedNodes().map((node) =>
        node.id === state().nodeDragging!.id ? { ...node, x: newX, y: newY } : node,
      ),
      nodeDragging: { ...state().nodeDragging!, x: newX, y: newY },
    }));
    drawGraph();
  }

  function handleCanvasPanningOnMouseMove(event: MouseEvent, scale: number) {
    const distanceX = event.clientX - state().panOffset.x;
    const distanceY = event.clientY - state().panOffset.y;

    setState((prevState) => ({
      ...prevState,
      nodes: memoizedNodes().map((node) => ({
        ...node,
        x: node.x! + distanceX / scale,
        y: node.y! + distanceY / scale,
      })),
      panOffset: { x: event.clientX, y: event.clientY },
    }));
    drawGraph();
  }

  function onMouseUp() {
    // Stop dragging nodes or panning
    setState({ ...state(), nodeDragging: null, isPanning: false });
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    const scaleAmount = -event.deltaY * layoutSettings.canvasScaleStep;
    setState((prevState) => ({
      ...prevState,
      scale: Math.min(
        Math.max(prevState.scale + scaleAmount, layoutSettings.canvasScaleMin),
        layoutSettings.canvasScaleMax,
      ),
    }));
    drawGraph();
  }

  function onTouchStart(event: TouchEvent) {
    event.preventDefault();
    if (event.touches.length === 2) {
      // Initialize pinch-to-zoom
      const distance = getPinchDistance(event.touches);
      setState((prev) => ({ ...prev, lastPinchDistance: distance }));
      return;
    }

    const touch = event.touches[0];
    const scale = state().scale;
    const rect = canvasElement!.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / scale;
    const y = (touch.clientY - rect.top) / scale;
    const node = memoizedNodes().find((node) => Math.hypot(node.x! - x, node.y! - y) < layoutSettings.nodeRadius);

    if (node) {
      setState((prevState) => ({
        ...prevState,
        nodeDragging: { id: node.id, x: touch.clientX / scale, y: touch.clientY / scale },
      }));
    } else {
      setState((prevState) => ({
        ...prevState,
        isPanning: true,
        panOffset: { x: touch.clientX, y: touch.clientY },
      }));
    }
  }

  function onTouchMove(event: TouchEvent) {
    event.preventDefault();
    if (event.touches.length === 2) {
      handlePinchZoom(event);
      return;
    }

    const touch = event.touches[0];
    const scale = state().scale;

    if (state().nodeDragging?.id) {
      const rect = canvasElement!.getBoundingClientRect();
      const newX = (touch.clientX - rect.left) / scale;
      const newY = (touch.clientY - rect.top) / scale;

      setState((prevState) => ({
        ...prevState,
        nodes: memoizedNodes().map((node) =>
          node.id === state().nodeDragging!.id ? { ...node, x: newX, y: newY } : node,
        ),
        nodeDragging: { ...state().nodeDragging!, x: newX, y: newY },
      }));
    } else if (state().isPanning) {
      const distanceX = touch.clientX - state().panOffset.x;
      const distanceY = touch.clientY - state().panOffset.y;

      setState((prevState) => ({
        ...prevState,
        nodes: memoizedNodes().map((node) => ({
          ...node,
          x: node.x! + distanceX / scale,
          y: node.y! + distanceY / scale,
        })),
        panOffset: { x: touch.clientX, y: touch.clientY },
      }));
    }
    drawGraph();
  }

  function handlePinchZoom(event: TouchEvent) {
    const currentDistance = getPinchDistance(event.touches);
    const lastDistance = state().lastPinchDistance;

    if (lastDistance !== null) {
      const delta = currentDistance - lastDistance;
      const scaleChange = delta * layoutSettings.canvasScaleStep * 0.5;

      setState((prevState) => ({
        ...prevState,
        scale: Math.min(
          Math.max(prevState.scale + scaleChange, layoutSettings.canvasScaleMin),
          layoutSettings.canvasScaleMax,
        ),
        lastPinchDistance: currentDistance,
      }));

      drawGraph();
    }
  }

  function getPinchDistance(touches: TouchList) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onTouchEnd() {
    setState((prevState) => ({
      ...prevState,
      nodeDragging: null,
      isPanning: false,
      lastPinchDistance: null,
    }));
  }

  function centerNodesOnCanvas() {
    if (!canvasElement) return;

    // Calculate the bounds of all nodes
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const nodes = memoizedNodes();
    if (nodes.length === 0) return;

    // Find the bounds of all positioned nodes
    const positionedNodes = nodes.filter((node) => node.x !== undefined && node.y !== undefined);
    if (positionedNodes.length === 0) return;

    positionedNodes.forEach((node) => {
      if (node.x! < minX) minX = node.x!;
      if (node.y! < minY) minY = node.y!;
      if (node.x! > maxX) maxX = node.x!;
      if (node.y! > maxY) maxY = node.y!;
    });

    // Calculate center of the node group
    const nodesCenterX = (minX + maxX) / 2;
    const nodesCenterY = (minY + maxY) / 2;

    // Get canvas center (accounting for device pixel ratio)
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvasCenterX = canvasElement.width / devicePixelRatio / 2;
    const canvasCenterY = canvasElement.height / devicePixelRatio / 2;

    // Calculate the offset needed to center nodes
    const offsetX = canvasCenterX - nodesCenterX;
    const offsetY = canvasCenterY - nodesCenterY;

    // Apply the offset to all nodes
    setState((prevState) => ({
      ...prevState,
      nodes: nodes.map((node) => ({
        ...node,
        x: node.x !== undefined ? node.x + offsetX : node.x,
        y: node.y !== undefined ? node.y + offsetY : node.y,
      })),
    }));

    drawGraph();
  }

  return (
    <div ref={containerElement} class="relative size-full">
      <canvas
        ref={onCanvasMount}
        class="block size-full"
        onMouseDown={(event) => {
          const scale = state().scale;
          const rect = canvasElement!.getBoundingClientRect();
          const x = (event.clientX - rect.left) / scale;
          const y = (event.clientY - rect.top) / scale;
          const node = memoizedNodes().find((node) => Math.hypot(node.x! - x, node.y! - y) < layoutSettings.nodeRadius);
          onMouseDown(event, node);
        }}
      />
    </div>
  );
}
