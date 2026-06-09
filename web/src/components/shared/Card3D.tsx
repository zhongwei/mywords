import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

interface CardSceneProps {
  front: string;
  back: string;
  flipped: boolean;
  subtext?: string;
  color?: string;
  width?: number;
  height?: number;
}

function CardScene({
  front,
  back,
  flipped,
  subtext,
  color = "#1e1b4b",
  width = 3,
  height = 2,
}: CardSceneProps) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!group.current) return;
    const target = flipped ? Math.PI : 0;
    group.current.rotation.y += (target - group.current.rotation.y) * 0.08;
    const scaleTarget = hovered ? 1.05 : 1;
    group.current.scale.lerp(
      new THREE.Vector3(scaleTarget, scaleTarget, scaleTarget),
      0.1
    );
  });

  return (
    <group
      ref={group}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <group rotation={[0, 0, 0]}>
        <RoundedBox args={[width, height, 0.05]} radius={0.06} smoothness={4}>
          <meshStandardMaterial
            color={color}
            metalness={0.3}
            roughness={0.4}
          />
        </RoundedBox>
        <Text
          position={[0, subtext ? 0.15 : 0, 0.04]}
          fontSize={0.22}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={width - 0.4}
        >
          {front}
        </Text>
        {subtext && (
          <Text
            position={[0, -0.25, 0.04]}
            fontSize={0.12}
            color="#a78bfa"
            anchorX="center"
            anchorY="middle"
          >
            {subtext}
          </Text>
        )}
      </group>
      <group rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[width, height, 0.05]} radius={0.06} smoothness={4}>
          <meshStandardMaterial color="#312e81" metalness={0.3} roughness={0.4} />
        </RoundedBox>
        <Text
          position={[0, 0, -0.04]}
          fontSize={0.16}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={width - 0.4}
          rotation={[0, Math.PI, 0]}
        >
          {back}
        </Text>
      </group>
    </group>
  );
}

interface Card3DProps {
  front: string;
  back: string;
  subtext?: string;
  color?: string;
  onClick?: () => void;
  className?: string;
  width?: number;
  height?: number;
}

export default function Card3D({
  front,
  back,
  subtext,
  color,
  onClick,
  className = "",
  width,
  height,
}: Card3DProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={`cursor-pointer ${className}`}
      onClick={() => {
        setFlipped(!flipped);
        onClick?.();
      }}
    >
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, 5]} intensity={0.3} color="#8b5cf6" />
        <CardScene
          front={front}
          back={back}
          flipped={flipped}
          subtext={subtext}
          color={color}
          width={width}
          height={height}
        />
      </Canvas>
    </div>
  );
}
