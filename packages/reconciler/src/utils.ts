const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (__: any, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[[circular]]';
        }
        seen.add(value);
      }
      return value;
    };
  };
  
  export function safeJsonStringify(obj: any) {
    return JSON.stringify(obj, getCircularReplacer());
  }
  

  export function applyPropsOnObjectExcept(
    obj: any,
    props: Record<string, any>,
    exceptions: string[],
  ) {
    const unsettable = new Set(exceptions);
  
    Object.keys(props)
      .filter((key) => !unsettable.has(key))
      .forEach((key) => {
        if (
          obj[key] &&
          typeof obj[key] === 'object' &&
          typeof props[key] === 'object'
        ) {
          try {
            Object.assign(obj[key], props[key]);
          } catch (ex) {
            console.log(
              `applyPropsOnObjectExcept Object.assign setting ${key} failed: ${ex.message}`,
              ex,
            );
          }
        } else {
          try {
            obj[key] = props[key];
          } catch (ex) {
            console.log(
              `applyPropsOnObjectExcept setting ${key} failed: ${ex.message}`,
              ex,
            );
          }
        }
      });
  }
  