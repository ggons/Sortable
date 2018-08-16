(function () {
  var Sortable = (function () {
    function Sortable(container) {
      if (!container) {
        return false;
      }

      this._init(container);
    }

    Sortable.prototype = {
      _init: function (container) {
        this.container = container;

        this._connectList();
        this._event();
      },
      _connectList: function () {
        const container = this.container;
        this.items = Array.from(container.children);
      },
      _event: function () {
        const container = this.container;

        container.addEventListener('mousedown', function (e) {
          const row = e.target.closest('.row');
          if (row === null)
            return true;
            
          console.log('mousedown');
        });
        
        container.addEventListener('mousemove', function (e) {
          const row = e.target.closest('.row');
          if (row === null)
            return true;

          console.log('mousemove');
        });
        
        container.addEventListener('mouseup', function (e) {
          const row = e.target.closest('.row');
          if (row === null)
            return true;

          console.log('mouseup');
        });
      }
    }

    return Sortable;
  })();

  window.Sortable = Sortable;
})();