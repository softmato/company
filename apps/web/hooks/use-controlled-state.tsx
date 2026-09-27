import * as React from 'react';

interface CommonControlledStateProps<T> {
  value?: T | undefined;
  defaultValue?: T | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useControlledState<T, Rest extends any[] = []>(
  props: CommonControlledStateProps<T> & {
    onChange?: ((value: T, ...args: Rest) => void) | undefined;
  },
): readonly [T, (next: T, ...args: Rest) => void] {
  const { value, defaultValue, onChange } = props;

  const [internal, setInternalState] = React.useState<T>(defaultValue as T);
  // Controlled whenever a value is given; no copy to keep in step.
  const state = value !== undefined ? value : internal;

  const setState = React.useCallback(
    (next: T, ...args: Rest) => {
      setInternalState(next);
      onChange?.(next, ...args);
    },
    [onChange],
  );

  return [state, setState] as const;
}
