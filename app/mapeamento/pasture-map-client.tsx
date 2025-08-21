"use client"

import dynamic from "next/dynamic"

const PastureMapInterface = dynamic(() => import("@/components/pasture-map-interface"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96">Carregando mapa...</div>,
})

export default function PastureMapClient() {
  return <PastureMapInterface />
}
