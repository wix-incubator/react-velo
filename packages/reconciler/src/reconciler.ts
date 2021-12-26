import reactReconciler from 'react-reconciler';
import { safeJsonStringify, applyPropsOnObjectExcept } from './utils';

const EVENT_HANDLER_NAMES = ['onClick', 'onKeyPress', 'onChange', 'onDblClick'];
const instancesMap = new Map<string, any>();

const rootHostContext = {
  type: 'root-host-context',
};

function log(...args: any[]) {
  // console.log(...args);
}

function installEventHandlers(instanceForEventHandlers: any) {
  const nativeElToInstallOn = instanceForEventHandlers.relative$w(
    `#${instanceForEventHandlers.props.id}`,
  );
  EVENT_HANDLER_NAMES.forEach((eventName) => {
    log(
      `${instanceForEventHandlers.instanceId} id: ${instanceForEventHandlers.props.id} instance.nativeEl ${eventName} set`,
    );
    const eventHandlerSetter = nativeElToInstallOn[eventName];
    if (typeof eventHandlerSetter !== 'function') {
      return;
    }

    log(
      `Installing instanceId: ${instanceForEventHandlers.instanceId} propId: ${instanceForEventHandlers.props.id} eventName: ${eventName}`,
    );
    eventHandlerSetter.call(nativeElToInstallOn, function (...args: any[]) {
      // there's no native way to remove event handler from wix element
      if (instanceForEventHandlers.ignoreEvents) {
        log(
          `Ignoring event for ${instanceForEventHandlers.instanceId} eventName: ${eventName}`,
        );
        return;
      }

      if (typeof instanceForEventHandlers.props[eventName] === 'function') {
        log('Calling handler...');
        return instanceForEventHandlers.props[eventName](...args);
      }
    });
  });
}

interface ReactVeloReconcilerInstance {
  type: string;
  props: Record<string, unknown>;
  rootContainer: any;
  hostContext: Record<string, never>;
  children: ReactVeloReconcilerInstance[];
  instanceId: string;
  relative$w: any;
  parent: ReactVeloReconcilerInstance | null;
}

interface RepeaterDataItem {
  _id: ReactVeloReconcilerInstance['instanceId'];
}

let instanceId = 0;
const reconciler = reactReconciler<
  // type
  any,
  // props
  Record<string, unknown>,
  // root container
  any,
  // view instance
  ReactVeloReconcilerInstance,
  // text instance
  any,
  // suspense instance
  never,
  // hydratable instance
  unknown,
  // public instance
  unknown,
  // host context
  Record<string, never>,
  // update payload
  Record<string, unknown>,
  // child set
  unknown,
  // timeout handle
  unknown,
  // notimeout
  unknown
>({
  now: Date.now,

  // Timeout
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: false,
  // @see https://github.com/facebook/react/blob/master/packages/react-dom/src/client/ReactDOMHostConfig.js#L408
  // queueMicrotask: (callback: any): any =>
  //   Promise.resolve(null).then(callback).catch(handleErrorInNextTick),

  isPrimaryRenderer: true,
  supportsMutation: true,
  supportsHydration: false,
  supportsPersistence: false,

  // Context
  getRootHostContext(rootContainer: any) : any {
    log(`getRootHostContext()`);
    return rootHostContext;
  },
  getChildHostContext(
    parentHostContext: Record<string, never>,
    type: any,
    rootContainer: any,
  ) : any {
    log(`getChildHostContext()`, parentHostContext, type, rootContainer);
    if (type === 'repeater') {
      return {
        type: 'repeater',
        parent: parentHostContext,
      };
    }

    if (parentHostContext.type === 'repeater') {
      return {
        type: 'repeater-item',
        parent: parentHostContext,
      };
    }

    return parentHostContext;
  },

  // Instances
  createTextInstance(text, root) {
    log(`createTextInstance(${text}, ${root})`);
    return {
      text,
      root,
    };
  },

  createInstance(
    type,
    allProps,
    rootContainer,
    hostContext,
  ) {
    if (typeof rootContainer.$w !== 'function') {
      console.log(`Warning: rootContainer.$w is not defined`);
    }
    log(
      `createInstance(type: ${type}, allProps: ${safeJsonStringify(
        allProps,
      )}, rootContainer: ${safeJsonStringify(
        rootContainer,
      )}, hostContext: ${safeJsonStringify(
        hostContext,
      )}, internalInstanceHandle: ... )`,
    );
    const instance: ReactVeloReconcilerInstance = {
      type,
      props: {
        ...allProps,
      },
      rootContainer,
      hostContext,
      children: [],
      instanceId: instanceId++ + '',
      relative$w: rootContainer.$w,
      parent: null,
    };

    instancesMap.set(instance.instanceId, instance);
    log(
      `createInstance() instanceId: ${instance.instanceId} for propsId: ${instance.props.id}`,
    );

    let nativeEl = null;
    if (instance.props.id) {
      nativeEl = instance.relative$w(`#${instance.props.id}`);
    }

    if (nativeEl) {
      const unsettablePropNames = ['id', ...EVENT_HANDLER_NAMES];
      if (hostContext.type !== 'repeater-item') {
        applyPropsOnObjectExcept(nativeEl, instance.props, unsettablePropNames);
      }

      if (type === 'repeater') {
        // @ts-expect-error
        nativeEl.onItemReady(($item, props) => {
          log(
            `Repeater item ready: ${props._id} children: ${safeJsonStringify(
              instancesMap.get(props._id).children,
            )}`,
          );

          const setRelative$wOnChildren = (child: ReactVeloReconcilerInstance) => {
            if (Array.isArray(child.children)) {
              child.children.forEach(setRelative$wOnChildren);
            }
            child.relative$w = $item;
            const childNativeEl = child.relative$w('#' + child.props.id);

            applyPropsOnObjectExcept(
              childNativeEl,
              child.props,
              unsettablePropNames,
            );
            installEventHandlers(child);

            log(`Setting relative$w on ${child.props.id} for ${props._id}`);
          };
          instancesMap.get(props._id).relative$w = $item;
          instancesMap.get(props._id).children.forEach(setRelative$wOnChildren);
        });

        nativeEl.data = [];
      } else {
        log(`not repeater`);
      }

      if (hostContext.type !== 'repeater-item') {
        installEventHandlers(instance);
      } else {
        log(
          `Repeater item: instanceId: ${instance.instanceId} propsId: ${instance.props.id}`,
        );
      }
    } else {
      if (instance.props.id) {
        console.log(
          `Warning: no nativeEl for #${instance.props.id} of type ${type} on instanceId: ${instance.instanceId}`,
          nativeEl,
        );
      }
    }

    return instance;
  },

  // Updates
  commitTextUpdate(text, _oldText, newText) {
    log(`commitTextUpdate: ${text}, ${_oldText} ${newText}`);
    // text.updateText(newText);
  },
  prepareUpdate(_instance: ReactVeloReconcilerInstance, _type, oldProps, newProps) {
    log(`preapreUpdate: ${_instance.instanceId}`);
    if (_instance) {
      const changedKeys = Object.keys(newProps).filter(
        (key) => oldProps[key] !== newProps[key],
      );
      if (_instance.props.style) {
        if (newProps.style) {
          // @ts-expect-error
          const changedStyleKeys = Object.keys(_instance.props.style).filter(
            // @ts-expect-error
            (key: string) => newProps.style[key] !== _instance.props.style[key],
          );
          if (changedStyleKeys.length) {
            changedKeys.push('style');
          }
        } else {
          changedKeys.push('style');
        }
      }

      if (changedKeys.length === 0) {
        return null;
      }

      const changedProps = changedKeys.reduce((acc, key) => {
        if (key === 'style') {
          acc[key] = {
            // @ts-expect-error
            ...Object.keys(_instance.props[key] || {})
              .map((styleKey) => ({ [styleKey]: 'rgb(255, 255, 255)' }))
              .reduce((acc, style) => ({ ...acc, ...style }), {}), // This is a hack to make style reset work
              // @ts-expect-error
            ...(newProps[key] || {}),
          };
        } else {
          acc[key] = newProps[key];
        }

        return acc;
      }, {} as any);
      log(`preapreUpdate: ${_instance.instanceId} done`);
      return changedProps;
    }

    return null;
  },
  commitUpdate(instance, payload, type, oldProps, newProps) {
    log(`Commiting update #${instance.props.id}`);
    if (!instance.props.id) {
      console.log(
        `Warning: instanceId: ${instance.instanceId} type: ${instance.type} has no props id, bailing out`,
      );
      return;
    }
    const nativeEl = instance.relative$w(`#${instance.props.id}`);
    if (!nativeEl) {
      console.log(
        `Warning: ${instance.instanceId} did not locate element of props id: ${instance.props.id}, bailing out`,
      );
      return;
    }

    try {
      Object.keys(payload).forEach((key) => {
        log(
          `commiting ${key} on ${instance.instanceId} hostContext is: ${instance.hostContext.type}`,
        );
        if (!EVENT_HANDLER_NAMES.includes(key)) {
          if (key === 'children' && typeof payload[key] === 'string') {
            log(`set text of ${instance.props.id}: ${payload[key]}`);
          } else if (key !== 'children') {
            log(`set value of ${instance.props.id}: ${key} -> ${payload[key]}`);
            // nativeEl[key] = payload[key];
            if (typeof payload[key] === 'object') {
              Object.assign(nativeEl[key], payload[key]);
            } else {
              nativeEl[key] = payload[key];
            }
          }
        }

        instance.props[key] = payload[key];
      });
    } catch (ex) {
      console.log(`Error committing update: ${ex}`, ex);
    }

    log(
      `commitUpdate() done for ${instance.props.id} on ${instance.instanceId}`,
    );
  },

  // Update root
  appendChildToContainer(container, child) {
    log(
      `appendChildToContainer(${safeJsonStringify(
        container,
      )}, ${safeJsonStringify(child)})`,
    );
    // child.parent = container;
    // container.children.push(child);
  },
  insertInContainerBefore(container, child, beforeChild) {
    log(`insertInContainerBefore(${container}, ${child}, ${beforeChild})`);
    // remoteRoot.insertChildBefore(child, beforeChild);
  },
  removeChildFromContainer(container, child) {
    log(
      `removeChildFromContainer(${safeJsonStringify(
        container,
      )}, ${safeJsonStringify(child)})`,
    );
    // if (child) {
    //     const nativeEl = child.relative$w(`#${child.props.id}`);
    //     if (nativeEl) {
    //       if (typeof nativeEl.hide === 'function') {
    //         nativeEl.hide();
    //       } else {
    //         console.log(`Warning: hide() is not defined for ${child.props.id}`);
    //       }
    //     }
    // }
    // remoteRoot.removeChild(child);
  },
  clearContainer(container) {
    container.children.forEach((child: ReactVeloReconcilerInstance) => {
      child.parent = null;
    });
    container.children = [];
    console.log(`clearContainer(${container})`);
  },

  // Update children
  appendInitialChild(parent, child) {
    log(
      `appendInitialChild(parent: ${safeJsonStringify(
        parent,
      )}, child: ${safeJsonStringify(child)})`,
    );
    parent.children.push(child);
    child.parent = parent;

    if (parent.type === 'repeater') {
      const nativeEl = parent.relative$w(`#${parent.props.id}`);
      if (nativeEl) {
        nativeEl.data = [
          ...nativeEl.data,
          { ...child.props, _id: child.instanceId },
        ];
      }
    }

    if (child) {
      const nativeEl = child.relative$w(`#${child.props.id}`);
      if (nativeEl) {
        if (typeof nativeEl.show === 'function') {
          nativeEl.show();
        } else {
          console.log(`Warning: show() is not defined for ${child.props.id}`);
        }
      }
    }
  },
  appendChild(parent, child) {
    log(
      `appendChild(parent: ${safeJsonStringify(
        parent,
      )}, child: ${safeJsonStringify(child)})`,
    );
    parent.children.push(child);
    if (parent.type === 'repeater') {
      const nativeEl = parent.relative$w(`#${parent.props.id}`);
      if (nativeEl) {
        nativeEl.data = [
          ...nativeEl.data,
          { ...child.props, _id: child.instanceId },
        ];
      }
    }
    child.parent = parent;
  },
  insertBefore(parent, newChild, beforeChild) {
    log(`insertBefore(${parent}, ${newChild}, ${beforeChild})`);
    log(`insertBefore(${parent.type}, ${newChild.type}, ${beforeChild.type})`);
    parent.children.splice(parent.children.indexOf(beforeChild), 0, newChild);

    newChild.parent = parent;
    newChild.relative$w = parent.relative$w;

    const newChildNativeEl = newChild.relative$w(`#${newChild.props.id}`);
    if (newChild.hostContext.type === 'repeater-item') {
      installEventHandlers(newChild);
      applyPropsOnObjectExcept(newChildNativeEl, newChild.props, [
        'id',
        ...EVENT_HANDLER_NAMES,
      ]);
    }
    newChildNativeEl.show();

    // Should we even have this?
    if (parent.type === 'repeater') {
      const nativeEl = parent.relative$w(`#${parent.props.id}`);
      if (nativeEl) {
        nativeEl.data = nativeEl.data.splice(
          nativeEl.data.findIndex((c: RepeaterDataItem) => c._id === beforeChild.instanceId),
          0,
          { ...newChild.props, _id: newChild.instanceId },
        );
      }
    }
  },
  removeChild(parent, child) {
    log(
      `removeChild(parent: ${safeJsonStringify(
        parent,
      )}, child: ${safeJsonStringify(child)})`,
    );
    // there's no native way to remove event handler from wix element, so must do the hack:
    child.ignoreEvents = true;
    if (parent.type === 'repeater') {
      const nativeEl = parent.relative$w(`#${parent.props.id}`);
      if (nativeEl) {
        nativeEl.data = [
          ...nativeEl.data.filter((item: RepeaterDataItem) => item._id !== child.instanceId),
        ];
      }
    }

    if (child) {
      const nativeEl = child.relative$w(`#${child.props.id}`);
      if (nativeEl) {
        if (typeof nativeEl.hide === 'function') {
          nativeEl.hide();
        } else {
          console.log(`Warning: hide() is not defined for ${child.props.id}`);
        }
      }
    }
  },

  // Unknown
  finalizeInitialChildren() {
    return false;
  },
  shouldSetTextContent() {
    return false;
  },
  getPublicInstance() {},
  prepareForCommit() {
    return null;
  },
  resetAfterCommit() {},
  commitMount() {},
  preparePortalMount() {},
});

function handleErrorInNextTick(error: Error) {
  console.log(`Error occured: ${error.message}`, error);
  setTimeout(() => {
    throw error;
  });
}

export default reconciler;
