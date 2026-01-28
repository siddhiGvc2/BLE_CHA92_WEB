import React, { useState } from "react";

function App() {
  const [status, setStatus] = useState("Idle");
  const [rxData, setRxData] = useState("");
  const [txChar, setTxChar] = useState(null);
  const [txMsg, setTxMsg] = useState("");
  const [deviceRef, setDeviceRef] = useState(null);

  // 🔔 Beep sound using Web Audio API
  const playBeep = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const connectBLE = async () => {
    try {
      setStatus("Scanning...");

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "0000fff0-0000-1000-8000-00805f9b34fb",
          "generic_access",
          "generic_attribute"
        ]
      });

      setDeviceRef(device);

      // 🔌 Disconnect listener
      device.addEventListener("gattserverdisconnected", () => {
        setStatus("❌ BLE DISCONNECTED");
        playBeep();
        alert("⚠ BLE Device Disconnected!");
      });

      setStatus("Connecting...");
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();

      let notifyChar = null;
      let writeChar = null;

      for (const service of services) {
        const chars = await service.getCharacteristics();
        for (const ch of chars) {
          if (ch.properties.notify && !notifyChar) notifyChar = ch;
          if (
            (ch.properties.write || ch.properties.writeWithoutResponse) &&
            !writeChar
          )
            writeChar = ch;
        }
      }

      if (!notifyChar || !writeChar) {
        setStatus("Required characteristics not found");
        return;
      }

      setTxChar(writeChar);

      await notifyChar.startNotifications();
      notifyChar.addEventListener(
        "characteristicvaluechanged",
        (e) => {
          const val = new TextDecoder().decode(e.target.value);
          setRxData(val);
        }
      );

      setStatus("✅ Connected");
    } catch (e) {
      console.error(e);
      setStatus("Error: " + e.message);
    }
  };

  const sendMessage = async () => {
    if (!txChar || !txMsg) return;

    const data = new TextEncoder().encode(txMsg);

    try {
      if (txChar.properties.writeWithoutResponse) {
        await txChar.writeValueWithoutResponse(data);
      } else {
        await txChar.writeValue(data);
      }
      setTxMsg("");
    } catch (e) {
      console.error("Send error", e);
    }
  };

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <h2>WCH BLE Monitor</h2>

      <button onClick={connectBLE}>Connect BLE</button>
      <p><b>Status:</b> {status}</p>

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

      <p><b>Received:</b></p>
      <pre>{rxData}</pre>
    </div>
  );
}

export default App;
