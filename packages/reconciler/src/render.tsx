import type ReactType from 'react';
import { getGlobal } from './utils';
import {ConcurrentRoot} from 'react-reconciler/constants'
declare var self: any;
let ReactInstance: typeof ReactType | null = null;

export function render(
  Component: ReactType.ComponentType<any>,
  $w: Function,
  React: typeof ReactType,
  callback?: () => void,
) {
  ReactInstance = React;
  self.reactVeloGlobals = {
    ReactInstance,
  };
  // the module is trying to access reactVeloGlobals as soon as it is initialized so needs to be delayed
  const reconciler = require('./reconciler').default;
  // @see https://github.com/facebook/react/blob/993ca533b42756811731f6b7791ae06a35ee6b4d/packages/react-reconciler/src/ReactRootTags.js
  // I think we are a legacy root?
  const rootContainer = { id: '~root~', type: 'root-container', $w, lastInstanceId: 0, instancesMap: new Map<string, any>(), children: [] };
  const root = reconciler.createContainer(
    rootContainer,
    ConcurrentRoot,
    false,
    null,
    true,
  );

  // Rule thinks we are in a React component, but we’re in a context that
  // only creates this value once instead.
  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const renderContextValue = { reconciler };

  const RenderContext = ReactInstance!.createContext<{
    reconciler: typeof reconciler;
  } | null>(null);

  // callback is cast here because the typings do not mark that argument
  // as optional, even though it is.
  reconciler.updateContainer(
      ReactInstance!.createElement(RenderContext.Provider, { value: renderContextValue },
          ReactInstance!.createElement(Component, null)),
    root,
    null,
    callback as any,
  );

  getGlobal().performance && getGlobal().performance.mark('react-velo rendered');
  getGlobal().REACT_VELO_DEBUG && console.log('react-velo rendered');
}

const RepeaterWrapper = (props: any) => {
  const [ready, setReady] =  ReactInstance!.useState({});
  return ReactInstance!.createElement('repeater', {
    id: props.id,
    onReadyItemId: (itemId: any, repeaterContext: any) => {
      setReady(prevReady => ({ 
        ...prevReady,
        [itemId]: repeaterContext
      }));
    },
    onRemovedItemId: (itemId: any) => {
      setReady(prevReady => ({ 
        ...prevReady,
        [itemId]: undefined,
      }));
    },
    data: props.data,
  }, props.data.map((item: {_id: string}) => {
    if (typeof (ready as any)[item._id] !== 'undefined') {
      return ReactInstance!.createElement('repeater-item', { key: item._id, repeaterContext: (ready as any)[item._id] }, props.renderItem(item));
    }
    return null;
  }));
};

function reactVeloComponentFactory(componentName: string, componentCache: Map<string, Function>) {
   if (!componentCache.has(componentName))
    componentCache.set(componentName, ReactInstance!.forwardRef(function SomeReactVeloComponet(props: any, ref: any) {
      // Guess it's a repeater if it has a renderItem prop
      if (props.renderItem) {
        return ReactInstance!.createElement(RepeaterWrapper, {id: componentName, ...props});
      }

      return ReactInstance!.createElement(componentName, {...props, ref});
    }));
    
    return componentCache.get(componentName);
   }

const reloHandler = {
  componentCache: new Map<string, Function>(),
  get(target: any, prop: string, receiver: any) {
    return reactVeloComponentFactory(prop, this.componentCache);
  }
};

// <W.MyAwesomeButton ... />
export const W = new Proxy({}, reloHandler);

// <V.button id="MyAwesomeButton" ... />
export const V = new Proxy({}, reloHandler);
