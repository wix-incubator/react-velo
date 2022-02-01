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
   

    rootContainer.instancesMap.set(instance.instanceId, instance);
    log(
      `createInstance() instanceId: ${instance.instanceId} for propsId: ${instance.props.id}`,
    );

    if (hostContext.type !== 'repeater') {
      instance.applyPropsOnNativeEl();
    }

    if (type === 'repeater') {
      log(`#${instance.props.id} (${instance.instanceId}) is repeater type`);

      // @ts-expect-error
      instance.getNativeEl().onItemReady(($item, props) => {
        log(
          `Repeater item ready: ${props._id} children: ${safeJsonStringify(
            rootContainer.instancesMap.get(props._id).children.map((instance: ReactVeloReconcilerInstance) => ({ instanceId: instance.instanceId, propsId: instance.props.id })),
          )}`,
        );

        const repeaterItemInstance = rootContainer.instancesMap.get(props._id);
        repeaterItemInstance.applyFunctionOnChildrenAndSelf((currentInstance: ReactVeloReconcilerInstance) => {
          currentInstance.setRelative$w($item);
          currentInstance.setRepeaterItemReady();
          currentInstance.applyPropsOnNativeEl();
          if (currentInstance !== repeaterItemInstance) {
            currentInstance.installEventHandlers();
          }
        })
      });

      log(`#${instance.props.id} ${instance.instanceId} repeater data = []`);
      instance.getNativeEl().data = [];
    }

    if (hostContext.type !== 'repeater' && type !== 'repeater') {
        instance.installEventHandlers();
    } else {
      log(
        `Skipping event handlers install. ${type === 'repeater' ? 'Repeater': 'Repeater item'}: instanceId: ${instance.instanceId} propsId: ${instance.props.id}`,
      );
      if (type !== 'repeater') {
        instance.setRelative$w(() => {
          console.log('Error, calling relative$w on repeater item before it is ready!', new Error().stack);
          return true;
        });
        instance.markAsRepeaterItem();
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

    if (parent.type === 'repeater') {
      log(`appendInitialChild() done for ${child.props.id} on repeater ${parent.props.id}`);
      const nativeEl = parent.getNativeEl();
      if (nativeEl) {
        nativeEl.data = [
          ...nativeEl.data,
          { ...child.props, _id: child.instanceId },
        ];
        log(`appendInitialChild #${parent.props.id} ${parent.instanceId} repeater data = ${nativeEl.data.map((d: RepeaterDataItem) => d._id).join(',')}`);
      }
    }
    // } else {
    //   toggleVisibility(child, 'show');
    // }
    child.toggleVisibility('show');
  },
  appendChild(parent, child) {
    log(
      `appendChild(parent: #${parent.props.id} (${parent.instanceId}), child: #${child.props.id} (${child.instanceId}))`,
    );
    parent.children.push(child);
    if (parent.type === 'repeater') {
      log(`appendChild() done for ${child.props.id} on repeater ${parent.props.id}`);
      const nativeEl = parent.getNativeEl();
      if (nativeEl) {
        nativeEl.data = [
          ...nativeEl.data,
          { ...child.props, _id: child.instanceId },
        ];
        log(`appendChild #${parent.props.id} ${parent.instanceId} repeater data = ${nativeEl.data.map((d: RepeaterDataItem) => d._id).join(',')}`);
      }
    }
    child.parent = parent;
    child.toggleVisibility('show');
  },
  insertBefore(parent, newChild, beforeChild) {
    log(`insertBefore(${parent.type}${parent.props.id}, ${newChild.type}#${newChild.props.id}, ${beforeChild.type}#${beforeChild.props.id})`);
    parent.children.splice(parent.children.indexOf(beforeChild), 0, newChild);

    newChild.parent = parent;
    newChild.relative$w = parent.relative$w;

    const newChildNativeEl = newChild.getNativeEl();
    if (newChild.hostContext.type === 'repeater') {
      newChild.installEventHandlers();
      applyPropsOnObjectExcept(newChildNativeEl, newChild.props, [
        'id',
        ...EVENT_HANDLER_NAMES,
      ]);
    }
    //newChildNativeEl.show();
    newChild.toggleVisibility('show');

    // Should we even have this?
    if (parent.type === 'repeater') {
      const nativeEl = parent.getNativeEl();
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
    
    child.applyFunctionOnChildrenAndSelf((currentInstance: ReactVeloReconcilerInstance) => currentInstance.setIgnoreEvents());
    child.toggleVisibility('hide');

    if (parent.type === 'repeater') {
      const nativeEl = parent.getNativeEl();
      if (nativeEl) {
        nativeEl.data = [
          ...nativeEl.data.filter((item: RepeaterDataItem) => item._id !== child.instanceId),
        ];
        log(`removeChild repeater #${parent.props.id} (${parent.instanceId}) data: ${nativeEl.data.map((d: RepeaterDataItem) => d._id).join(',')}`);
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
};

const reconciler = reactReconciler(reconcilerDefinition);

function handleErrorInNextTick(error: Error) {
  console.log(`Error occured: ${error.message}`, error);
  setTimeout(() => {
    throw error;
  });
}

export default reconciler;
