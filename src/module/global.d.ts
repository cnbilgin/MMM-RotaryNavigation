interface MagicMirror {
  getModules: () => MagicMirrorModule[];
}

interface MagicMirrorModule {
  hide(duration?: number): void;
  show(duration?: number): void;
  identifier: string;
  name: string;
}

declare const MM: MagicMirror;
