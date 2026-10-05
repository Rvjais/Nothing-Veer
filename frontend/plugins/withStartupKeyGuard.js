const { withMainActivity } = require("expo/config-plugins");

module.exports = function withStartupKeyGuard(config) {
  return withMainActivity(config, (result) => {
    if (result.modResults.language !== "kt") throw new Error("Startup key guard requires Kotlin MainActivity.");
    let source = result.modResults.contents;
    if (source.includes("// Nothing Music: startup key guard")) return result;
    source = source.replace("import android.os.Bundle", "import android.os.Bundle\nimport android.view.KeyEvent");
    const marker = "  override fun onCreate(savedInstanceState: Bundle?) {";
    if (!source.includes(marker)) throw new Error("Could not locate MainActivity.onCreate for startup key guard.");
    source = source.replace(marker, `  // Nothing Music: startup key guard
  // The development launcher may deliver keys before React's delegate exists.
  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    if (reactDelegate == null) return false
    return super.onKeyDown(keyCode, event)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
    if (reactDelegate == null) return false
    return super.onKeyUp(keyCode, event)
  }

  override fun onKeyLongPress(keyCode: Int, event: KeyEvent): Boolean {
    if (reactDelegate == null) return false
    return super.onKeyLongPress(keyCode, event)
  }

${marker}`);
    result.modResults.contents = source;
    return result;
  });
};
