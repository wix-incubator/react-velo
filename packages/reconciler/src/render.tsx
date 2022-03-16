import React, { createContext } from 'react';
import reconciler from './reconciler';
import { getGlobal } from './utils';

export function render(
  Component: React.ComponentType<any>,
  $w: Function,
  callback?: () => void,
) {
  // @see https://github.com/facebook/react/blob/993ca533b42756811731f6b7791ae06a35ee6b4d/packages/react-reconciler/src/ReactRootTags.js
  // I think we are a legacy root?
  const container = reconciler.createContainer(
    { id: '~root~', type: 'root-container', $w, lastInstanceId: 0, instancesMap: new Map<string, any>(), children: [] },
    0,
    false,
    null,
  );

  // Rule thinks we are in a React component, but we’re in a context that
  // only creates this value once instead.
  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const renderContextValue = { reconciler };

  const RenderContext = createContext<{
    reconciler: typeof reconciler;
  } | null>(null);

  // callback is cast here because the typings do not mark that argument
  // as optional, even though it is.
  reconciler.updateContainer(
    <RenderContext.Provider value={renderContextValue}>
      <Component />
    </RenderContext.Provider>,
    container,
    null,
    callback as any,
  );
  
  getGlobal().performance && getGlobal().performance.mark('react-velo rendered');
  getGlobal().REACT_VELO_DEBUG && console.log('react-velo rendered');
}


const reloHandler = {
  get(target: any, prop: string, receiver: any) {
    return function ReactVeloComponent(props: any) {
      // Guess it's a repeater if it has a renderItem prop
      if (props.renderItem) {
        const children = (props.data || []).map((item: any) => {
          return React.createElement("repeater-item", null, props.renderItem(item));
        });

        return React.createElement('repeater', { id: prop, ...props }, ...children);
      }

      return React.createElement(prop, props);
    }
  },
};

// <W.MyAwesomeButton ... />
export const W = new Proxy({}, reloHandler);

// <V.button id="MyAwesomeButton" ... />
export const V = new Proxy({}, reloHandler);
