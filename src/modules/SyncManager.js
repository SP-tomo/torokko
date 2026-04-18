export class SyncManager {
  constructor(isController = false) {
    this.channel = new BroadcastChannel('trolley_sync');
    this.isController = isController;
    this.onMessage = null;
  }

  send(type, payload) {
    this.channel.postMessage({ type, payload });
  }

  listen(callback) {
    this.channel.onmessage = (event) => {
      callback(event.data.type, event.data.payload);
    };
  }
}
