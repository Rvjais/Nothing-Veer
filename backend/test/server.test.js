const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const childProcess = require("node:child_process");

const invocations = [];
let fail = false;
let complete;
childProcess.execFile = (_binary, args, _options, callback) => {
  const file = args[args.indexOf("--cookies") + 1];
  invocations.push({ args, file, jar: args.includes("--cookies") ? fs.readFileSync(file, "utf8") : "" });
  const finish = () => callback(fail ? new Error("Command failed with SID=DO_NOT_LEAK") : null,
    "https://audio.googlevideo.com/audio?expire=9999999999\n",
    fail ? "Sign in to confirm you're not a bot. SID=DO_NOT_LEAK" : "");
  if (complete) complete.push(finish);
  else setImmediate(finish);
};
const app = require("../server");
const server = app.listen(0, "127.0.0.1");
const ready = new Promise(resolve => server.once("listening", resolve));
after(() => new Promise(resolve => server.close(resolve)));

async function request(path, cookie, method = "GET") {
  await ready;
  return fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method, headers: cookie ? { "x-youtube-cookie": cookie } : {},
  });
}

test("session jars, cache isolation, safe failures, and cache invalidation", async () => {
  assert.equal((await request("/resolve?id=invalid")).status, 400);
  const resolve = "/resolve?id=abcdefghijk";
  assert.equal((await request(resolve, "SID=alpha; HSID=beta")).status, 200);
  assert.equal(invocations.length, 1);
  assert.match(invocations[0].jar, /\.youtube\.com\tTRUE\t\/\tTRUE\t0\tSID\talpha/);
  assert.ok(!invocations[0].args.some(arg => arg.includes("alpha")));
  assert.ok(!fs.existsSync(invocations[0].file));
  await request(resolve, "HSID=beta; SID=alpha");
  assert.equal(invocations.length, 1, "cookie ordering must not change cache identity");
  await request(resolve, "SID=other");
  assert.equal(invocations.length, 2, "a second session must resolve independently");
  await request(resolve);
  assert.equal(invocations.length, 3, "anonymous callers must not reuse session URLs");

  fail = true;
  const response = await request("/stream?id=bbbbbbbbbbb", "SID=DO_NOT_LEAK");
  assert.equal(response.status, 401);
  assert.ok(!(await response.text()).includes("DO_NOT_LEAK"));
  assert.ok(!fs.existsSync(invocations.at(-1).file));
  fail = false;

  complete = [];
  const pending = request("/resolve?id=ccccccccccc");
  while (!complete.length) await new Promise(resolve => setImmediate(resolve));
  assert.equal((await request("/cache", undefined, "DELETE")).status, 204);
  complete.shift()();
  await pending;
  complete = undefined;
  const count = invocations.length;
  await request("/resolve?id=ccccccccccc");
  assert.equal(invocations.length, count + 1, "a cleared pending request must not repopulate cache");
});
