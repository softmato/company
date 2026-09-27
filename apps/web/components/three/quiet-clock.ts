import { getConsoleFunction, setConsoleFunction } from 'three';

/*
 * three r183 deprecated THREE.Clock and warns each time one is made, and
 * @react-three/fiber (9.7, still in 9.8.1) makes one per <Canvas> — so every
 * light-form mount, and every hot reload, logged it. The warning is about
 * fiber's code, not ours, and there is nothing here to change.
 *
 * ponytail: drops that one message only; delete this file once fiber's store
 * uses THREE.Timer.
 */
if (!getConsoleFunction()) {
  setConsoleFunction(
    (type: 'log' | 'warn' | 'error', message: string, ...params: unknown[]) => {
      if (message.startsWith('THREE.Clock:')) return;
      const trace = params[0] as {
        isStackTrace?: boolean;
        getError?: (m: string) => Error;
      };
      if (trace?.isStackTrace && trace.getError)
        console[type](trace.getError(message));
      else console[type](message, ...params);
    },
  );
}
