// A virtual microphone inside the WhatsApp Web page, so the niche voice note is
// recorded by WhatsApp itself and arrives as a real voice note (not a file).
// Same idea as a VB-CABLE loopback, without installing an audio driver:
// when WhatsApp asks for the microphone, it gets a stream that plays the loaded
// audio (already sped up to 1.08 by ffmpeg) after a short lead-in, then silence.
// Runs only in the sender's own browser profile; nothing else is touched.
export const mic = () => {
  if (window.__velaMicReady) return;
  window.__velaMicReady = true;
  const md = navigator.mediaDevices;
  if (!md) return;
  const realGUM = md.getUserMedia.bind(md);
  const realEnum = md.enumerateDevices.bind(md);
  let buffer = null, state = { loaded: false, started: 0, ends: 0, duration: 0 };
  let ac = null;
  window.__velaMicLoad = async (b64) => {
    ac = ac || new AudioContext({ sampleRate: 48000 });
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    buffer = await ac.decodeAudioData(bytes.buffer);
    state = { loaded: true, started: 0, ends: 0, duration: buffer.duration };
    return buffer.duration;
  };
  window.__velaMicClear = () => { buffer = null; state = { loaded: false, started: 0, ends: 0, duration: 0 }; };
  window.__velaMicState = () => ({ ...state, now: Date.now() });
  md.getUserMedia = async (c) => {
    if (!buffer || !c || !c.audio || c.video) return realGUM(c);
    await ac.resume();
    const dest = ac.createMediaStreamDestination();
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.connect(dest);
    const lead = 0.35; // a breath before the voice starts
    src.start(ac.currentTime + lead);
    state.started = Date.now();
    state.ends = Date.now() + (lead + buffer.duration) * 1000;
    return dest.stream;
  };
  // WhatsApp checks that a microphone exists before showing the record button.
  md.enumerateDevices = async () => {
    const list = await realEnum().catch(() => []);
    return list.some((d) => d.kind === "audioinput") ? list : [...list, { deviceId: "vela-mic", groupId: "vela", kind: "audioinput", label: "Vela voice note", toJSON() { return this; } }];
  };
};
