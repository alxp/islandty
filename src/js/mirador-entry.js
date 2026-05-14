import Mirador from 'mirador';
import textOverlayPlugin from 'mirador-textoverlay';

window.Mirador = Mirador;
window.miradorPlugins = [
  ...textOverlayPlugin,
];
