import reactReconciler from 'react-reconciler';
import { safeJsonStringify, getGlobal } from './utils';
import { ReactVeloReconcilerInstance } from './reconciler-instance';

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

  console.warn('Unable to find parent with repeaterContext.relative$w!');
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

const ExpandCollapseVisibilityStrategy = {
  SHOW: 'expand',
  HIDE: 'collapse',
};

const VisibilityStrategy = ExpandCollapseVisibilityStrategy;

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
      `createInstance() instanceId: ${instance.instanceId} for type: ${type} propsId: ${instance.getIdentifier()} hostContext: ${safeJsonStringify(hostContext)}`,
    );

    instance.applyPropsOnNativeEl();

    if (type === 'repeater') {
      log(`#${instance.props.id} (${instance.instanceId}) is repeater type`);

      // @ts-expect-error
      instance.getNativeEl().onItemReady(($item, props) => {
        log(`Repeater item #${instance.getIdentifier()} (${instance.instanceId}) props._id: ${props._id} READY`);
        (instance.props as any).onReadyItemId(props._id, { relative$w: $item });
      });

      instance.getNativeEl().onItemRemoved((props: any) => {
        log(`Repeater item #${instance.getIdentifier()} props._id: ${props._id} REMOVED`);
        (instance.props as any).onRemovedItemId(props._id);
      });

      log(`#${instance.getIdentifier()} ${instance.instanceId} repeater data = []`);
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

      const removedKeys = Object.keys(oldProps).filter(
        (key) => !newProps[key],
      );

      const keysNeedToApplyChange = Array.from(new Set([...changedKeys, ...removedKeys]));

      if (keysNeedToApplyChange.length === 0) {
        return null;
      }

      const changedProps = keysNeedToApplyChange.reduce((acc, key) => {
        acc[key] = newProps[key];
        return acc;
      }, {} as any);
      log(`preapreUpdate: ${_instance.instanceId} done`);
      return changedProps;
    }

    return null;
  },
  commitUpdate(instance, payload, type, oldProps, newProps) {
    log(`Commiting update #${instance.getIdentifier()}`);
    const nativeEl = instance.getNativeEl();
    if (!nativeEl) {
      console.log(
        `Warning: ${instance.instanceId} did not locate element of props id: ${instance.getIdentifier()}, bailing out`,
      );
      return;
    }

    try {
      Object.keys(payload).forEach((key) => {
        log(
          `commiting ${key} on ${instance.instanceId} hostContext is: ${instance.hostContext.type}`,
        );

        // TODO: replace with applyPropsOnObjectExcept
        if (key === 'children' && typeof payload[key] === 'string') {
          log(`Should set text of ${instance.getIdentifier()}: ${payload[key]}, but we dont support that yet`);
        } else if (key === 'children') {
          log(`Should se children of ${instance.getIdentifier()}: ${payload[key]}, but we dont support that yet`);
        } if (instance.getEventHandlerNames().includes(key) && type !== 'repeater') {
          log(`Modifying ${key} on #${instance.getIdentifier()} ${type} via removeEventHandler because it's an event handler.`);
          nativeEl.removeEventHandler(key, oldProps[key]);
          nativeEl[key](payload[key]);
        } else  {
          log(`Set value of #${instance.getIdentifier()}: key "${key}" to "${safeJsonStringify(payload[key])}"`);

          if (key === 'hidden') {
            if (newProps[key] === true) {
              nativeEl.hide();
            } else if (newProps[key] === false) {
              nativeEl.show();
            }
          } else if (key === 'style') {
            // we can have:
            // 1) style.prop added
            // 2) style.prop modified
            // 3) style.prop removed
            // 4) style.prop set to null / undefined ( falsy )
            // Essentially 1+2 is the same, we just set the new values to the style object and continue with our lifes.

            const oldStyleProps = (oldProps.style || {}) as Record<string, string>;
            const newStyleProps = (newProps.style || {}) as Record<string, string>;

            const newPropsStylesSet = new Set(Object.keys(newStyleProps));
            const oldPropsStylesSet = new Set(Object.keys(oldStyleProps));
            const propDoesNotExistOnNewPropsOrIsFalsy = (prop: string) => !newPropsStylesSet.has(prop) || (newPropsStylesSet.has(prop) && !newStyleProps[prop]);
            
            const stylePropsRemoved = [
              ...oldPropsStylesSet
            ].filter((prop: string) => !newStyleProps[prop])
            .filter(propDoesNotExistOnNewPropsOrIsFalsy);

            const stylePropsChanged = [...newPropsStylesSet].filter(styleKey => oldStyleProps[styleKey] !== newStyleProps[styleKey]);

            // Call Velo API to remove the props
            stylePropsRemoved.forEach((styleProp: string) => nativeEl.style && nativeEl.style.removeProperty && nativeEl.style.removeProperty(styleProp));

            // Call Velo API to set style props
            stylePropsChanged.forEach(styleKey => {
              nativeEl.style[styleKey] = newStyleProps[styleKey];
            });
          } else {
            log(`Seting value of ${key} on native element #${instance.getIdentifier()}`);
            nativeEl[key] = payload[key];
          }
        }

        instance.props[key] = payload[key];
      });
    } catch (ex) {
      console.log(`Error committing update: ${ex}`, ex);
    }

    log(
      `commitUpdate() done for ${instance.getIdentifier()} on ${instance.instanceId}`,
    );
  },

  // Update root
  appendChildToContainer(container, child) {
    log(
      `appendChildToContainer(container: #${container.id}, child: #${child.getIdentifier()} (${child.instanceId}))`,
    );
    child.toggleVisibility(VisibilityStrategy.SHOW);
    //child.parent = container; dunno, parent is supposed to be ReactVeloReconcilerInstance
    container.children.push(child);
  },
  insertInContainerBefore(container, child, beforeChild) {
    log(
      `insertInContainerBefore(container: #${container.id}, child: #${child.getIdentifier()} (${child.instanceId}), beforeChild: #${beforeChild.getIdentifier()} (${beforeChild.instanceId}))`,
    );
    const index = container.children.indexOf(beforeChild);
    if (index > -1) {
      container.children.splice(index, 0, child);
      //child.parent = container; dunno, parent is supposed to be ReactVeloReconcilerInstance
    }
    child.toggleVisibility(VisibilityStrategy.SHOW);
  },
  removeChildFromContainer(container, child) {
    log(
      `removeChildFromContainer(container: #${container.id}, child: #${child.getIdentifier()} (${child.instanceId}))`,
    );
    child.applyFunctionOnChildrenAndSelf((currentInstance: ReactVeloReconcilerInstance) => currentInstance.removeEventHandlers());
    child.toggleVisibility(VisibilityStrategy.HIDE);
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
      `appendInitialChild(parent: #${parent.getIdentifier()} (${parent.instanceId}), child: #${child.getIdentifier()} (${child.instanceId}))`,
    );
    parent.children.push(child);
    child.parent = parent;

    child.toggleVisibility(VisibilityStrategy.SHOW);
  },
  appendChild(parent, child) {
    log(
      `appendChild(parent: #${parent.getIdentifier()} (${parent.instanceId}), child: #${child.getIdentifier()} (${child.instanceId}))`,
    );
    parent.children.push(child);
    child.parent = parent;
    child.toggleVisibility(VisibilityStrategy.SHOW);
  },
  insertBefore(parent, newChild, beforeChild) {
    log(`insertBefore(${parent.type}${parent.getIdentifier()}, ${newChild.type}#${newChild.getIdentifier()}, ${beforeChild.type}#${beforeChild.getIdentifier()})`);
    parent.children.splice(parent.children.indexOf(beforeChild), 0, newChild);

    newChild.parent = parent;
    newChild.relative$w = parent.relative$w;
    newChild.toggleVisibility(VisibilityStrategy.SHOW);
  },
  removeChild(parent, child) {
    log(
      `removeChild({ props.id: #${parent.getIdentifier()}, instanceId: ${parent.instanceId}, type: ${parent.type} }, { props.id: #${child.getIdentifier()}, instanceId: ${child.instanceId}, type: ${child.type} })`,
    );
    
    child.applyFunctionOnChildrenAndSelf((currentInstance: ReactVeloReconcilerInstance) => currentInstance.removeEventHandlers());
    child.toggleVisibility(VisibilityStrategy.HIDE);
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
      `getPublicInstance({ instance: #${instance.getIdentifier()}, instanceId: ${instance.instanceId} })`,
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
