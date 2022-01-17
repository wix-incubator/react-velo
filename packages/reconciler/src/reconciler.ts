import reactReconciler from 'react-reconciler';
import { safeJsonStringify, applyPropsOnObjectExcept, getGlobal } from './utils';

const EVENT_HANDLER_NAMES = ['onClick', 'onKeyPress', 'onChange', 'onDblClick'];

const rootHostContext = {
  type: 'root-host-context',
};

function log(...args: any[]) {
  if (getGlobal().REACT_VELO_DEBUG) {
    console.log(...args);
  }
}

function installEventHandlers(instanceForEventHandlers: ReactVeloReconcilerInstance) {
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
      `Installing event handler on instanceId: ${instanceForEventHandlers.instanceId} propId: ${instanceForEventHandlers.props.id} eventName: ${eventName}`,
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
        log(`Calling ${eventName} handler on ${instanceForEventHandlers.instanceId}...`);
        //@ts-expect-error
        return instanceForEventHandlers.props[eventName](...args);
      }
    });
  });
}

function toggleVisibility(instance: ReactVeloReconcilerInstance, action: 'show' | 'hide') {
  const innerToggleVisibility = (instance: ReactVeloReconcilerInstance, action: 'show' | 'hide') => {
    if (instance) {
      const nativeEl = instance.relative$w(`#${instance.props.id}`);
      if (nativeEl) {
        if (typeof nativeEl[action] === 'function') {
          nativeEl[action]();
        } else {
          console.log(`Warning: ${action}() is not defined for ${instance.props.id}`);
        }
      }
    }

    instance.children.map(child => innerToggleVisibility(child, action));
  };

  innerToggleVisibility(instance, action);
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
  ignoreEvents?: boolean;
}

interface RepeaterDataItem {
  _id: ReactVeloReconcilerInstance['instanceId'];
}

type ReconcilerDefinition = reactReconciler.HostConfig<
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
unknown>;

export const reconcilerDefinition: ReconcilerDefinition = {
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
      instanceId: rootContainer.lastInstanceId++ + '',
      relative$w: rootContainer.$w,
      parent: null,
    };

    rootContainer.instancesMap.set(instance.instanceId, instance);
    log(
      `createInstance() instanceId: ${instance.instanceId} for propsId: ${instance.props.id}`,
    );

    let nativeEl = null;
    if (instance.props.id) {
      nativeEl = instance.relative$w(`#${instance.props.id}`);
    }

    if (nativeEl) {
      const unsettablePropNames = ['id', ...EVENT_HANDLER_NAMES];
      if (hostContext.type !== 'repeater') {
        log(`Setting props ${safeJsonStringify(instance.props)} on nativeEl: ${instance.props.id}`);
        applyPropsOnObjectExcept(nativeEl, instance.props, unsettablePropNames);
      }

      if (type === 'repeater') {
        log(`#${instance.props.id} (${instance.instanceId}) is repeater type`);
  
        // @ts-expect-error
        nativeEl.onItemReady(($item, props) => {
          log(
            `Repeater item ready: ${props._id} children: ${safeJsonStringify(
              rootContainer.instancesMap.get(props._id).children.map((instance: ReactVeloReconcilerInstance) => ({ instanceId: instance.instanceId, propsId: instance.props.id })),
            )}`,
          );

          const setPropsAndEventHandlers = (instance: ReactVeloReconcilerInstance) => {
            if (!instance.props.id) {
              log(`Unable to set props and event handlers on instanceId: ${instance.instanceId}, no props.id.`);
              return;
            }

            const childNativeEl = instance.relative$w('#' + instance.props.id);

            if (childNativeEl) {
              log(`Setting props ${safeJsonStringify(instance.props)} and event handlers on ${instance.props.id}`);
              applyPropsOnObjectExcept(
                childNativeEl,
                instance.props,
                unsettablePropNames,
              );
              installEventHandlers(instance);
            } else {
              log(`Unable to set props and event handlers on ${instance.props.id} for ${props._id}, native element not found`);
            }
          };

          const setRelative$wOnChildren = (child: ReactVeloReconcilerInstance) => {
            if (Array.isArray(child.children)) {
              child.children.forEach(setRelative$wOnChildren);
            }
            
            log(`Setting relative$w on ${child.props.id} for ${props._id}`);
            child.relative$w = $item;
            setPropsAndEventHandlers(child);
          };

          const repeaterItemInstance = rootContainer.instancesMap.get(props._id);
          repeaterItemInstance.relative$w = $item;
          setPropsAndEventHandlers(repeaterItemInstance);
          repeaterItemInstance.children.forEach(setRelative$wOnChildren);
        });

        nativeEl.data = [];
      }

      if (hostContext.type !== 'repeater' && type !== 'repeater') {
          installEventHandlers(instance);
      } else {
        log(
          `Skipping event handlers install. ${type === 'repeater' ? 'Repeater': 'Repeater item'}: instanceId: ${instance.instanceId} propsId: ${instance.props.id}`,
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

        // TODO: replace with applyPropsOnObjectExcept
        if (!EVENT_HANDLER_NAMES.includes(key)) {
          if (key === 'children' && typeof payload[key] === 'string') {
            log(`Should set text of ${instance.props.id}: ${payload[key]}, but we dont support that yet`);
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
      `appendChildToContainer(parent: #${container.id}, child: #${child.props.id} (${child.instanceId}))`,
    );
    toggleVisibility(child, 'show');
    //child.parent = container; dunno, parent is supposed to be ReactVeloReconcilerInstance
    container.children.push(child);
  },
  insertInContainerBefore(container, child, beforeChild) {
    log(
      `insertInContainerBefore(container: #${container.id}, child: #${child.props.id} (${child.instanceId}), beforeChild: #${beforeChild.props.id} (${beforeChild.instanceId}))`,
    );
    const index = container.children.indexOf(beforeChild);
    if (index > -1) {
      container.children.splice(index, 0, child);
      //child.parent = container; dunno, parent is supposed to be ReactVeloReconcilerInstance
    }
    toggleVisibility(child, 'show');
  },
  removeChildFromContainer(container, child) {
    log(
      `removeChildFromContainer(${safeJsonStringify(
        container,
      )}, { props.id: #${child.props.id}, instanceId: ${child.instanceId} })`,
    );
    toggleVisibility(child, 'hide');
  },
  clearContainer(container) {
    container.children.forEach((child: ReactVeloReconcilerInstance) => {
      child.parent = null;
    });
    container.children = [];
    log(`clearContainer(${container.id})`);
  },

  // Update children
  appendInitialChild(parent, child) {
    log(
      `appendInitialChild(parent: #${parent.props.id} (${parent.instanceId}), child: #${child.props.id} (${child.instanceId}))`,
    );
    parent.children.push(child);
    child.parent = parent;

    if (parent.type === 'repeater') {
      log(`appendInitialChild() done for ${child.props.id} on repeater ${parent.props.id}`);
      const nativeEl = parent.relative$w(`#${parent.props.id}`);
      if (nativeEl) {
        nativeEl.data = [
          ...nativeEl.data,
          { ...child.props, _id: child.instanceId },
        ];
        log(`appendInitialChild repeater #${parent.props.id} (${parent.instanceId}) data: ${nativeEl.data.map((d: RepeaterDataItem) => d._id).join(',')}`);
      }
    }

    toggleVisibility(child, 'show');
  },
  appendChild(parent, child) {
    log(
      `appendChild(parent: #${parent.props.id} (${parent.instanceId}), child: #${child.props.id} (${child.instanceId}))`,
    );
    parent.children.push(child);
    if (parent.type === 'repeater') {
      log(`appendChild() done for ${child.props.id} on repeater ${parent.props.id}`);
      const nativeEl = parent.relative$w(`#${parent.props.id}`);
      if (nativeEl) {
        nativeEl.data = [
          ...nativeEl.data,
          { ...child.props, _id: child.instanceId },
        ];
        log(`appendChild repeater #${parent.props.id} (${parent.instanceId}) data: ${nativeEl.data.map((d: RepeaterDataItem) => d._id).join(',')}`);
      }
    }
    child.parent = parent;
    toggleVisibility(child, 'show');
  },
  insertBefore(parent, newChild, beforeChild) {
    log(`insertBefore(${parent}, ${newChild}, ${beforeChild})`);
    log(`insertBefore(${parent.type}, ${newChild.type}, ${beforeChild.type})`);
    parent.children.splice(parent.children.indexOf(beforeChild), 0, newChild);

    newChild.parent = parent;
    newChild.relative$w = parent.relative$w;

    const newChildNativeEl = newChild.relative$w(`#${newChild.props.id}`);
    if (newChild.hostContext.type === 'repeater') {
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

        log(`insertBefore repeater #${parent.props.id} (${parent.instanceId}) data: ${nativeEl.data.map((d: RepeaterDataItem) => d._id).join(',')}`);
      }
    }
  },
  removeChild(parent, child) {
    log(
      `removeChild({ props.id: #${parent.props.id}, instanceId: ${parent.instanceId}, type: ${parent.type} }, { props.id: #${child.props.id}, instanceId: ${child.instanceId}, type: ${child.type} })`,
    );
    
    // there's no native way to remove event handler from wix element, so must do the hack:
    const setIngoreEvents = (instance: ReactVeloReconcilerInstance) => {
      instance.ignoreEvents = true;
      instance.children.forEach(setIngoreEvents);
    }
    setIngoreEvents(child);
    if (parent.type === 'repeater') {
      const nativeEl = parent.relative$w(`#${parent.props.id}`);
      if (nativeEl) {
        nativeEl.data = [
          ...nativeEl.data.filter((item: RepeaterDataItem) => item._id !== child.instanceId),
        ];
        log(`removeChild repeater #${parent.props.id} (${parent.instanceId}) data: ${nativeEl.data.map((d: RepeaterDataItem) => d._id).join(',')}`);
      }
    }

    toggleVisibility(child, 'hide');
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
};

const reconciler = reactReconciler(reconcilerDefinition);

function handleErrorInNextTick(error: Error) {
  console.log(`Error occured: ${error.message}`, error);
  setTimeout(() => {
    throw error;
  });
}

export default reconciler;
