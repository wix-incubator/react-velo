import reactReconciler from 'react-reconciler';
import { safeJsonStringify, applyPropsOnObjectExcept, getGlobal } from './utils';
import { EVENT_HANDLER_NAMES, ReactVeloReconcilerInstance } from './reconciler-instance';

const rootHostContext = {
  type: 'root-host-context',
};

function log(...args: any[]) {
  if (getGlobal().REACT_VELO_DEBUG) {
    console.log(...args);
  }
}

// Unfortunalty this is thet only way, get the `repeaterContext` prop from internalHandle
function getRelative$wFromParentRepeaterItemContext(internalHandle: any) {
  let parent = internalHandle.return;
  while (parent.elementType) {
    if (parent.pendingProps && parent.pendingProps.repeaterContext) {
      return parent.pendingProps.repeaterContext.relative$w;
    }

    parent = parent.return;
  }

  return null;
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

    if (type === 'repeater-item') {
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
    internalHandle,
  ) {
    if (typeof rootContainer.$w !== 'function') {
      console.log(`Warning: rootContainer.$w is not defined`);
    }
    log(
      `createInstance(type: ${type}, allProps: ${safeJsonStringify(
        allProps,
      )}`,
    );
    const instance = new ReactVeloReconcilerInstance({
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
    }, log);

    if (instance.props.repeaterContext) {
      instance.relative$w = (instance.props.repeaterContext as any).relative$w;
    }

    if (hostContext.type === 'repeater-item') {
      instance.relative$w = getRelative$wFromParentRepeaterItemContext(internalHandle);
    }

    rootContainer.instancesMap.set(instance.instanceId, instance);
    log(
      `createInstance() instanceId: ${instance.instanceId} for type: ${type} propsId: ${instance.props.id} hostContext: ${safeJsonStringify(hostContext)}`,
    );

    instance.applyPropsOnNativeEl();

    if (type === 'repeater') {
      log(`#${instance.props.id} (${instance.instanceId}) is repeater type`);

      // @ts-expect-error
      instance.getNativeEl().onItemReady(($item, props) => {
        log(`#${instance.props.id} (${instance.instanceId}) props._id: ${props._id} ready`);
        (instance.props as any).onReadyItemId(props._id, { relative$w: $item });
      });

      log(`#${instance.props.id} ${instance.instanceId} repeater data = []`);
      if (Array.isArray(instance.props.data)) {
        instance.getNativeEl().data = instance.props.data;
      } else {
        console.warn(`Repeater data prop suppose to be an array!`);
      }
    }

    if (type !== 'repeater' && hostContext.type !== 'repeater') {
        instance.installEventHandlers();
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
    const nativeEl = instance.getNativeEl();
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
            log(`set value of #${instance.props.id}: key "${key}" to "${payload[key]}"`);
            // nativeEl[key] = payload[key];
            if (typeof payload[key] === 'object' && key !== 'data') {
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
      `appendChildToContainer(container: #${container.id}, child: #${child.props.id} (${child.instanceId}))`,
    );
    child.toggleVisibility('show');
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
    child.toggleVisibility('show');
  },
  removeChildFromContainer(container, child) {
    log(
      `removeChildFromContainer(container: #${container.id}, child: #${child.props.id} (${child.instanceId}))`,
    );
    child.applyFunctionOnChildrenAndSelf((currentInstance: ReactVeloReconcilerInstance) => currentInstance.setIgnoreEvents());
    child.toggleVisibility('hide');
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

    child.toggleVisibility('show');
  },
  appendChild(parent, child) {
    log(
      `appendChild(parent: #${parent.props.id} (${parent.instanceId}), child: #${child.props.id} (${child.instanceId}))`,
    );
    parent.children.push(child);
    child.parent = parent;
    child.toggleVisibility('show');
  },
  insertBefore(parent, newChild, beforeChild) {
    log(`insertBefore(${parent.type}${parent.props.id}, ${newChild.type}#${newChild.props.id}, ${beforeChild.type}#${beforeChild.props.id})`);
    parent.children.splice(parent.children.indexOf(beforeChild), 0, newChild);

    newChild.parent = parent;
    newChild.relative$w = parent.relative$w;
    newChild.toggleVisibility('show');
  },
  removeChild(parent, child) {
    log(
      `removeChild({ props.id: #${parent.props.id}, instanceId: ${parent.instanceId}, type: ${parent.type} }, { props.id: #${child.props.id}, instanceId: ${child.instanceId}, type: ${child.type} })`,
    );
    
    child.applyFunctionOnChildrenAndSelf((currentInstance: ReactVeloReconcilerInstance) => currentInstance.setIgnoreEvents());
    child.toggleVisibility('hide');
  },

  // Unknown
  finalizeInitialChildren() {
    return false;
  },
  shouldSetTextContent() {
    return false;
  },
  getPublicInstance(instance: ReactVeloReconcilerInstance) {
    log(
      `getPublicInstance({ instance: #${instance.props.id}, instanceId: ${instance.instanceId} })`,
    );
    return instance.getNativeEl();
  },
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
