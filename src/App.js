import React, { useState } from "react";

function App() {
  const [status, setStatus] = useState("Idle");
  const [bleData, setBleData] = useState("No Data");
  const [txChar, setTxChar] = useState(null);
  const [txMsg, setTxMsg] = useState("");


  const connectBLE = async () => {
    try {
      setStatus("Scanning...");

      // Step 1: Scan (NO UUID filter)
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
         // Allow access to ALL vendor & custom services
  optionalServices: [
    "battery_service",
    "device_information",
    "generic_access",
    "generic_attribute",
    "0000fff0-0000-1000-8000-00805f9b34fb"
  ]
      });

      setStatus("Connecting...");
      const server = await device.gatt.connect();

      setStatus("Discovering services...");
      const services = await server.getPrimaryServices();

      let notifyChar = null;

      // Step 2: Find NOTIFY characteristic automatically
      for (const service of services) {
        const chars = await service.getCharacteristics();

        for (const ch of chars) {
          if (ch.properties.notify) {
            notifyChar = ch;
            console.log("Notify Char Found:", ch.uuid);
            break;
          }
        }
        if (notifyChar) break;
      }

      if (!notifyChar) {
        setStatus("No notify characteristic found");
        return;
      }

      // Step 3: Subscribe to notifications
      await notifyChar.startNotifications();

      notifyChar.addEventListener(
        "characteristicvaluechanged",
        (event) => {
          const value = new TextDecoder().decode(event.target.value);
          console.log("BLE Data:", value);
          setBleData(value);
        }
      );

      setStatus("Connected & Listening");

    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.message);
    }
  };


 // 📤 Send ANY text
  const sendMessage = async () => {
    if (!txChar || txMsg.length === 0) return;

    const data = new TextEncoder().encode(txMsg);

    try {
      if (txChar.properties.writeWithoutResponse) {
        await txChar.writeValueWithoutResponse(data);
      } else {
        await txChar.writeValue(data);
      }
      console.log("TX:", txMsg);
      setTxMsg("");
    } catch (e) {
      console.error("Send error", e);
    }
  };

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <h2>WCH BLE Auto Connect</h2>

      <button onClick={connectBLE} style={{ padding: 10 }}>
        Connect BLE
      </button>

      <p><b>Status:</b> {status}</p>
      <p><b>Received:</b> {bleData}</p>
      {/* <button onClick={() => sendData("LED:1")}>LED ON</button>
      <button onClick={() => sendData("LED:0")}>LED OFF</button> */}
      <hr />

      <input
        type="text"
        value={txMsg}
        onChange={(e) => setTxMsg(e.target.value)}
        placeholder="Type any message"
        style={{ width: "60%", padding: 8 }}
      />
      <button onClick={sendMessage} style={{ marginLeft: 10 }}>
        Send
      </button>

      <hr />
      
    </div>
  );
}

export default App;
