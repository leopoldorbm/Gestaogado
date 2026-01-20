// Browser-compatible serial simulation API
// This replaces the Node.js SerialPort dependency which doesn't work in v0 environment

// Global simulation state
const globalSimulationState = {
  connections: new Map<string, any>(),
  isSimulating: true,
  lastWeight: 450.0,
  lastAnimalId: "BR001234",
}

// Simulate realistic weight readings
function generateSimulatedWeight() {
  const baseWeight = globalSimulationState.lastWeight
  const variation = (Math.random() - 0.5) * 20 // ±10kg variation
  const newWeight = Math.max(100, baseWeight + variation)
  globalSimulationState.lastWeight = newWeight

  const isStable = Math.random() > 0.3 // 70% chance of stable reading
  const animalId =
    Math.random() > 0.7
      ? `BR${Math.floor(Math.random() * 999999)
          .toString()
          .padStart(6, "0")}`
      : null

  if (animalId) {
    globalSimulationState.lastAnimalId = animalId
  }

  return {
    weight: Math.round(newWeight * 10) / 10, // Round to 1 decimal
    unit: "kg",
    animalId: animalId || globalSimulationState.lastAnimalId,
    stable: isStable,
    timestamp: new Date().toISOString(),
    raw: isStable ? `${newWeight.toFixed(1)} kg STABLE` : `${newWeight.toFixed(1)} kg UNSTABLE`,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const port = searchParams.get("port") || "COM21"
    const baudRate = searchParams.get("baudRate") || "9600"

    console.log(`[v0] Serial Simulation API: Action=${action}, Port=${port}`)

    // Always return JSON with proper headers
    const jsonHeaders = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    }

    switch (action) {
      case "detect":
        console.log(`[v0] Simulating port detection...`)
        const simulatedPorts = [
          {
            path: "COM21",
            manufacturer: "Tru-Test XR5000 (Simulated)",
            vendorId: "0x1234",
            productId: "0x5678",
          },
          {
            path: "COM1",
            manufacturer: "Generic Serial (Simulated)",
            vendorId: "0x0000",
            productId: "0x0000",
          },
        ]

        return new Response(
          JSON.stringify({
            success: true,
            ports: simulatedPorts,
            message: `Found ${simulatedPorts.length} simulated serial ports`,
          }),
          { headers: jsonHeaders },
        )

      case "connect":
        console.log(`[v0] Simulating connection to ${port}...`)

        // Simulate connection delay
        await new Promise((resolve) => setTimeout(resolve, 500))

        globalSimulationState.connections.set(port, {
          isOpen: true,
          simulated: true,
          port: port,
          baudRate: baudRate,
          connectedAt: new Date().toISOString(),
        })

        return new Response(
          JSON.stringify({
            success: true,
            connected: true,
            message: `Successfully connected to simulated ${port}`,
          }),
          { headers: jsonHeaders },
        )

      case "read":
        console.log(`[v0] Simulating data read from ${port}...`)

        const connection = globalSimulationState.connections.get(port)

        if (!connection || !connection.isOpen) {
          return new Response(
            JSON.stringify({
              success: false,
              data: null,
              error: `No active connection to ${port}`,
            }),
            { headers: jsonHeaders },
          )
        }

        // Simulate occasional "no data" responses
        if (Math.random() < 0.2) {
          return new Response(
            JSON.stringify({
              success: true,
              data: null,
              message: `No data available from ${port}`,
            }),
            { headers: jsonHeaders },
          )
        }

        // Generate simulated weight data
        const simulatedData = generateSimulatedWeight()

        console.log(`[v0] Simulated weight data:`, simulatedData)

        return new Response(
          JSON.stringify({
            success: true,
            data: simulatedData,
            message: `Simulated data from ${port}`,
          }),
          { headers: jsonHeaders },
        )

      case "write":
        const command = searchParams.get("command") || ""
        console.log(`[v0] Simulating write command "${command}" to ${port}...`)

        const writeConnection = globalSimulationState.connections.get(port)

        if (!writeConnection || !writeConnection.isOpen) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `No active connection to ${port}`,
            }),
            { headers: jsonHeaders },
          )
        }

        // Simulate command processing delay
        await new Promise((resolve) => setTimeout(resolve, 100))

        return new Response(
          JSON.stringify({
            success: true,
            message: `Simulated command "${command}" sent to ${port}`,
          }),
          { headers: jsonHeaders },
        )

      case "disconnect":
        console.log(`[v0] Simulating disconnection from ${port}`)

        globalSimulationState.connections.delete(port)

        return new Response(
          JSON.stringify({
            success: true,
            message: `Disconnected from simulated ${port}`,
            connected: false,
          }),
          { headers: jsonHeaders },
        )

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid action. Use: detect, connect, read, write, or disconnect",
          }),
          {
            status: 400,
            headers: jsonHeaders,
          },
        )
    }
  } catch (error) {
    console.error(`[v0] Serial Simulation API Error:`, error)

    // Always return JSON, never let errors bubble up to Next.js error handler
    return new Response(
      JSON.stringify({
        success: false,
        error: "Simulation API error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, port } = body

    console.log(`[v0] Serial Simulation API POST: Action=${action}, Port=${port}`)

    const jsonHeaders = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    }

    switch (action) {
      case "configure":
        return new Response(
          JSON.stringify({
            success: false,
            error: "Configuration not needed for simulated serial ports",
          }),
          { headers: jsonHeaders },
        )

      case "bulk_read":
        // Simulate bulk reading with multiple weight samples
        const bulkData = Array.from({ length: 5 }, () => generateSimulatedWeight())

        return new Response(
          JSON.stringify({
            success: true,
            data: bulkData,
            message: "Simulated bulk read completed",
          }),
          { headers: jsonHeaders },
        )

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid POST action",
          }),
          {
            status: 400,
            headers: jsonHeaders,
          },
        )
    }
  } catch (error) {
    console.error(`[v0] Serial Simulation API POST Error:`, error)

    return new Response(
      JSON.stringify({
        success: false,
        error: "POST simulation error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      },
    )
  }
}
