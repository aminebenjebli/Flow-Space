class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs /*, outputs, parameters */) {
    try {
      const input = inputs[0];
      if (input && input[0]) {
        // copy to transferable typed array
        const chunk = new Float32Array(input[0]);
        this.port.postMessage(chunk, [chunk.buffer]);
      }
    } catch (e) {
      // ignore
    }
    return true;
  }
}
registerProcessor('recorder-processor', RecorderProcessor);