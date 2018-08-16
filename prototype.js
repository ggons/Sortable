HTMLElement.prototype.on = function (event, selector, fn) {
  if (typeof selector === 'function') {
    fn = selector;
    selector = undefined;
  }

  this.addEventListener(event, (e) => {
    const { target } = e;
    if (!selector) {
      if (this === target || this.contains(target)) {
        fn.call(this, e);
      }
    } else {
      const elements = Array.from(this.querySelectorAll(selector));
      let index = elements.indexOf(target);
      if (index > -1) {
        fn.call(elements[index], e);
      } else {
        let result = elements.some((element, i) => {
          index = i;
          return element.contains(target);
        });

        result && fn.call(elements[index], e);
      }
    }
  });

  return this;
};