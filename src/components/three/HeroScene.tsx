"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

const CARDS = [
  {
    lines: ["New lead", "Ahmed · Instagram DM"],
    accent: "#FF6B35",
    icon: "📩",
    offset: [0, 0.6, 0] as [number, number, number],
    phaseOffset: 0,
  },
  {
    lines: ["AI replied", "8 seconds"],
    accent: "#FF3366",
    icon: "⚡",
    offset: [-1.6, -0.3, -0.6] as [number, number, number],
    phaseOffset: 1.1,
  },
  {
    lines: ["Booked", "Tuesday · 3:00 PM"],
    accent: "#FF6B35",
    icon: "📅",
    offset: [1.6, -0.5, -0.3] as [number, number, number],
    phaseOffset: 2.1,
  },
];

function FloatingCard({
  lines,
  accent,
  icon,
  offset,
  phaseOffset,
}: {
  lines: string[];
  accent: string;
  icon: string;
  offset: [number, number, number];
  phaseOffset: number;
}) {
  const group = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current.position.y = offset[1] + Math.sin(t * 0.8 + phaseOffset) * 0.08;
    group.current.rotation.y = Math.sin(t * 0.3 + phaseOffset) * 0.06;
    group.current.rotation.x = Math.sin(t * 0.2 + phaseOffset * 0.5) * 0.03;
  });

  return (
    <group ref={group} position={offset}>
      {/* Card body */}
      <RoundedBox args={[2.8, 1.1, 0.07]} radius={0.08} smoothness={4}>
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.1}
          metalness={0.05}
          transparent
          opacity={0.96}
        />
      </RoundedBox>

      {/* Accent left bar */}
      <mesh position={[-1.3, 0, 0.041]}>
        <planeGeometry args={[0.06, 0.7]} />
        <meshBasicMaterial color={accent} />
      </mesh>

      {/* Icon */}
      <Text
        position={[-0.95, 0.12, 0.05]}
        fontSize={0.22}
        anchorX="center"
        anchorY="middle"
      >
        {icon}
      </Text>

      {/* Primary text */}
      <Text
        position={[-0.1, 0.16, 0.05]}
        fontSize={0.13}
        color="#1A0A00"
        fontWeight="bold"
        anchorX="left"
        anchorY="middle"
        maxWidth={1.8}
      >
        {lines[0]}
      </Text>

      {/* Secondary text */}
      <Text
        position={[-0.1, -0.08, 0.05]}
        fontSize={0.1}
        color="#888888"
        anchorX="left"
        anchorY="middle"
        maxWidth={1.8}
      >
        {lines[1]}
      </Text>

      {/* Card glow */}
      <pointLight position={[0, 0, 0.5]} color={accent} intensity={0.3} distance={2} />
    </group>
  );
}

function OrangeGlow() {
  return (
    <>
      <pointLight position={[0, 0, 2]} color="#FF6B35" intensity={1.2} distance={6} />
      <pointLight position={[2, 1, 1]} color="#FF3366" intensity={0.5} distance={5} />
      <pointLight position={[-2, -1, 1]} color="#FF6B35" intensity={0.4} distance={5} />
    </>
  );
}

function SceneGroup() {
  const { mouse } = useThree();
  const group = useRef<THREE.Group>(null!);

  useFrame(() => {
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      mouse.x * 0.15,
      0.05
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -mouse.y * 0.08,
      0.05
    );
  });

  return (
    <group ref={group}>
      <OrangeGlow />
      {CARDS.map((card) => (
        <FloatingCard key={card.lines[0]} {...card} />
      ))}
    </group>
  );
}

export default function HeroScene() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <SceneGroup />
      </Canvas>
    </div>
  );
}
