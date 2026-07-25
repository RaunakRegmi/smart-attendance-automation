export const environment = {
  production: false,
  apiUrl: '/api',
  // Origin baked into the attendance QR deep link. Leave empty to use the
  // browser's own origin. Set this to a LAN IP or tunnel URL when the QR must
  // be scanned by a phone — a phone resolving `localhost` reaches itself, not
  // this machine.
  publicOrigin: '',
};
