import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { HeroPoster } from './HeroPoster';

/**
 * RealisticCharger3D
 * Procedural WebGL 3D Model of the ChargeShare India Smart Wallbox & 16A Heavy-Duty Connector.
 * Controlled seamlessly via the `progress` prop (0.0 to 1.0) for GSAP ScrollTrigger scrollytelling.
 * Features a zero-flash static vector poster on first paint with a smooth 300ms cross-fade to WebGL.
 */
export function RealisticCharger3D({ progress = 0, className = '' }) {
  const mountRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [canvasLoaded, setCanvasLoaded] = useState(false);
  const sceneElementsRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check for prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setWebglSupported(false);
      return;
    }

    // Check WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // SCENE
    const scene = new THREE.Scene();

    // CAMERA
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 8.2);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // STUDIO 3-POINT LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf0fdf4, 1.1);
    fillLight.position.set(-5, 2, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 1.6);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    // MATERIALS
    const housingMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
    });

    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.35,
      metalness: 0.25,
    });

    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.88,
      roughness: 0.22,
    });

    const circuitBoardMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      metalness: 0.2,
      roughness: 0.45,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.92,
      roughness: 0.15,
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.08,
    });

    const ledRingMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    // Contact shadow beneath wallbox
    const shadowGeo = new THREE.PlaneGeometry(3.2, 1.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.12,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, -2.1, -0.2);
    contactShadow.visible = false;
    scene.add(contactShadow);

    // MAIN GROUP: WALLBOX (Initialized hidden and offscreen to avoid peeking under navbar)
    const wallboxGroup = new THREE.Group();
    wallboxGroup.visible = false;
    wallboxGroup.position.set(0, 15, -4);
    scene.add(wallboxGroup);

    // 1. Backplate / Mounting chassis
    const backplateGeo = new THREE.BoxGeometry(2.3, 3.4, 0.35);
    const backplateMesh = new THREE.Mesh(backplateGeo, bezelMat);
    backplateMesh.position.z = -0.25;
    wallboxGroup.add(backplateMesh);

    // 2. Main Wallbox Body (Housing)
    const bodyGeo = new THREE.BoxGeometry(2.1, 3.2, 0.6);
    const bodyMesh = new THREE.Mesh(bodyGeo, housingMat);
    wallboxGroup.add(bodyMesh);

    // 3. Front Detachable Cover Plate
    const frontCoverGroup = new THREE.Group();
    const frontCoverGeo = new THREE.BoxGeometry(2.0, 3.1, 0.15);
    const frontCoverMesh = new THREE.Mesh(frontCoverGeo, housingMat);
    frontCoverGroup.add(frontCoverMesh);

    // LED Status Ring on front cover
    const ringGeo = new THREE.TorusGeometry(0.48, 0.05, 16, 48);
    const ringMesh = new THREE.Mesh(ringGeo, ledRingMat);
    ringMesh.position.set(0, 0.45, 0.09);
    frontCoverGroup.add(ringMesh);

    // Inner housing inset matching body material (replaces dark artifact)
    const ringInnerGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.02, 32);
    ringInnerGeo.rotateX(Math.PI / 2);
    const ringInnerMesh = new THREE.Mesh(ringInnerGeo, housingMat);
    ringInnerMesh.position.set(0, 0.45, 0.08);
    frontCoverGroup.add(ringInnerMesh);

    // 16A 3-pin socket ports on lower front
    const socketHousingGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 32);
    socketHousingGeo.rotateX(Math.PI / 2);
    const socketHousing = new THREE.Mesh(socketHousingGeo, rubberMat);
    socketHousing.position.set(0, -0.65, 0.08);
    frontCoverGroup.add(socketHousing);

    // 3 Socket pin holes
    const pinHoleGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 16);
    pinHoleGeo.rotateX(Math.PI / 2);
    const pinHoleMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    const earthPinHole = new THREE.Mesh(pinHoleGeo, pinHoleMat);
    earthPinHole.scale.set(1.2, 1, 1.2);
    earthPinHole.position.set(0, -0.52, 0.1);
    frontCoverGroup.add(earthPinHole);

    const livePinHole = new THREE.Mesh(pinHoleGeo, pinHoleMat);
    livePinHole.position.set(-0.16, -0.72, 0.1);
    frontCoverGroup.add(livePinHole);

    const neutralPinHole = new THREE.Mesh(pinHoleGeo, pinHoleMat);
    neutralPinHole.position.set(0.16, -0.72, 0.1);
    frontCoverGroup.add(neutralPinHole);

    frontCoverGroup.position.set(0, 0, 0.35);
    wallboxGroup.add(frontCoverGroup);

    // 4. Internal Circuitry
    const internalCircuitGroup = new THREE.Group();
    const pcbGeo = new THREE.BoxGeometry(1.8, 2.8, 0.05);
    const pcbMesh = new THREE.Mesh(pcbGeo, circuitBoardMat);
    internalCircuitGroup.add(pcbMesh);

    const busGeo = new THREE.BoxGeometry(1.4, 0.15, 0.06);
    const busMesh = new THREE.Mesh(busGeo, copperMat);
    busMesh.position.set(0, -0.9, 0.04);
    internalCircuitGroup.add(busMesh);

    const mcbGeo = new THREE.BoxGeometry(0.4, 0.7, 0.22);
    const mcbMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const mcb1 = new THREE.Mesh(mcbGeo, mcbMat);
    mcb1.position.set(-0.4, 0.5, 0.12);
    const mcb2 = new THREE.Mesh(mcbGeo, mcbMat);
    mcb2.position.set(0.2, 0.5, 0.12);
    internalCircuitGroup.add(mcb1);
    internalCircuitGroup.add(mcb2);

    internalCircuitGroup.position.set(0, 0, 0.05);
    wallboxGroup.add(internalCircuitGroup);

    // CONNECTOR & CABLE GROUP (Scene 1 focus)
    const connectorGroup = new THREE.Group();
    scene.add(connectorGroup);

    const plugBodyGeo = new THREE.CylinderGeometry(0.35, 0.38, 1.2, 32);
    const plugBody = new THREE.Mesh(plugBodyGeo, rubberMat);
    plugBody.rotation.x = Math.PI / 2;
    connectorGroup.add(plugBody);

    const gripRingGeo = new THREE.TorusGeometry(0.39, 0.04, 16, 32);
    const gripRing = new THREE.Mesh(gripRingGeo, bezelMat);
    gripRing.position.z = -0.15;
    connectorGroup.add(gripRing);

    const earthPinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 16);
    earthPinGeo.rotateX(Math.PI / 2);
    const earthPin = new THREE.Mesh(earthPinGeo, brassMat);
    earthPin.position.set(0, 0.22, 0.85);
    connectorGroup.add(earthPin);

    const pinGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.55, 16);
    pinGeo.rotateX(Math.PI / 2);
    const livePin = new THREE.Mesh(pinGeo, brassMat);
    livePin.position.set(-0.2, -0.1, 0.82);
    connectorGroup.add(livePin);

    const neutralPin = new THREE.Mesh(pinGeo, brassMat);
    neutralPin.position.set(0.2, -0.1, 0.82);
    connectorGroup.add(neutralPin);

    // Cable curve extending into depth
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -0.6),
      new THREE.Vector3(-0.35, -0.5, -1.4),
      new THREE.Vector3(-0.45, -1.2, -2.4),
      new THREE.Vector3(-0.2, -1.8, -3.4),
      new THREE.Vector3(0.3, -2.2, -4.2),
    ]);
    const cableGeo = new THREE.TubeGeometry(curve, 36, 0.11, 12, false);
    const cableMesh = new THREE.Mesh(cableGeo, rubberMat);
    connectorGroup.add(cableMesh);

    const endCapGeo = new THREE.SphereGeometry(0.11, 12, 12);
    const endCap = new THREE.Mesh(endCapGeo, rubberMat);
    endCap.position.set(0.3, -2.2, -4.2);
    connectorGroup.add(endCap);

    // Set initial transform for Scene 1 immediately before first render
    connectorGroup.position.set(1.6, -0.65, 2.7);
    connectorGroup.rotation.set(0.25, -0.45, 0.15);
    connectorGroup.scale.set(1.35, 1.35, 1.35);

    sceneElementsRef.current = {
      scene,
      camera,
      renderer,
      wallboxGroup,
      frontCoverGroup,
      internalCircuitGroup,
      ringMesh,
      connectorGroup,
      contactShadow,
      clock: new THREE.Clock(),
      isActive: true,
      hasRenderedFirstFrame: false,
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (sceneElementsRef.current) {
          sceneElementsRef.current.isActive = entry.isIntersecting;
        }
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    // ANIMATION LOOP
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (sceneElementsRef.current && sceneElementsRef.current.isActive) {
        const { ringMesh, clock, hasRenderedFirstFrame } = sceneElementsRef.current;
        const elapsedTime = clock.getElapsedTime();

        if (ringMesh && ringMesh.material) {
          const pulse = (Math.sin(elapsedTime * 3.2) + 1) * 0.5;
          ringMesh.material.emissiveIntensity = 1.0 + pulse * 1.4;
        }

        renderer.render(scene, camera);

        // Notify that WebGL has rendered its first frame for zero-flash cross-fade
        if (!hasRenderedFirstFrame) {
          sceneElementsRef.current.hasRenderedFirstFrame = true;
          setCanvasLoaded(true);
        }
      }
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      cancelAnimationFrame(animationFrameId);

      [
        backplateGeo,
        bodyGeo,
        frontCoverGeo,
        ringGeo,
        ringInnerGeo,
        socketHousingGeo,
        pinHoleGeo,
        pcbGeo,
        busGeo,
        mcbGeo,
        plugBodyGeo,
        gripRingGeo,
        earthPinGeo,
        pinGeo,
        cableGeo,
        endCapGeo,
        shadowGeo,
      ].forEach((g) => g.dispose());

      [
        housingMat,
        bezelMat,
        copperMat,
        circuitBoardMat,
        brassMat,
        rubberMat,
        ledRingMat,
        pinHoleMat,
        mcbMat,
        shadowMat,
      ].forEach((m) => m.dispose());

      if (renderer) {
        renderer.dispose();
      }
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
    };
  }, []);

  // UPDATE MODEL TRANSFORMS BASED ON PROGRESS (0 to 1)
  useEffect(() => {
    if (!sceneElementsRef.current) return;
    const { wallboxGroup, frontCoverGroup, connectorGroup, contactShadow } =
      sceneElementsRef.current;

    const p = Math.max(0, Math.min(1, progress));

    // SCENE 1 (0.00 to 0.12): Connector sweeping across diagonally, NOT overlapping typography
    if (p < 0.12) {
      const localP = p / 0.12; // 0 to 1
      connectorGroup.visible = true;
      connectorGroup.position.set(
        1.6 - localP * 1.8,
        -0.65 + localP * 0.25,
        2.7 - localP * 0.2
      );
      connectorGroup.rotation.set(0.25, -0.45 + localP * 0.35, 0.15);
      connectorGroup.scale.set(1.35, 1.35, 1.35);

      // Wallbox stays completely hidden during Scene 1 (eliminating navbar peeking)
      wallboxGroup.visible = false;
      wallboxGroup.position.set(0, 15, -4);
      if (contactShadow) {
        contactShadow.visible = false;
      }
    }
    // SCENE 2 (0.12 to 0.32): Product Drop & 30-degree rotation, cover detaches
    else if (p < 0.32) {
      const localP = (p - 0.12) / 0.20; // 0 to 1
      connectorGroup.visible = true;
      connectorGroup.position.x = -0.5 - localP * 4.5;
      connectorGroup.position.z = 2.4 - localP * 2.0;

      // Wallbox descends into center, rotates ~30° (0.52 rad)
      wallboxGroup.visible = true;
      wallboxGroup.position.set(0, (1 - localP) * 3.5, -3.5 + localP * 3.5);
      wallboxGroup.rotation.set(localP * 0.08, -localP * 0.52, 0);
      wallboxGroup.scale.set(
        0.65 + localP * 0.35,
        0.65 + localP * 0.35,
        0.65 + localP * 0.35
      );

      frontCoverGroup.position.z = 0.35 + localP * 0.85;
      frontCoverGroup.rotation.y = localP * 0.12;

      if (contactShadow) {
        contactShadow.visible = true;
        contactShadow.scale.set(
          0.65 + localP * 0.35,
          0.65 + localP * 0.35,
          0.65 + localP * 0.35
        );
        contactShadow.material.opacity = 0.1 + localP * 0.05;
      }
    }
    // SCENE 3 (0.32 to 0.50): Product Settle, cover closes, wallbox moves to right column
    else if (p < 0.50) {
      const localP = (p - 0.32) / 0.18; // 0 to 1
      connectorGroup.visible = false;

      frontCoverGroup.position.z = 1.2 - localP * 0.85;
      frontCoverGroup.rotation.y = (1 - localP) * 0.12;

      wallboxGroup.visible = true;
      // Shift rightwards on desktop so it does not overlap left text card
      wallboxGroup.position.set(localP * 1.45, 0, 0);
      wallboxGroup.rotation.set((1 - localP) * 0.08, -(1 - localP) * 0.52, 0);
      wallboxGroup.scale.set(0.95, 0.95, 0.95);

      if (contactShadow) {
        contactShadow.visible = true;
        contactShadow.position.x = localP * 1.45;
        contactShadow.scale.set(0.95, 0.95, 0.95);
        contactShadow.material.opacity = 0.15;
      }
    }
    // SCENE 4 (0.50 to 0.72): Floating callouts orbit, subtle tilt in center
    else if (p < 0.72) {
      const localP = (p - 0.50) / 0.22; // 0 to 1
      connectorGroup.visible = false;
      frontCoverGroup.position.z = 0.35;
      frontCoverGroup.rotation.y = 0;

      wallboxGroup.visible = true;
      wallboxGroup.position.set((1 - localP) * 1.45, Math.sin(localP * Math.PI) * 0.12, 0);
      wallboxGroup.rotation.set(
        0.06 * Math.sin(localP * Math.PI),
        -0.18 * Math.sin(localP * Math.PI),
        0
      );
      wallboxGroup.scale.set(1.02, 1.02, 1.02);

      if (contactShadow) {
        contactShadow.visible = true;
        contactShadow.position.x = (1 - localP) * 1.45;
        contactShadow.scale.set(1.02, 1.02, 1.02);
        contactShadow.material.opacity = 0.14;
      }
    }
    // SCENE 5 (0.72 to 1.00): Transform into App / Badge - wallbox scales down into right circle and holds
    else {
      const localP = Math.min(1, (p - 0.72) / 0.22); // 0 to 1, settles by 0.94 and holds
      connectorGroup.visible = false;
      frontCoverGroup.position.z = 0.35;
      frontCoverGroup.rotation.y = 0;

      wallboxGroup.visible = true;
      wallboxGroup.position.set(1.85, -0.1, 0);
      wallboxGroup.rotation.set(0.04, -localP * 0.35, 0);
      wallboxGroup.scale.set(
        1.02 - localP * 0.3,
        1.02 - localP * 0.3,
        1.02 - localP * 0.3
      );

      if (contactShadow) {
        contactShadow.visible = true;
        contactShadow.position.x = 1.85;
        contactShadow.scale.set(
          1.02 - localP * 0.3,
          1.02 - localP * 0.3,
          1.02 - localP * 0.3
        );
        contactShadow.material.opacity = 0.14 * (1 - localP * 0.5);
      }
    }
  }, [progress]);

  if (!webglSupported) {
    // Accessible fallback poster for devices without WebGL or with prefers-reduced-motion
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <HeroPoster className="opacity-100" />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full pointer-events-none overflow-visible ${className}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Static vector poster rendered on paint 0 */}
      <HeroPoster className={canvasLoaded ? 'opacity-0' : 'opacity-100'} />

      {/* WebGL canvas cross-fades in smoothly over 300ms once the first frame renders */}
      <div
        ref={mountRef}
        className={`w-full h-full pointer-events-none overflow-visible transition-opacity duration-300 ${
          canvasLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ touchAction: 'pan-y' }}
        aria-hidden="true"
      />
    </div>
  );
}
