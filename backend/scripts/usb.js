const { execFile } = require("node:child_process");

let running = false;
let lastStatus = "";
function adb(args) {
  return new Promise((resolve, reject) => {
    execFile("adb", args, { windowsHide: true, timeout: 4000 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

async function keepForwarding() {
  if (running) return;
  running = true;
  let status;
  try {
    const mappings = await adb(["reverse", "--list"]);
    for (const port of [3000, 8081]) {
      if (!mappings.includes(`tcp:${port} tcp:${port}`)) await adb(["reverse", `tcp:${port}`, `tcp:${port}`]);
    }
    status = "USB forwarding ready for audio (3000) and Metro (8081).";
  } catch {
    status = "Waiting for one USB-debugging-authorized Android device. Connect it or select a device with ANDROID_SERIAL.";
  } finally {
    running = false;
  }
  if (status !== lastStatus) console.log(status);
  lastStatus = status;
}

void keepForwarding();
const timer = setInterval(() => void keepForwarding(), 3000);
process.on("SIGINT", () => { clearInterval(timer); process.exit(0); });
