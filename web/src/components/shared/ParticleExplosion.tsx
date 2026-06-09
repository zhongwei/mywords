import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles({
  active,
  color,
  onDone,
}: {
  active: boolean;
  color: string;
  onDone: () => void;
}) {
  const points = useRef<THREE.Points>(null);
  const count = 80;
  const lifetime = useRef(0);

  const velocities = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 + 1,
        vz: (Math.random() - 0.5) * 4,
      })),
    []
  );

  const positions = useMemo(() => new Float32Array(count * 3), []);
  const scales = useMemo(() => new Float32Array(count), []);

  useFrame((_, delta) => {
    if (!points.current || !active) return;
    lifetime.current += delta;
    const posAttr = points.current.geometry.attributes
      .position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i].vx * delta;
      positions[i * 3 + 1] += velocities[i].vy * delta;
      positions[i * 3 + 2] += velocities[i].vz * delta;
      velocities[i].vy -= 3 * delta;
      scales[i] = Math.max(0, 1 - lifetime.current * 1.5);
    }
    posAttr.array = positions;
    posAttr.needsUpdate = true;
    points.current.geometry.setAttribute(
      "aScale",
      new THREE.BufferAttribute(scales, 1)
    );

    if (lifetime.current > 1.2) {
      onDone();
    }
  });

  useEffect(() => {
    if (active) {
      lifetime.current = 0;
      positions.fill(0);
    }
  }, [active, positions]);

  if (!active) return null;

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.08}
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  );
}

interface ParticleExplosionProps {
  trigger: boolean;
  success?: boolean;
  onDone?: () => void;
}

export default function ParticleExplosion({
  trigger,
  success = true,
  onDone,
}: ParticleExplosionProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger) setActive(true);
  }, [trigger]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <Particles
          active={active}
          color={success ? "#22c55e" : "#ef4444"}
          onDone={() => {
            setActive(false);
            onDone?.();
          }}
        />
      </Canvas>
    </div>
  );
}
