import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Environment, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import logoTexture from '../../assets/brand/flexpay-icon.svg'

function CoinMesh({ reducedMotion, tilt, scrollProgress, isMobile }) {
  const groupRef = useRef(null)
  const segments = isMobile ? 32 : 64
  const texture = useMemo(() => new THREE.TextureLoader().load(logoTexture), [])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    const t = state.clock.elapsedTime

    if (reducedMotion) {
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.8
      groupRef.current.rotation.x = scrollProgress * 0.12
      groupRef.current.position.y = Math.sin(t * 0.7) * 0.05 - scrollProgress * 0.12
      groupRef.current.position.z = 0.1
      return
    }

    const turnSpeed = isMobile ? 0.12 : 0.28
    groupRef.current.rotation.y += delta * turnSpeed
    groupRef.current.rotation.x = (tilt * Math.PI) / 180 + scrollProgress * 0.14
    groupRef.current.position.y = Math.sin(t * 0.7) * 0.06 - scrollProgress * 0.24
    groupRef.current.position.z = Math.sin(t * 0.45) * 0.025
  })

  const coinContent = (
    <>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.2, 0.16, segments]} />
        <meshPhysicalMaterial
          color="#C6F135"
          emissive="#E1FF6B"
          emissiveIntensity={0.12}
          metalness={0.9}
          roughness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.1}
          sheen={0.22}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.21, 0.07, 16, segments]} />
        <meshStandardMaterial color="#E1FF6B" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.09]}>
        <circleGeometry args={[0.8, segments]} />
        <meshBasicMaterial map={texture} transparent opacity={0.95} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.09]}>
        <circleGeometry args={[0.8, segments]} />
        <meshStandardMaterial color="#150F2E" metalness={0.6} roughness={0.35} />
      </mesh>
    </>
  )

  return (
    <group ref={groupRef}>
      <Float speed={isMobile ? 0.9 : 1.3} rotationIntensity={isMobile ? 0.08 : 0.2} floatIntensity={isMobile ? 0.18 : 0.35}>
        {coinContent}
      </Float>
      {!isMobile ? <Sparkles size={24} count={10} position={[0, 1.4, 0]} scale={0.8} color="#E1FF6B" /> : null}
    </group>
  )
}

function CanvasDebugLogger() {
  const { scene, camera, gl, size } = useThree()

  useEffect(() => {
    console.log('HeroCoin Canvas mounted:', {
      size,
      sceneChildren: scene.children.length,
      cameraPosition: camera.position.toArray(),
      glWidth: gl.domElement.width,
      glHeight: gl.domElement.height,
    })
  }, [scene, camera, gl, size])

  return null
}

function HeroCoin({ reducedMotion, isMobile, tilt, scrollProgress }) {
  return (
    <div className="h-[240px] w-full max-w-[560px] sm:h-[320px] md:h-[420px]">
      <Canvas camera={{ position: [0, 0, 5.2], fov: isMobile ? 36 : 34 }} dpr={[1, 1.1]} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={["#0B0714"]} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[4, 4, 4]} intensity={2.6} color="#E1FF6B" />
        <directionalLight position={[-3, -2, 3]} intensity={1.2} color="#7C3AED" />
        <pointLight position={[0, 0, 3]} intensity={6} color="#E1FF6B" />
        <CoinMesh reducedMotion={reducedMotion} isMobile={isMobile} tilt={tilt} scrollProgress={scrollProgress} />
        <Environment preset="city" />
        <CanvasDebugLogger />
      </Canvas>
    </div>
  )
}

export default HeroCoin
