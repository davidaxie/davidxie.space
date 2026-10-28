import * as THREE from 'three';
import { cameraKeyframes } from './constants';

// Build spline from keyframes
const positionPoints = cameraKeyframes.map(
  ([, pos]) => new THREE.Vector3(...pos)
);
const lookAtPoints = cameraKeyframes.map(
  ([, , look]) => new THREE.Vector3(...look)
);
const scrollValues = cameraKeyframes.map(([t]) => t);

const positionSpline = new THREE.CatmullRomCurve3(positionPoints, false, 'centripetal', 0.5);
const lookAtSpline = new THREE.CatmullRomCurve3(lookAtPoints, false, 'centripetal', 0.5);

// Map scroll progress (0–1) to spline parameter (0–1)
function scrollToSplineT(scroll: number): number {
  // Find which segment we're in
  for (let i = 0; i < scrollValues.length - 1; i++) {
    const start = scrollValues[i];
    const end = scrollValues[i + 1];
    if (scroll >= start && scroll <= end) {
      const segmentT = (scroll - start) / (end - start);
      const splineStart = i / (scrollValues.length - 1);
      const splineEnd = (i + 1) / (scrollValues.length - 1);
      return splineStart + segmentT * (splineEnd - splineStart);
    }
  }
  return scroll >= 1 ? 1 : 0;
}

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();

export function getCameraState(scrollProgress: number): {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
} {
  const t = scrollToSplineT(Math.max(0, Math.min(1, scrollProgress)));
  positionSpline.getPoint(t, _pos);
  lookAtSpline.getPoint(t, _look);
  return { position: _pos.clone(), lookAt: _look.clone() };
}
