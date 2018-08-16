(function () {
  var Sortable = (function () {
    /**
     * 기본 옵션
     * 
     * transitionDuration - (Number) 재정렬 아이템의 transitionDuration 시간
     * sameItemSize - (Boolean) 아이템들의 Height 가 동일한지에 대한 여부
     * scrollContainer - (Element) Scroll 이 있는 Element
     */
    const defaultOptions = {
      transitionDuration: 300, // ms
      sameItemSize: true,
      scrollContainer: null
    }

    /**
     * 깊은 복사
     * 
     * @param {Object} obj
     */
    function deepCopy(obj) {
      return JSON.parse(JSON.stringify(obj))
    }

    /**
     * 요소의 translate y 값을 반환한다.
     * 
     * @param {Element} element
     */
    function getTransformY(element) {
      const split = element.style.getPropertyValue('transform').replace(/[^0-9\-.,]/g, '').split(',');
      return parseInt(split[1], 10);
    }

    /**
     * 요소의 getBoundingClientRect() 결과 값을 반환한다. (width, height, top, left, x, y, ...)
     * 
     * @param {Element}} element 
     */
    function getElementInfo(element) {
      return element.getBoundingClientRect();
    }

    function bodyScrollTop() {
      return document.documentElement.scrollTop || document.body.scrollTop;
    }

    function Sortable(container, options) {
      if (!container) {
        return false;
      }

      this._init(container, Object.assign(deepCopy(defaultOptions), options));
    }

    Sortable.prototype = {
      _init: function (container, options) {
        this.container = container;
        this.options = options;
        
        this._connectList();
        this._event();
      },
      _connectList: function () {
        const { container } = this;
        this.items = Array.from(container.children);
      },
      _event: function () {
        const that = this;
        const { 
          container, 
          options 
        } = this;
        const { 
          scrollContainer,
          childTagName, 
          handleQuery, 
          transitionDuration  // 위치 변경 시 item 이동 속도
        } = options;

        let items;                  // items
        let itemLen;                // item 길이
        let isSorting = false;      // sorting 중 여부
        let isReSorting = false;    // 재정렬 진행중 여부
        let handleItem;             // drag 대상 item (down 시 hidden, up 시 visible. 그외 작업 없음)
        let handleItemHeight;       // drag 대상 item (down 시 hidden, up 시 visible. 그외 작업 없음)
        let x = 0;                  // down 시 pageX 값
        let y = 0;                  // down 시 pageY 값
        let initAndMovingDiff = 0;  // down 시 포인터와 handle item top 간의 차이
        let prevItem = null;        // 현재 index 의 이전 item
        let prevItemHeight;         // 이전 item 의 height
        let nextItem = null;        // 현재 index 의 다음 item
        let nextItemHeight = null;  // 다음 item 의 height
        let initIndex;              // handle item 의 초기 index
        let initScrollTop;          // 초기 scrollTop 값
        let index;                  // handle item 의 변경된 index
        let handleItemTop = 0;      // handle item 의 top
        let itemHeight = 0;         // item 의 height
        let movingHandle = null;    // drag 용 handle
        let containerTop = 0;       // container 의 top 좌표
        let handleItemPosition;     // start 시 handle item 정보
        let itemTop;                // item 의 top

        let pageX;
        let pageY;
        let clientY ;

        const setIndex = (newIndex, isInit) => {
          if (isInit) {
            initIndex = newIndex;
          }

          index = newIndex; 
          itemHeight = getElementInfo(movingHandle).height;
          handleItemTop = index * itemHeight;
          // handleItemTop = getElementInfo(container.children[index]).top - getElementInfo(container).top;
        }

        if (isMobile()) {
          container
            .on('touchstart', handleQuery, function (e) {
              start.call(this, e.touches[0]);
            })

          window.addEventListener('touchmove', function (e) {
            isSorting && proceeding.call(this, e.touches[0]);
          });

          window.addEventListener('touchend', function (e) {
            isSorting && end.call(this, e.touches[0]);
          });
        } else {
          container // .row
            .on('mousedown', handleQuery, function (e) {
              start.call(this, e);
            });

            window.addEventListener('pointermove', function (e) {
              isSorting && proceeding.call(this, e);
            });

            window.addEventListener('pointerup', function (e) {
              isSorting && end.call(this, e);
            });
        }

        window.addEventListener('scroll', function (e) {
          isSorting && proceeding.call(this, e);
        });

        // 시작
        function start(e) {
          pageX = e.pageX;
          pageY = e.pageY;

          initScrollTop = bodyScrollTop();

          handleItem = this.closest(childTagName) || this;
          handleItemPosition = getElementInfo(handleItem);
          handleItemHeight = handleItemPosition.height;
          movingHandle = getMovingHandle(handleItem, handleItemPosition.top, handleItemPosition.left);

          items = that.items;
          itemsLen = items.length;

          prevItem = handleItem.previousElementSibling;
          nextItem = handleItem.nextElementSibling;
          
          y = pageY;
          x = pageX;

          setIndex(items.indexOf(handleItem), true);
          calcContainerTop();
          itemTop = getItemTop(items[index]);
          initAndMovingDiff = (pageY - containerTop) - itemTop;
          initItemsByStart(items);
          document.body.appendChild(movingHandle);
          isSorting = true;
        };

        // 진행 중
        function proceeding(e) {
          if (e.type !== 'scroll') {
            pageX = e.pageX;
            pageY = e.pageY;
            clientY = e.clientY;

            const diff = diffY(pageY);
  
            // moving handle 좌표 적용
            setMovingHandlePosition(undefined, diff + initScrollTop - bodyScrollTop());
          }

          // ----- handle 로 인한 재정렬 체크
          detectIndexChange(getHandleItemY());
          
          if (scrollContainer) {
            calcContainerTop();

            let yInScrollContainer = clientY - containerTop - scrollContainer.scrollTop - initAndMovingDiff;
            autoScroll.init(yInScrollContainer);
          }
        };

        // 끝
        function end(e) {
          initItemsByEnd(items);
          handleItem.style.setProperty('visibility', '');
          initIndex < index ? items[index].after(handleItem.cloneNode(true)) : items[index].before(handleItem.cloneNode(true));
          handleItem.remove();
          handleItem = null;
          movingHandle.remove();
          that._connectList();
          autoScroll.clear();
          isSorting = false;
        }

        const autoScroll = (() => {
          let timer = null;

          return {
            init(yInScrollContainer) {
              let scrollContainerHeight = getElementInfo(scrollContainer).height;
              let diff = yInScrollContainer + handleItemHeight - scrollContainerHeight;

              if (diff > 0) {
                this.start(diff);
              } else if (diff < - scrollContainerHeight + handleItemHeight) {
                diff = diff % (- scrollContainerHeight + handleItemHeight);
                this.start(diff);
              } else {
                this.clear();
              }
            },
            clear() {
              if (timer) {
                clearInterval(timer);
                timer = null;
              }
            },
            start(diff) {
              this.clear();

              let interval = () => {
                diff = diff > 50 ? 50 : diff;
                scrollContainer.scrollTop += diff;

                // handle 로 인한 재정렬 체크
                calcContainerTop();
                detectIndexChange(getHandleItemY());
              }

              interval();
              timer = setInterval(interval, 50);
            }
          }
        })();

        function getHandleItemY() {
          return clientY - containerTop + bodyScrollTop() - initAndMovingDiff;
        }

        // movingHandle 좌표 재설정 (move 이벤트 시 발생)
        function setMovingHandlePosition(x = 0, y = 0) {
          movingHandle.style.setProperty('transform', `translate(${x}px, ${y}px)  translateZ(1px)`);
        }

        // movingHandle 생성 후 반환 (drag 대상 item hidden 처리)
        function getMovingHandle(handleItem, top, left) {
          let cloneChild = handleItem.cloneNode(true);
          cloneChild.style.setProperty('position', 'fixed');
          cloneChild.style.setProperty('box-shadow', '0px 0px 10px 0px rgba(0,0,0,0.5)');
          cloneChild.style.setProperty('top', top + 'px');
          cloneChild.style.setProperty('left', left + 'px');
          handleItem.style.setProperty('visibility', 'hidden');
          
          return cloneChild;
        }

        // containerTop 값 계산
        function calcContainerTop() { 
          containerTop = getElementInfo(container.firstElementChild).y + bodyScrollTop(); 
        }

        function detectIndexChange(handleItemY) {
          if (prevItem && handleItemY < getItemTop(prevItem) + (itemHeight / 2)) {
            setIndex(index - 1);
            prevItemTransformY = getTransformY(prevItem) + itemHeight;
            prevItem.style.setProperty('transform', `translate3d(0px, ${prevItemTransformY}px, 0px)`);
            nextItem = prevItem;
            prevItem = prevItem.previousElementSibling;
            
            if (prevItem && prevItem.style.getPropertyValue('visibility') === 'hidden') {
              prevItem = prevItem.previousElementSibling;
            }
          } else if (nextItem && handleItemY > getItemTop(nextItem) - (itemHeight / 2)) {
            setIndex(index + 1);
            nextItemTransformY = getTransformY(nextItem) - itemHeight;
            nextItem.style.setProperty('transform', `translate3d(0px, ${nextItemTransformY}px, 0px)`);
            prevItem = nextItem;
            nextItem = nextItem.nextElementSibling;
      
            if (nextItem && nextItem.style.getPropertyValue('visibility') === 'hidden') {
              nextItem = nextItem.nextElementSibling;
            }
          }
        }

        // 아이템 탑 좌표 반환
        const getItemTop = (element) => getElementInfo(element).top - getElementInfo(container).top;

        // 첫 좌표와 현재 좌표의 차이 값을 반환
        const diffY = (y2) => y2 - y;

        //---------- 드래그 시작/종료 시 모든 item 초기화 ----------//
        const initItems = (fn) => {
          return function (items) {
            items.forEach(fn);
          }
        };

        const initItemsByStartFn = (item) => {
          if (item === handleItem)
            return true;
        
          item.style.setProperty('transition-duration', transitionDuration + 'ms');
          item.style.setProperty('transform', 'translate(0px, 0px)');
        }

        const initItemsByEndFn = (item) => {
          items.forEach(function (item) {
            item.style.setProperty('transition-duration', '');
            item.style.setProperty('transform', '');
          });
        }

        const initItemsByStart = initItems(initItemsByStartFn);
        const initItemsByEnd = initItems(initItemsByEndFn);
        //---------- 드래그 시작/종료 시 모든 item 초기화 ----------//
      }
    }

    return Sortable;
  })()

  window.Sortable = Sortable;
})()

function isMobile() { 
  if( navigator.userAgent.match(/Android/i)
  || navigator.userAgent.match(/webOS/i)
  || navigator.userAgent.match(/iPhone/i)
  || navigator.userAgent.match(/iPad/i)
  || navigator.userAgent.match(/iPod/i)
  || navigator.userAgent.match(/BlackBerry/i)
  || navigator.userAgent.match(/Windows Phone/i)
  ){
     return true;
   }
  else {
     return false;
   }
 }