(function() {

    // Server side
    if (!window) {
        return;
    }

    var prefixes = {
            'transform': 'transform',
            'OTransform': '-o-transform',
            'msTransform': '-ms-transform',
            'MozTransform': '-moz-transform',
            'WebkitTransform': '-webkit-transform'
        },
        data = [],
        evt = getSupportedEvents(),
        handlers = [],
        params;

    var methods = {
        init: function(options) {
            params = $.extend({

                control: 'photor__viewportControl',
                next: 'photor__viewportControlNext',
                prev: 'photor__viewportControlPrev',
                thumbs: 'photor__thumbs',
                thumbsLayer: 'photor__thumbsWrap',
                thumb: 'photor__thumbsWrapItem',
                thumbImg: 'photor__thumbsWrapItemImg',
                thumbFrame: 'photor__thumbsWrapFrame',
                viewport: 'photor__viewport',
                layer: 'photor__viewportLayer',
                slide: 'photor__viewportLayerSlide',
                slideImg: 'photor__viewportLayerSlideImg',

                // State modifiers
                _loading: '_loading',       // Фотография не загружена
                _current: '_current',       // Текущий слайд или миниатюра
                _dragging: '_dragging',     // Перетаскивание
                _disabled: '_disabled',     // Элемент управления запрещен
                _alt: '_alt',               // Есть подпись к фотографиям
                _single: '_single',         // Модификатор для галереи с одной фотографией
                _animated: '_animated',     // На время анимации
                _hidden: '_hidden',         // Спрятанный слайд
                _html: '_html',             // Слайд с html-содержимым

                // Algorithm
                _auto: '_auto',             // Фотография больше вьюпорта
                _center: '_center',         // Фотография меньше вьюпорта

                // Orientation
                _portrait: '_portrait',     // Соотношение ширины к высоте фотографии меньше вьюпорта
                _landscape: '_landscape',   // Соотношение ширины к высоте фотографии больше вьюпорта

                // Thumbs
                _draggable: '_draggable',   // Разрешено перетаскивание на миниатюрах

                // Settings
                single: false,              // Инициализировать обработчики для одиночного изображения
                current: 0,                 // Текуший слайд
                count: 0,                   // Количество фотографий
                modifierPrefix: '_',        // Префикс для класса с номером слайда
                delay: 300,                 // Время анимации для слайдов
                keyboard: true,             // Управление с клавиатуры
                ieClassPrefix: '_ie',       // Префикс для класса с версией IE
                showThumbs: null,           // thumbs / dots / null

                // Supported features
                transform: getSupportedTransform(),
                transition: getPrefixed('transition'),

                ie: ie()

            }, options);

            return this.each(function(i) {
                var root = $(this),
                    galleryId = this.id || data.length,
                    j,
                    p = {}, // Current instance of gallery
                    content = {},
                    count = 0,
                    thumbs = [],
                    imageTemplate = {
                        url: '',
                        thumb: '',
                        caption: '',
                        width: 0,
                        height: 0,
                        loaded: false,
                        classes: ''
                    },
                    hasHTML = false;

                // Disable double init
                if (root.attr('data-photor-id')) {
                    return;
                }

                p.params = $.extend({}, params);

                // Get elements
                p.root        = root;
                p.control     = root.find('.' + p.params.control);
                p.next        = root.find('.' + p.params.next);
                p.prev        = root.find('.' + p.params.prev);
                p.thumbs      = root.find('.' + p.params.thumbs);
                p.thumbsLayer = root.find('.' + p.params.thumbsLayer);
                p.viewport    = root.find('.' + p.params.viewport);
                p.layer       = root.find('.' + p.params.layer);

                // Data collection
                p.gallery = [];

                // Initialization by object
                if (p.params.data && p.params.data.length) {

                    for (j = 0; j < p.params.data.length; j++) {
                        p.gallery.push($.extend({}, imageTemplate, p.params.data[j]));
                    }

                } else {

                    // Initialization by slides
                    var slides = root.find('.' + p.params.layer + ' > *');

                    if (slides.length) {
                        slides.each(function(j) {
                            var isPhoto = this.nodeName == 'IMG';

                            hasHTML = !isPhoto;

                            p.gallery.push($.extend({}, imageTemplate, {
                                url: isPhoto ? this.src : null,
                                caption: this.alt,
                                html: !isPhoto ? this.outerHTML : null,
                                thumb: $(this).attr('data-thumb'),
                                loaded: !isPhoto,
                                classes: isPhoto ? $(this).attr('class') : ''
                            }));
                        });
                    }

                }

                if (hasHTML && p.params.showThumbs == 'thumbs') {
                    p.params.showThumbs = 'dots';
                }


                // Build DOM
                content = methods.getHTML(p.params, p.gallery);

                p.layer.html(content.slides);
                p.thumbsLayer.html(content.thumbs);

                // Get builded elements
                p.thumb       = root.find('.' + p.params.thumb);
                p.thumbImg    = root.find('.' + p.params.thumbImg);
                p.thumbFrame  = root.find('.' + p.params.thumbFrame);
                p.slide       = root.find('.' + p.params.slide);
                p.slideImg    = root.find('.' + p.params.slideImg);

                p.slide.each(function(i) {
                    $(this).css('left', i * 100 + '%');
                });

                // Settings
                p.current = p.params.current;
                p.count = p.gallery.length - 1;
                p.thumbsDragging = false;
                p.thumbsIndent = 0;
                p.events = [];

                p.viewportWidth = p.viewport.outerWidth();
                p.viewportHeight = p.viewport.outerHeight();
                p.controlWidth = p.control.outerWidth();
                p.controlHeight = p.control.outerHeight();
                p.thumbsWidth = p.thumbs.outerWidth();
                p.thumbsHeight = p.thumbs.outerHeight();

                data[galleryId] = p;
                root.attr('data-photor-id', galleryId);

                if (p.params.showThumbs) {
                    root.addClass(p.params.modifierPrefix + p.params.showThumbs);
                }

                if (p.params.ie) {
                    root.addClass(p.params.ieClassPrefix + p.params.ie);
                }

                if (p.gallery.length == 1) {
                    root.addClass(p.params._single);
                }

                if (p.params.showThumbs == 'thumbs') {
                    methods.loadThumbs(galleryId);
                }

                if (p.gallery.length > 1 || p.params.single) {
                    methods.handlers(galleryId);
                }

                callback(galleryId);
                methods.go(galleryId, p.current, 0);
            });
        },

        update: function() {

            for (var key in data) {
                updateInstance(key);
            }

            function updateInstance(galleryId) {
                var p = data[galleryId];

                p.viewportWidth = p.viewport.outerWidth();
                p.viewportHeight = p.viewport.outerHeight();
                p.controlWidth = p.control.outerWidth();
                p.controlHeight = p.control.outerHeight();
                p.thumbsWidth = p.thumbs.outerWidth();
                p.thumbsHeight = p.thumbs.outerHeight();
                p.thumbsLayerWidth = p.thumbsLayer.outerWidth();

                p.slide.each(function(i) {
                    methods.position(galleryId, i);
                });

                if (p.params.showThumbs == 'thumbs') {
                    methods.getThumbsSize(galleryId);
                }

                methods.go(galleryId, p.current, 0);
            }
        },

        destroy: function(galleryId) {

            if (typeof galleryId != 'undefined') {
                unbindInstance(galleryId);
            } else {
                for (var key in data) {
                    unbindInstance(key);
                }
            }

            /*
             * Удалить обработчики для указанного инстанса галереи
             *
             * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
             */
            function unbindInstance(id) {
                var p = data[id];

                p.root.removeAttr('data-photor-id');

                for (var i = 0, len = p.events.length; i < len; i++) {
                    eventManager(p.events[i].element, p.events[i].event, p.events[i].handler, p.events[i].capture, 1);
                }
            }
        },

        handlers: function(galleryId) {
            var p = data[galleryId];

            bindControl(galleryId);
            bindResize(galleryId);
            bindTransitionEnd(galleryId);

            if (p.params.keyboard) {
                bindKeyboard(galleryId);
            }

            for (var i = 0, len = p.events.length; i < len; i++) {
                eventManager(p.events[i].element, p.events[i].event, p.events[i].handler, p.events[i].capture);
            }
        },

        go: function(galleryId, target, delay) {
            var p = data[galleryId];

            delay = delay == null ? p.params.delay : delay;

            p.root.addClass(p.params._animated);

            p.layer
                .css('transition-duration', delay + 'ms')
                // .css(methods.setIndent(galleryId, -target * p.viewportWidth));
                .css(methods.setIndent(galleryId, -target * 100));

            p.current = target;

            // Mark slide and thumb as current
            if (p.params.showThumbs == 'thumbs') {
                methods.setCurrentThumb(galleryId, target);
            }

            p.thumb.removeClass(p.params._current);
            p.slide.removeClass(p.params._current);
            p.thumb
                .filter('.' + p.params.modifierPrefix + target)
                .addClass(p.params._current);
            p.slide
                .filter('.' + p.params.modifierPrefix + target)
                .addClass(p.params._current);

            // Load slide's range
            methods.loadSlides(galleryId, target);
            methods.checkButtons(galleryId);

            if (!p.params.transition) {
                callback(galleryId);
            }

        },

        next: function(galleryId) {
            var p = data[galleryId];

            if (p.current < p.count) {
                methods.go(galleryId, p.current + 1);
            } else {
                methods.go(galleryId, p.current);
            }
        },

        prev: function(galleryId) {
            var p = data[galleryId];

            if (p.current > 0) {
                methods.go(galleryId, p.current - 1);
            } else {
                methods.go(galleryId, p.current);
            }
        },

        loadSlides: function(galleryId, target) {
            var p = data[galleryId],
                from = target - 1 < 0 ? 0 : target - 1,
                to = target + 1 > p.count ? p.count : target + 1;

            for (var i = from; i <= to; i++) {
                if (!p.gallery[i].loaded) {
                    methods.loadSlide(galleryId, i);
                }
            }
        },

        loadSlide: function(galleryId, target) {
            var p = data[galleryId],
                slide = p.root.find('.' + p.params.slide + '.' + p.params.modifierPrefix + target),
                slideImg = slide.find('.' + p.params.slideImg),
                alt = p.gallery[target].alt,
                url = p.gallery[target].url,
                img = document.createElement('img');

            (function(rel, slideImg) {
                var image = $(img),
                    styles = {};

                image
                    .on('load', function() {
                        p.gallery[rel].loaded = true;
                        p.gallery[rel].width = this.width;
                        p.gallery[rel].height = this.height;

                        methods.position(galleryId, rel);

                        if (p.params.ie && p.params.ie < 9) {
                            slideImg.attr('src', this.src);
                        } else {
                            slideImg.css('background-image', 'url(' + this.src + ')');
                        }

                        slide.removeClass(p.params._loading);
                    })
                    .on('error', function() {
                        $.error('Image wasn\'t loaded: ' + this.src);
                    });

                img.src = url;

                if (alt) {
                    slideImg
                        .addClass(p.params._alt)
                        .attr('data-alt', alt);
                }

            })(target, slideImg);
        },

        loadThumbs: function(galleryId) {
            var p = data[galleryId],
                count = p.count,
                images = p.gallery,
                loaded = 0;

            p.galleryThumbs = [];
            p.galleryThumbsLoaded = false;

            for (var i = 0; i <= count; i++) {
                (function(i) {
                    var img = document.createElement('img'),
                        image = $(img);

                    image
                        .on('load', function() {
                            loaded++;

                            if (loaded == count) {
                                p.galleryThumbsLoaded = true;
                                methods.getThumbsSize(galleryId);
                            }
                        })
                        .on('error', function() {
                            $.error('Image wasn\'t loaded: ' + this.src);
                        });

                    img.src = images[i].thumb;
                })(i);
            }
        },

        getThumbsSize: function(galleryId) {
            var p = data[galleryId],
                thumb = p.thumb;

            thumb.each(function(i) {
                var self = $(this);

                p.galleryThumbs[i] = {};
                p.galleryThumbs[i].width = self.outerWidth();
                p.galleryThumbs[i].height = self.outerHeight();
                p.galleryThumbs[i].top = self.position().top + parseInt(self.css('margin-top'));
                p.galleryThumbs[i].left = self.position().left + parseInt(self.css('margin-left'));
            });

            p.thumbsLayerWidth = p.thumbsLayer.outerWidth();

            methods.setCurrentThumb(galleryId, p.current, 1);
        },

        setCurrentThumb: function(galleryId, target, noEffects) {
            var p = data[galleryId],
                frame = p.thumbFrame,
                styles = {},
                current = p.galleryThumbs && p.galleryThumbs[target],
                thumbsW = p.thumbs.outerWidth(),
                layerW = p.thumbsLayer.outerWidth(),
                delay = noEffects ? '0s' : '.24s',
                indent, validatedIndent;

            p.thumbsDragging = thumbsW < layerW;

            if (p.galleryThumbsLoaded) {
                styles.width = current.width + 'px';
                styles.height = current.height + 'px';

                if (p.params.transform) {
                    var property = prefixes[p.params.transform.property];

                    if (p.params.transform.has3d) {
                        styles[property] = 'translate3d(' + current.left + 'px, ' + current.top + 'px, 0)';
                    } else {
                        styles[property] = 'translateX(' + current.left + 'px) translateY(' + current.top + 'px)';
                    }
                } else {
                    styles.top = current.top + 'px';
                    styles.left = current.left + 'px';
                }

                indent = -1 * (current.left - 0.5 * (thumbsW - current.width));
                validatedIndent = validateIndent(indent);
                p.thumbsIndent = validatedIndent;

                frame
                    .css('transition-duration', delay)
                    .css(styles);

                p.thumbsLayer
                    .css('transition-duration', delay)
                    .css(methods.setIndent(galleryId, validatedIndent, 'px'));

            }

            /*
             * Validates recommended indent (inscribes layer into the container correctly)
             *
             * @param {number} indent of layer in the container
             * @returns {number} correct indent
             */
            function validateIndent(indent) {
                var limit = thumbsW - layerW;

                return indent > 0 || !p.thumbsDragging ? 0 : indent < limit ? limit : indent;
            }

        },

        position: function(galleryId, target) {
            var p = data[galleryId],
                slide = p.root.find('.' + p.params.slide + '.' + p.params.modifierPrefix + target),
                img = p.gallery[target],
                viewportRatio = p.viewportWidth / p.viewportHeight,
                imgRatio = img.width / img.height;

            // Algorithm
            if (p.viewportWidth > img.width && p.viewportHeight > img.height) {
                p.gallery[target].algorithm = 'center';
                slide
                    .removeClass(p.params._auto)
                    .addClass(p.params._center);
            } else {
                p.gallery[target].algorithm = 'auto';
                slide
                    .removeClass(p.params._center)
                    .addClass(p.params._auto);
            }

            // Orientation
            if (imgRatio >= viewportRatio) {
                p.gallery[target].orientation = 'landscape';
                slide
                    .removeClass(p.params._portrait)
                    .addClass(p.params._landscape);
            } else {
                p.gallery[target].orientation = 'portrait';
                slide
                    .removeClass(p.params._landscape)
                    .addClass(p.params._portrait);
            }
        },

        checkButtons: function(galleryId) {
            var p = data[galleryId];

            if (p.current == 0) {
                p.prev.addClass(p.params._disabled);
            } else {
                p.prev.removeClass(p.params._disabled);
            }
            if (p.current == p.count) {
                p.next.addClass(p.params._disabled);
            } else {
                p.next.removeClass(p.params._disabled);
            }
        },

        setIndent: function(galleryId, value, meter) {
            var p = data[galleryId],
                result = {};

            meter = meter || '%';

            if (p.params.transform) {
                var property = prefixes[p.params.transform.property];

                if (p.params.transform.has3d) {
                    result[property] = 'translate3d(' + value + meter + ', 0, 0)';
                } else {
                    result[property] = 'translateX(' + value + meter + ')';
                }
            } else {
                result.left = value + meter;
            }

            return result;
        },

        getHTML: function(params, data) {
            var thumbsHTML = '',
                slidesHTML = '';

            for (var i = 0; i < data.length; i++) {

                // Thumbnails template

                thumbsHTML += '<span data-rel="' + i + '" class="' + params.thumb + ' ' + params.modifierPrefix + i + ' ' + data[i].classes + '">';

                if (params.showThumbs == 'thumbs' && data[i].url) {
                    thumbsHTML += '<img src="' + data[i].thumb + '" class="' + params.thumbImg + '" data-rel="' + i + '">';
                }

                thumbsHTML += '</span>';

                // Slides template

                slidesHTML += '<div class="' + params.slide + ' ' + params.modifierPrefix + i + ' ' + (data[i].html ? params._html : params._loading) + '" data-id="' + i + '">';

                if (data[i].html) {
                    slidesHTML += data[i].html;
                } else {
                    if (params.ie && params.ie < 9) {
                        slidesHTML += '<img src="" class="' + params.slideImg + ' ' + data[i].classes + '">';
                    } else {
                        slidesHTML += '<div class="' + params.slideImg + ' ' + data[i].classes + '"></div>';
                    }
                }

                slidesHTML += '</div>';
            }

            if (params.showThumbs == 'thumbs') {
                thumbsHTML += '<div class="' + params.thumbFrame + '"></div>';
            }

            return {thumbs: thumbsHTML, slides: slidesHTML};
        }
    };

    $.fn.photor = function(method) {

        if ( methods[method] ) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Unknown method: ' +  method);
        }

    };

    /**
     * Detect IE version
     *
     * @return {Int} major version
     */
    function ie() {
        var ua = navigator.userAgent.toLowerCase();

        return ua.indexOf('msie') != -1 ? parseInt(ua.split('msie')[1]) : false;
    }

    /**
     * Returns supported property for css-transform
     *
     * @return {String} string key
     */
    function getSupportedTransform() {
        var out = false,
            el = document.createElement('p');

        for (var key in prefixes) {
            if (el.style[key] !== undefined) {
                out = {property: key};

                break;
            }
        }

        document.body.insertBefore(el, null);

        if (out.property) {
            el.style[out.property] = "translate3d(1px,1px,1px)";
            out.has3d = window.getComputedStyle(el).getPropertyValue(prefixes[out.property]) != 'none';
        }

        document.body.removeChild(el);

        return out;
    }

    /**
     * Get prefixed css-property
     *
     * @return {String} string key
     */
    function getPrefixed(property) {
        var style = document.createElement('p').style,
            prefixes = ['ms', 'O', 'Moz', 'Webkit'];

        if (style[property] == '') {
            return property;
        }

        property = property.charAt(0).toUpperCase() + property.slice(1);

        for (var i = 0; i < prefixes.length; i++) {
            if (style[prefixes[i] + property] == '') {
                return prefixes[i] + property;
            }
        }
    }

    /**
     * Кроссбраузерно добавляет обработчики событий
     *
     * @param {HTMLElement} element HTMLElement
     * @param {event} e Событие
     * @param {function} handler Обработчик события
     * @param {bool} capture Capturing
     */
    function eventManager(element, e, handler, capture, off) {
        capture = !!capture;

        if (!element) {
            return;
        }

        if (off) {

            if (element.removeEventListener) {
                element.removeEventListener(e, handler, capture);
            } else {
                $(element).off(e);
            }

        } else {

            if (element.addEventListener) {
                element.addEventListener(e, handler, capture);
            } else {
                $(element).on(e, handler);
            }

        }
    }

    /**
     * Проверяет наличие класса у нативного HTML-элемента
     *
     * @param {HTMLElement} element HTMLElement
     * @param {string} className Имя класса
     */
    function hasClass(element, className) {
        if (!element) {
            return;
        }

        var classNames = ' ' + element.className + ' ';

        className = ' ' + className + ' ';

        if (classNames.replace(/[\n\t]/g, ' ').indexOf(className) > -1) {
            return true;
        }

        return false;
    }

    /**
     * Возвращает массив поддерживаемых событий
     * Если браузер поддерживает pointer events или подключена handjs, вернет события указателя.
     * Если нет, используем события мыши
     *
     * @return {Array} Массив с названиями событий
     */
    function getSupportedEvents() {
        var touchEnabled = 'ontouchstart' in window;

        if (touchEnabled) {
            return ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
        }

        return ['mousedown', 'mousemove', 'mouseup', 'mouseleave'];
    }

    /**
     * Debounce декоратор
     *
     * @param {function} fn Функция
     * @param {number} timeout Таймаут в миллисекундах
     * @param {bool}
     * @param {object} ctx Контекст вызова
     */
    function debounce(fn, timeout, invokeAsap, ctx) {
        if (arguments.length == 3 && typeof invokeAsap != 'boolean') {
            ctx = invokeAsap;
            invokeAsap = false;
        }

        var timer;

        return function() {
            var args = arguments;

            ctx = ctx || this;
            if (invokeAsap && !timer) {
                fn.apply(ctx, args);
            }

            clearTimeout(timer);

            timer = setTimeout(function() {
                if (!invokeAsap) {
                    fn.apply(ctx, args);
                }
                timer = null;
            }, timeout);
        };
    }

    /**
     * Throttle декоратор
     *
     * @param {function} fn Функция
     * @param {number} timeout Таймаут в миллисекундах
     * @param {object} ctx Контекст вызова
     */
    function throttle(fn, timeout, ctx) {
        var timer, args, needInvoke;

        return function() {
            args = arguments;
            needInvoke = true;
            ctx = ctx || this;

            if (!timer) {
                (function() {
                    if (needInvoke) {
                        fn.apply(ctx, args);
                        needInvoke = false;
                        timer = setTimeout(arguments.callee, timeout);
                    } else {
                        timer = null;
                    }
                })();
            }
        };
    }

    /**
     * Устанавливает обработчики управления указателем (touch, mouse, pen)
     *
     * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
     */
    function bindControl(galleryId) {
        var p = data[galleryId],
            control = p.control,
            thumbs = p.thumbs,
            touch = {};

        /**
         * Обработчик touch start
         *
         * @param {event} e Событие pointerdown
         */
        handlers.onStart = function(e) {
            // запоминаем координаты и время
            touch.x1 = e.clientX || e.touches && e.touches[0].clientX;
            touch.y1 = e.clientY || e.touches && e.touches[0].clientY;
            touch.t1 = new Date();
            touch.isPressed = true;

            // Запоминаем элемент, на котором вызвано событие
            touch.isThumbs = hasClass(this, p.params.thumbs);
            touch.thumbsStartX = p.thumbsIndent;

            p.layer.css('transition-duration', '0s');
            p.thumbsLayer.css('transition-duration', '0s');
        };

        /**
         * Обработчик touch move
         *
         * @param {event} e Событие pointermove
         */
        handlers.onMove = function(e) {
            if (touch.isPressed) {
                // смещения
                touch.shiftX = (e.clientX || e.touches && e.touches[0].clientX) - touch.x1;
                touch.shiftY = (e.clientY || e.touches && e.touches[0].clientY) - touch.y1;

                // абсолютные значения смещений
                touch.shiftXAbs = Math.abs(touch.shiftX);
                touch.shiftYAbs = Math.abs(touch.shiftY);

                // Detect multitouch
                touch.isMultitouch = touch.isMultitouch || (e.touches && e.touches.length) > 1;

                if (touch.isMultitouch) {
                    end();

                    return;
                }

                // если мы ещё не определились
                if (!touch.isSlide && !touch.isScroll) {
                    // если вертикальное смещение - скроллим пока не отпустили палец
                    if (touch.shiftYAbs >= 5 && touch.shiftYAbs > touch.shiftXAbs) {
                        touch.isScroll = true;
                    }

                    // если горизонтальное - слайдим
                    if (touch.shiftXAbs >= 5 && touch.shiftXAbs > touch.shiftYAbs) {
                        p.root.addClass(p.params._dragging);
                        touch.isSlide = true;
                        touch.startShift = getIndent(galleryId);
                    }
                }

                // если слайдим
                if (touch.isSlide) {

                    if (touch.isThumbs) {
                        if (p.thumbsDragging) {
                            thumbsMove();
                        }
                    } else {
                        // слайды таскаем, только если поддерживаются transition
                        if (p.params.transition) {
                            slidesMove();
                        }
                    }

                    // запрещаем скролл
                    if (e.preventDefault) {
                        e.preventDefault();
                    }
                }
            }
        };

        /**
         * Обработчик touch end
         *
         * @param {event} e Событие pointerup
         */
        handlers.onEnd = function(e) {
            // Ловим клик
            if (!touch.isSlide && !touch.isScroll && touch.isPressed) {

                // Назад
                if (hasClass(e.target, p.params.prev)) {
                    methods.prev(galleryId);
                }

                // Вперед
                if (hasClass(e.target, p.params.next)) {
                    methods.next(galleryId);
                }

                // Клик по миниатюре
                if (hasClass(e.target, p.params.thumbImg) || hasClass(e.target, p.params.thumb)) {
                    methods.go(galleryId, parseInt(e.target.getAttribute('data-rel')));
                }

                if (e.stopPropagation && e.preventDefault) {
                    e.stopPropagation();
                    e.preventDefault(); // Нужно для отмены зума по doubletap
                }
            }

            end();
        };

        /**
         * Возвращает текущее значение отступа layer
         *
         * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
         */
        function getIndent(galleryId) {
            var p = data[galleryId],
                value;

            if (p.params.transform) {
                value = p.layer.css(prefixes[p.params.transform.property]).match(/(-?[0-9\.]+)/g)[4];
            } else {
                value = p.layer.css('left');
            }

            return parseInt(value);
        }

        /**
         * Завершение перемещения
         */
        function end() {
            if (touch.isSlide) {
                if (touch.isThumbs) {
                    thumbsEnd();
                } else {
                    if (p.params.transition) {
                        slidesEnd();
                    }
                }
            }

            touch = {};
            p.root.removeClass(p.params._dragging);
        }

        /**
         * Движение слайдов во время перетаскивания
         */
        function slidesMove() {
            var resultIndent;

            if ((p.current == 0 && touch.shiftX > 0) || (p.current == p.count && touch.shiftX < 0)) {
                touch.shiftX = touch.shiftX / 3;
            }

            resultIndent = (touch.shiftX + touch.startShift) / p.viewportWidth * 100;

            p.layer.css(methods.setIndent(galleryId, Math.round(resultIndent * 100) / 100));
        }

        /**
         * Завершение движения слайдов
         */
        function slidesEnd() {
            // Transition executes if delta more then 5% of container width
            if (Math.abs(touch.shiftX) > p.controlWidth * 0.05) {
                if (touch.shiftX < 0) {
                    methods.next(galleryId);
                } else {
                    methods.prev(galleryId);
                }
            } else {
                methods.go(galleryId, p.current);
            }
        }

        /**
         * Движение миниатюр при перетаскивании
         */
        function thumbsMove() {
            var indent = touch.shiftX + touch.thumbsStartX,
                limit = -1 * (p.thumbsLayerWidth - p.thumbsWidth);

            // Если выходим за край
            if (indent > 0) {
                indent = indent / 3;
            }
            if (indent < limit) {
                indent = limit + ((indent - limit) / 3);
            }

            p.thumbsIndent = indent;
            p.thumbsLayer.css(methods.setIndent(galleryId, p.thumbsIndent, 'px'));
        }

        /**
         * Завершение движения миниатюр
         */
        function thumbsEnd() {
            if (p.thumbsDragging && touch.isSlide) {
                var direction = touch.shiftX < 0 ? -1 : 1;

                touch.t2 = new Date();
                p.thumbsIndent = calcTailAnimation(p.thumbsIndent, direction);

                p.thumbsLayer
                    .css('transition-duration', '.24s')
                    .css(methods.setIndent(galleryId, p.thumbsIndent, 'px'));
            }
        }

        /**
         * Вычисление конечной координаты слоя с миниатюрами с учетом движения по инерции
         *
         * @param {number} currentIndent Текущее положение слоя с миниатюрами в пикселях
         * @param {number} direction Направление движения (-1|1)
         * @returns {number} Значение координаты слоя с миниатюрами в пикселях
         */
        function calcTailAnimation(currentIndent, direction) {
            var speed = Math.abs(10 * touch.shiftX / (touch.t2 - touch.t1)),
                tail, limit;

            tail = direction * parseInt(Math.pow(speed, 2)) + currentIndent;
            limit = p.thumbs.outerWidth() - p.thumbsLayer.outerWidth();

            if (tail > 0) {
                return 0;
            }

            if (tail < limit) {
                return limit;
            }

            return tail;
        }

        // Touch-события
        p.events.push({
            element: p.viewport[0],
            event: evt[0],
            handler: handlers.onStart
        }, {
            element: p.viewport[0],
            event: evt[1],
            handler: handlers.onMove,
            capture: true
        }, {
            element: p.viewport[0],
            event: evt[2],
            handler: handlers.onEnd
        }, {
            element: p.viewport[0],
            event: evt[3],
            handler: handlers.onEnd
        }, {
            element: thumbs[0],
            event: evt[0],
            handler: handlers.onStart
        }, {
            element: thumbs[0],
            event: evt[1],
            handler: handlers.onMove,
            capture: true
        }, {
            element: thumbs[0],
            event: evt[2],
            handler: handlers.onEnd
        }, {
            element: thumbs[0],
            event: evt[3],
            handler: handlers.onEnd
        });

        // Отмена перехода по ссылке миниатюры
        for (var i = 0; i < p.thumb.length; i++) {
            p.events.push({
                element: p.thumb[i],
                event: 'click',
                handler: function(e) {
                    if (e.preventDefault) {
                        e.preventDefault();
                    }

                    return false;
                }
            });
        }

        // Отмена встроенного перетаскивания для картинок
        for (var j = 0; j < p.thumbImg.length; j++) {
            p.events.push({
                element: p.thumbImg[j],
                event: 'dragstart',
                handler: function(e) {
                    if (e.preventDefault) {
                        e.preventDefault();
                    }

                    return false;
                }
            });
        }
    }

    /**
     * Устанавливает обработчик изменения размера окна
     *
     * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
     */
    function bindResize(galleryId) {
        if (!handlers.resize) {
            var p = data[galleryId];

            handlers.resize = debounce(methods.update, 84);

            p.events.push({
                element: window,
                event: 'resize',
                handler: handlers.resize
            });
        }
    }

    /**
     * Устанавливает обработчики управления с клавиатуры
     *
     * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
     */
    function bindKeyboard(galleryId) {
        var p = data[galleryId];

        handlers.keydown = function(e) {
            var key = e.which || e.keyCode,
                node = e.target.nodeName.toLowerCase(),
                contenteditable = !!e.target.attributes.contenteditable;

            if (node != 'input' && node != 'textarea' && node != 'select' && !contenteditable) {
                switch(key) {
                    // Space
                    case 32:
                        methods.next(galleryId);
                        break;

                    // Left
                    case 37:
                        methods.prev(galleryId);
                        break;

                    // Right
                    case 39:
                        methods.next(galleryId);
                        break;
                }
            }


        };

        p.events.push({
            element: window,
            event: 'keydown',
            handler: handlers.keydown
        });
    }

    /**
     * Устанавливает обработчики на окончание анимации
     *
     * @param {string|number} galleryId Id галереи (ключ для массива с объектами инстансов галереи)
     */
    function bindTransitionEnd(galleryId) {
        var p = data[galleryId],
            transitionEnd = ['webkitTransitionEnd', 'MSTransitionEnd', 'oTransitionEnd', 'transitionend'];

        handlers.transitionEnd = function(e) {
            var prop = e.propertyName;

            if (prop.lastIndexOf('transform') != prop.length - 'transform'.length && prop != 'left') {
                return;
            }

            callback(galleryId);
        };

        for (var i = 0; i < transitionEnd.length; i++) {
            p.events.push({
                element: p.layer[0],
                event: transitionEnd[i],
                handler: handlers.transitionEnd
            });
        }
    }

    function callback(galleryId) {
        var p = data[galleryId];

        p.root.removeClass(p.params._animated);
        p.layer.css('transition-duration', '0s');


        for (var i = 0; i < p.count; i++) {
            var elem = p.root.find('.' + p.params.slide + '.' + p.params.modifierPrefix + i);

            if (i < p.current - 1 || i > p.current + 1) {
                elem.addClass(p.params._hidden);
            } else {
                elem.removeClass(p.params._hidden);
            }
        }

        if (p.params.onShow) {
            p.params.onShow(p);
        }
    }

})(jQuery);