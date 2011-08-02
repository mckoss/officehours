/*

            _/    _/_/    _/_/_/_/_/                              _/
               _/    _/      _/      _/_/    _/    _/    _/_/_/  _/_/_/
          _/  _/  _/_/      _/    _/    _/  _/    _/  _/        _/    _/
         _/  _/    _/      _/    _/    _/  _/    _/  _/        _/    _/
        _/    _/_/  _/    _/      _/_/      _/_/_/    _/_/_/  _/    _/
       _/
    _/

    Created by David Kaneda <http://www.davidkaneda.com>
    Documentation and issue tracking on GitHub <http://wiki.github.com/senchalabs/jQTouch/>

    Special thanks to Jonathan Stark <http://jonathanstark.com/>
    and pinch/zoom <http://www.pinchzoom.com/>

    Contributor: Thomas Yip <http://beedesk.com/>

    (c) 2009-2010 by jQTouch project members and contributors
    See LICENSE.txt for license.

    $Revision: $
    $Date: $
    $LastChangedBy: $

*/

(function($) {
    $.jQTouch = function(options) {

        var SUPPORT_TOUCH = (typeof Touch != "undefined");
        var START_EVENT = SUPPORT_TOUCH? 'touchstart' : 'mousedown';
        var MOVE_EVENT = SUPPORT_TOUCH? 'touchmove' : 'mousemove';
        var END_EVENT = SUPPORT_TOUCH? 'touchend' : 'mouseup';
        var CANCEL_EVENT = SUPPORT_TOUCH? 'touchcancel' : 'mouseout'; // mouseout on document

        // Initialize internal variables
        var $body,
            $head=$('head'),
            hist=[],
            newPageCount=0,
            bogomark=1,
            jQTSettings={},
            hashCheckInterval,
            currentPage,
            currentAside=$(''),
            orientation,
            isMobileWebKit = RegExp(" Mobile/").test(navigator.userAgent),
            tapReady=true,
            lastAnimationTime=0,
            touchSelectors=[],
            publicObj={},
            tapBuffer=351,
            extensions=$.jQTouch.prototype.extensions,
            actionNodeTypes=['anchor', 'area', 'back', 'submit'];
            behaviorModifier=['toggle'];
            defaultAnimations=['slide', 'flip', 'slideup', 'swap', 'cube', 'pop', 'dissolve', 'fade'],
            defaultSection=null,
            animations=[],
            splitscreenmode=false,
            hairExtensions='';

        var defaults = {
            addGlossToIcon: true,
            cacheGetRequests: true,
            fixedViewport: true,
            fullScreen: true,
            fullScreenClass: 'fullscreen',
            icon: null,
            icon4: null, // experimental
            preloadImages: false,
            startupScreen: null,
            statusBar: 'default', // other options: black-translucent, black
            useAnimations: true,
            defaultAnimation: 'slide',
            useFastTouch: false, // Experimental.

            // animation selectors
            notransitionSelector: '',
            cubeSelector: '.cube',
            dissolveSelector: '.dissolve',
            fadeSelector: '.fade',
            flipSelector: '.flip',
            popSelector: '.pop',
            slideSelector: '.slide',
            slideupSelector: '.slideup',
            swapSelector: '.swap',

            // node type selectors
            anchorSelector: '#jqt a',
            areaSelector: '#jqt area',
            backSelector: '#jqt .back, #jqt .cancel, #jqt .goback, #jqt .done, #jqt .toolbar input[type=\'reset\']',
            formSelector: '#jqt form',
            submitSelector: '#jqt .submit, input[type=\'submit\']',

            // behaviour selectors (experimental)
            toggleSelector: '#jqt .tog',

            // special selectors
            activableSelector: '#jqt ul > li, #jqt ol > li',
            swipeableSelector: '#jqt .swipe',
            tapableSelector: '#jqt .tap'
        };

        /* -- tag for code merge --
        function addAnimation(animation) {
         */
        function initAnimations() {
            // Add animations and each selector
            for (var i in defaultAnimations) {
                var name = defaultAnimations[i];
                var selector = jQTSettings[name + 'Selector'];
                if (typeof(selector) == 'string' && selector.length > 0) {
                    var selector = jQTSettings[name + 'Selector'];
                    animations.push({name: name, selector: selector});
                } else {
                    console.warn('invalid selector for animation: ' + name);
                }
            }
        }

        function findAnimation(search) {
            var result = jQTSettings.defaultAnimation;

            var matcher = function(candidate) { return false; };
            if (typeof(search) === 'string') {
                if (!!search) {
                    matcher = function(candidate) { return candidate.name === search; };
                }
            } else if ($.isFunction(search)) {
                matcher = search;
            }

            for (var i = animations.length - 1; i >= 0; i--) {
                if (matcher(animations[i]) === true) {
                    result = animations[i];
                    break;
                }
            }
            return result;
        }

        function adjustAnimation(name, reverse) {
            var result;

            if (!name) {
                name = jQTSettings.defaultAnimation;
            }
            if (reverse === true) {
                var KEY = 'reverse';
                var splitted = name.split(' ');
                var i = $.inArray(KEY, splitted);
                if (name.indexOf(KEY) >= 0 && i < 0) {
                    console.error('check didn\'t work');
                }
                if (i >= 0) {
                    splitted.splice(i, 1);
                    result = splitted.join(' ');
                } else {
                    result = name + ' ' + KEY;
                }
                if (result === 'reverse') {
                    console.error('check failed. input: ' + name + ' output: ' + result + 'i: ' + i + ' joined: ' + splitted.join('-'));
                }
            } else {
                result = name;
            }
            return result;
        }

        function addPageToHistory(page, search, animation) {
            // Grab some info
            var pageId = page.attr('id');
            var page = $('#' + pageId); // normalize to actual page
            var section = page.attr('section');
            // Prepend info to page history
            hist.unshift({
                page: page,
                search: search,
                animation: animation,
                section: section,
                id: pageId
            });

            // update hash
            if (section === defaultSection) {
                location.hash = '#' + pageId + getSearchString(search);
            }
            startHashCheck();
        }

        function findPageFromHistory(search, start) {
            var result;
            var matcher;

            if (!start) {
                start = 0;
            }
            var number = Math.min(parseInt(search || start, 10), hist.length-1);
            if (!isNaN(number)) {
                matcher = function(candidate, i) { return i === number; };
            } else if (typeof(search) === 'string') {
                if (search === '') {
                    matcher = function(candidate) { return true; };
                } else {
                    matcher = function(candidate) { return candidate.id === search; };
                }
            } else if ($.isFunction(search)) {
                matcher = search;
            } else {
                matcher = function(candidate) {
                    var matched = true;
                    for (var key in search) {
                        if (search[key] !== candidate[key]) {
                           matched = false;
                           break;
                        }
                    }
                    return matched;
                };
            }
            for (var i=start, len=hist.length; i < len; i++) {
                if (matcher(hist[i], i)) {
                    result = $.extend({i: i}, hist[i]);
                    break;
                }
            }
            return result;
        }

        function removePageInHistory(to, from, cond) {
            if (!from) {
                from = 0;
            }
            var fromPage = hist[from];
            var section = fromPage.section;
            for (var i=(to-1); i >= from; i--) {
                var matched = true;
                var candidate = hist[i];
                if (!!cond) {
                    for (var key in cond) {
                        if (cond[key] !== candidate[key]) {
                           matched = false;
                           break;
                        }
                    }
                }
                if (matched) {
                    hist.splice(i, 1);
                }
            }
        }

        function parseSearch(q) {
          // Andy E and community @ http://stackoverflow.com/posts/2880929/revisions
          var results = {};
          var e,
              a = /\+/g,  // Regex for replacing addition symbol with a space
              r = /([^&=]+)=?([^&]*)/g,
              d = function (s) { return decodeURIComponent(s.replace(a, " ")); };

          while (e = r.exec(q)) {
             results[d(e[1])] = d(e[2]);
          }
          return results;
        };

        function getSearchString(search) {
            var result = '';
            for (var item in search) {
                if (result.length === 0) {
                    result += '&';
                }
                result += item + '=' + encodeURIComponent(search[item]);
            }
            if (result.legnth > 0) {
                result += '?';
            }
            return result;
        };

        /* -- tag for code merge --
        function doNavigation(fromPage, toPage, animation, backwards) {
        */
        function animatePages(params) {
            var toPage, fromPage, animation, pagecallback;
            toPage = params.to;
            fromPage = params.from;
            animation = params.animation;
            pagecallback = params.pagecallback;

            // Error check for target page
            if (!toPage || !fromPage || toPage.length == 0 || fromPage.length == 0) {
                $.fn.unselect();
                console.error('Target element is missing. Dest: ' + toPage + ' Source: ' + fromPage);
                tapReady = true;
                return false;
            }

            // Error check for fromPage=toPage
            if (toPage.hasClass('current')) {
                $.fn.unselect();
                console.error('Target element is the current page.');
                tapReady = true;
                return false;
            }

            // Collapse the keyboard
            $(':focus').blur();

            // Make sure we are scrolled up to hide location bar
            toPage.css('top', window.pageYOffset);

            // animation settings
            var backwards = !!animation? $.inArray('reverse', animation.split(' ')) >= 0: false;
            var animation = !backwards? animation: adjustAnimation(animation, true);
            var main = toPage.attr('section') === defaultSection;

            fromPage.trigger('pageAnimationStart', { direction: 'out' });
            toPage.trigger('pageAnimationStart', { direction: 'in' });

            if ($.support.WebKitAnimationEvent && animation && jQTSettings.useAnimations && animation !== 'notransition') {
                tapReady = false;
                if (main) {
                    currentAside.addClass('front');
                } else {
                    currentPage.addClass('front');
                }
                if (backwards) {
                    toPage.toggleClass('reverse');
                    fromPage.toggleClass('reverse');
                }

                // Support both transitions and animations
                fromPage[0].addEventListener('webkitTransitionEnd', callback, false);
                fromPage[0].addEventListener('webkitAnimationEnd', callback, false);

                fromPage.addClass(animation + ' out');
                toPage.addClass(animation + ' in current');

                var darkart = 30;
                if (params.heavy && bogomark > 0.1) {
                    darkart = Math.floor(350 * bogomark);
                }
                setTimeout(function() {
                    fromPage.addClass('start');
                    toPage.addClass('start');

                    setTimeout(function() {
                        if ($.isFunction(pagecallback)) {
                            pagecallback();
                        }
                    }, 10);
                }, darkart);
            } else {
                toPage.addClass('current');
                callback();

                if ($.isFunction(pagecallback)) {
                    pagecallback();
                }
            }

            // Define callback to run after animation completes
            function callback(event) {
                if($.support.WebKitAnimationEvent && animation !== 'notransition') {
                    fromPage[0].removeEventListener('webkitTransitionEnd', callback);
                    fromPage[0].removeEventListener('webkitAnimationEnd', callback);
                }

                if (animation && animation !== 'notransition') {
                    toPage.removeClass('start in ' + animation);
                    fromPage.removeClass('start out current ' + animation);
                    if (backwards) {
                        toPage.toggleClass('reverse');
                        fromPage.toggleClass('reverse');
                    }
                    toPage.css('top', 0);
                } else {
                    fromPage.removeClass('current active');
                }

                toPage.trigger('pageAnimationEnd', { direction: 'in', reverse: backwards });
                fromPage.trigger('pageAnimationEnd', { direction: 'out', reverse: backwards });

                clearInterval(hashCheckInterval);
                if (main) {
                    currentPage = toPage;
                    currentAside.removeClass('front');
                } else {
                    currentAside = toPage;
                    currentPage.removeClass('front');
                }

                var $originallink = toPage.data('referrer');
                if ($originallink) {
                    $originallink.unselect();
                }
                lastAnimationTime = (new Date()).getTime();
                tapReady = true;

            };

            return true;
        }

        function getOrientation() {
            return orientation;
        }

        function goBack(param) {
            var to, from;
            if (typeof(param) === 'string' || param instanceof jQuery) {
                /* back compat param */
                to = param;
                from = null;
            } else if (!!param) {
                to = param.to;
                from = param.from;
            }

            // init the param
            if (hist.length <= 1) {
                window.history.go(-2);
            }

            var fromPage;
            var toPage;
            if (!!from) {
                fromPage = findPageFromHistory(from, 0);
            } else {
                fromPage = $.extend({i: 0}, hist[0]);
            }
            if (!fromPage) {
                console.error('History in invalid state or goback is called at the home page.');
                return false;
            }
            if (hist.length > 1) {
                if (!!to) {
                    var myto = to.substring(1); // remove #
                    toPage = findPageFromHistory(myto, fromPage.i+1);
                    if (!toPage) {
                        console.error('Cannot find page "' + myto + '" in the history.');
                        to = null; // reset to to null, trying to recover
                    }
                }
                if (!to) {
                    to = {section: fromPage.section};
                    toPage = findPageFromHistory(to, fromPage.i+1);
                    if (!toPage) {
                        console.error('Cannot find history to go back to. The specified "from" or "to" parameters might be invalid. Or, it has already back to the beginning.');
                        return false;
                    }
                }
                if (toPage.id !== fromPage.id) {
                    var adjustedName = adjustAnimation(fromPage.animation, true);
                    var animationstarted = animatePages({
                        to: toPage.page,
                        from: fromPage.page,
                        animation: adjustedName,
                        pagecallback: function() {
                        $('#' + fromPage.id).trigger('pageout', {hash: '#' + fromPage.id, search: fromPage.search});
                        $('#' + toPage.id).trigger('pageresume', {hash: '#' + toPage.id, search: toPage.search});
                    }});
                    if (animationstarted) {
                        // Remove all pages in front of the target page
                        removePageInHistory(toPage.i, fromPage.i, {section: fromPage.section});
                        $(toPage.id).trigger('pagein', {});
                        $(fromPage.id).trigger('pagesuspense', {});
                    } else {
                        console.error('Could not go back.');
                        return;
                    }
                } else {
                    // branch on href.search (ie, ..?abc=1&ijk=2)
                    if (!match(fromPage.search, toPage.search)) {
                        $('#' + fromPage.id).trigger('pageout', {hash: '#' + fromPage.id, search: fromPage.search});
                        $('#' + toPage.id).trigger('pagein', {hash: '#' + toPage.id, search: toPage.search});
                        removePageInHistory(toPage.i, fromPage.i, {section: fromPage.section});
                    } else {
                        $.fn.unselect();
                        console.error('Target element is the current page.');
                        return false;
                    }
                }
            } else {
                location.hash = '#' + hist[0].id + getSearchString(param.search);
            }
            return publicObj;
        }

        function goTo(param, p2, p3) {
            var toPage, search, animation, reverse;
            if (typeof(param) === 'string' || param instanceof jQuery) { /* back compt hack */
                /* back compat param */
                toPage = param;
                animation = p2;
                reverse = p3;
            } else {
                toPage = param.to;
                search = param.search;
                animation = param.animation;
                reverse = param.reverse;
            }

            if (typeof(toPage) === 'string') {
                nextPage = $(toPage);
                if (nextPage.length < 1) {
                    showPageByHref(toPage, {
                        'animation': animation
                    });
                    return;
                } else {
                    toPage = nextPage;
                }
            }

            var section = toPage.attr('section');
            var criteria = !!section? {section: section}: {section: defaultSection};
            var fromPage = findPageFromHistory(criteria, 0);
            if (!fromPage) {
                console.error('Cannot find source page.');
                return false;
            } else if (toPage[0].id !== fromPage.id) {
                var adjustedName = adjustAnimation(animation, reverse);
                var animationstarted = animatePages({
                  to: toPage,
                  from: fromPage.page,
                  animation: adjustedName,
                  heavy: param.heavy,
                  pagecallback: function() {
                    $('#' + fromPage.id).trigger('pagesuspense', {hash: '#' + fromPage.id, search: fromPage.search});
                    toPage.trigger('pagein', {hash: '#' + toPage.attr('id'), search: param.search});
                }});
                if (animationstarted) {
                    addPageToHistory(toPage, search, adjustedName);

                    return publicObj;
                } else {
                    console.error('Could not animate pages.');
                    return false;
                }
            } else {
                // branch on href.search (ie, ..?abc=1&ijk=2)
                if (!match(fromPage.search, search)) {
                    $('#' + fromPage.id).trigger('pageout', {hash: '#' + fromPage.id, search: fromPage.search});
                    toPage.trigger('pagein', {hash: '#' + toPage.attr('id'), search: param.search});
                    removePageInHistory(fromPage.i, 0, {section: fromPage.section});
                    addPageToHistory(toPage, search, adjustedName);
                } else {
                    $.fn.unselect();
                    console.error('Target element is the current page.');
                    return false;
                }
            }
        }

        function match(apple, orange) {
            var matched = true;
            for(var field in apple) {
                if (apple[field] !== null) {
                    if (apple[field] !== orange[field]) {
                        matched = false;
                        break;
                    }
                } else {
                    if (orange[field] !== null) {
                        matched = false;
                        break;
                    }
                }
            }
            if (matched) {
                for(var field in orange) {
                    if(orange[field] === undefined) {
                        matched = false;
                        break;
                    }
                }
            }
            return matched; // debugger friendliness: give a single exit
        }

        function hashCheck() {
            var curid = currentPage.attr('id');
            if (location.hash != '#' + curid) {
                clearInterval(hashCheckInterval);
                // goBack(location.hash);
            }
            else if (location.hash == '') {
                location.hash = '#' + curid;
            }
        }

        function startHashCheck() {
            clearInterval(hashCheckInterval);
            hashCheckInterval = setInterval(hashCheck, 100);
        }

        function init(options) {
            jQTSettings = $.extend({}, defaults, options);

            // Preload images
            if (jQTSettings.preloadImages) {
                for (var i = jQTSettings.preloadImages.length - 1; i >= 0; i--) {
                    (new Image()).src = jQTSettings.preloadImages[i];
                };
            }
            // Set appropriate icon (retina display stuff is experimental)
            if (jQTSettings.icon || jQTSettings.icon4) {
                var precomposed, appropriateIcon;
                if (jQTSettings.icon4 && window.devicePixelRatio && window.devicePixelRatio === 2) {
                    appropriateIcon = jQTSettings.icon4;
                } else if (jQTSettings.icon) {
                    appropriateIcon = jQTSettings.icon;
                }
                if (appropriateIcon) {
                    precomposed = (jQTSettings.addGlossToIcon) ? '' : '-precomposed';
                    hairExtensions += '<link rel="apple-touch-icon' + precomposed + '" href="' + appropriateIcon + '" />';
                }
            }

            // Set startup screen
            if (jQTSettings.startupScreen) {
                hairExtensions += '<link rel="apple-touch-startup-image" href="' + jQTSettings.startupScreen + '" />';
            }

            // Set viewport
            if (jQTSettings.fixedViewport) {
                hairExtensions += '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0;"/>';
            }

            // Set full-screen
            if (jQTSettings.fullScreen) {
                hairExtensions += '<meta name="apple-mobile-web-app-capable" content="yes" />';
                if (jQTSettings.statusBar) {
                    hairExtensions += '<meta name="apple-mobile-web-app-status-bar-style" content="' + jQTSettings.statusBar + '" />';
                }
            }

            // Attach hair extensions
            if (hairExtensions) {
                $head.prepend(hairExtensions);
            }

        }

        function insertPages(nodes, animation) {
            var targetPage = null;
            $(nodes).each(function(index, node) {
                var $node = $(this);
                if (!$node.attr('id')) {
                    $node.attr('id', 'page-' + (++newPageCount));
                }
                var section = $node.attr('section');
                if (!section) {
                    $node.attr('section', defaultSection);
                }
                $node.children().find('[section~="' + section + '"]').removeClass('missection');
                $node.children().find('[section]:not([section~="' + section + '"])').addClass('missection');

                $body.trigger('pageInserted', {page: $node.appendTo($body)});

                if ($node.hasClass('current') || !targetPage) {
                    targetPage = $node;
                }
            });
            if (targetPage !== null) {
                goTo({ /* do i need to set referrer? */
                    to: '#' + targetPage[0].id,
                    animation: animation
                });
                return targetPage;
            } else {
                return false;
            }
        }

        function updateOrientation() {
            orientation = Math.abs(window.orientation) == 90 ? 'landscape' : 'portrait';
            $body.removeClass('portrait landscape').addClass(orientation).trigger('turn', {orientation: orientation});
        }

        function showPageByHref(href, options) {
            var defaults = {
                data: null,
                method: 'GET',
                animation: null,
                callback: null,
                $referrer: null
            };

            var settings = $.extend({}, defaults, options);

            if (href != '#') {
                tapReady = false;

                $.ajax({
                    url: href,
                    data: settings.data,
                    type: settings.method,
                    success: function (data, textStatus) {
                        var firstPage = insertPages(data, settings.animation);
                        if (firstPage) {
                            if (settings.method == 'GET' && jQTSettings.cacheGetRequests === true && settings.$referrer) {
                                settings.$referrer.attr('href', '#' + firstPage.attr('id'));
                            }
                            if (settings.callback) {
                                settings.callback(true);
                            }
                        } else {
                            tapReady = true;
                        }
                    },
                    error: function (data) {
                        if (settings.$referrer) {
                            settings.$referrer.unselect();
                        }
                        if (settings.callback) {
                            settings.callback(false);
                        }
                        tapReady = true;
                    }
                });
            } else if (settings.$referrer) {
                settings.$referrer.unselect();
            }
        }
        function submitForm(e, callback) {
            var $form = (typeof(e)==='string') ? $(e).eq(0) : (e.target ? $(e.target) : $(e));

            if ($form.length && $form.is(jQTSettings.formSelector)) {
                showPageByHref($form.attr('action'), {
                    data: $form.serialize(),
                    method: $form.attr('method') || "POST",
                    animation: defaultAnimations[0] || null,
                    callback: callback
                });
                return false;
            }
            return true;
        }
        function submitParentForm($el) {
            var $form = $el.closest('form');
            if ($form.length) {
                var evt = $.Event("submit");
                evt.preventDefault();
                $form.trigger(evt);
                return false;
            }
            return true;
        }

        /* -- tag for code merge --
        function supportForAnimationEvents() {
        function supportForCssMatrix() {
        function supportForTouchEvents() {
        function supportForTransform3d() {
        };
        */

        /* -- tag for code merge --
        function tapHandler(e){
        */
        function liveTap(e){
            // Grab the clicked element
            var $el = $(e.currentTarget);

            var anyTouchSelectors = touchSelectors.join(', ');
            if (!$el.is(anyTouchSelectors)) {
              var $link = $(e.target).closest(anyTouchSelectors);

              if ($link.length) {
                  $el = $link;
              } else {
                  console.warn('Not a known node type. type: ' + event.target.nodeName + ' id: ' + event.target.id);
                  return;
              }
            }

            var target = $el.attr('target'),
                hash = $el.attr('hash'),
                search = parseSearch($el.attr('search'));

            if (tapReady == false || !$el.length) {
                console.warn('Not able to tap element.');
                return false;
            }

            if ($el.isExternalLink()) {
                $el.removeClass('active');
                return true;
            }

            // Figure out the animation to use
            var animation = findAnimation(function(candidate) {
                return $el.is(candidate.selector);
            }).name;
            var reverse = $el.hasClass('reverse');

            // Handle supported action type
            if ($el.is(jQTSettings.backSelector)) {
                // User clicked a back button

                // find out the from page
                var from;
                var cur = e.currentTarget;
                while (!!cur.parentNode) {
                    // $.parents('#jqt > *') matchs random, but parents: need to roll our own loop
                    if (cur.parentNode.id === 'jqt') { // found
                        from = cur.id;
                        break;
                    }
                    cur = cur.parentNode;
                }
                goBack({
                  to: hash,
                  from: from
                });
            } else if ($el.is(jQTSettings.submitSelector)) {
                // User clicked or tapped a submit element
                submitParentForm($el);

            } else if (target === '_webapp') {
                // User clicked an internal link, fullscreen mode
                window.location = $el.attr('href');

            } else if ($el.attr('href') === '#' || !$el.attr('href')) {
                // Allow tap on item with no href
                $el.unselect();
                return true;

            } else if (hash && hash !== '#') {
                if ($el.is(jQTSettings.toggleSelector)) {
                    if ($(hash).hasClass('current')) {
                        goBack({
                            to: null,
                            from: hash.substring(1)
                        });
                    } else {
                        goTo({
                            to: $(hash).data('referrer', $el),
                            search: search,
                            animation: animation,
                            reverse: reverse
                        });
                    }
                } else {
                    // Branch on internal or external href
                    goTo({
                        to: $(hash).data('referrer', $el),
                        search: search,
                        animation: animation,
                        reverse: reverse
                    });
                }
                e.preventDefault();

            } else {
                // External href
                $el.addClass('loading');
                showPageByHref($el.attr('href'), {
                    animation: animation,
                    callback: function() {
                        $el.removeClass('loading'); setTimeout($.fn.unselect, 250, $el);
                    },
                    $referrer: $el
                });
            }
            return false;
        }

        /* -- tag for code merge --
        function touchStartHandler(e) {
        */
        function touchstart(e) {
            var $el = null;
            var hovertimeout = null;
            var presstimeout = null;
            var startX, startY, startTime;
            var deltaX, deltaY, deltaT;
            var endX, endY, endTime;
            var swipped = false, tapped = false, moved = false, inprogress = false, pressed = false;

            function bindEvents($el) {
                $el.bind(MOVE_EVENT, handlemove).bind(END_EVENT, handleend);
                if ($.support.touch) {
                    $el.bind(CANCEL_EVENT, handlecancel);
                } else {
                    $(document).bind('mouseout', handleend);
                }
            }

            function unbindEvents($el) {
                $el.unbind(MOVE_EVENT, handlemove).unbind(END_EVENT, handleend);
                if ($.support.touch) {
                    $el.unbind(CANCEL_EVENT, handlecancel);
                } else {
                    $(document).unbind('mouseout', handlecancel);
                }
            }

            function updateChanges() {
                var first = $.support.touch? event.changedTouches[0]: event;
                deltaX = first.pageX - startX;
                deltaY = first.pageY - startY;
                deltaT = (new Date).getTime() - startTime;
            }

            function handlestart(e) {
                inprogress = true, swipped = false, tapped = false,
                moved = false, timed = false, pressed = false;
                startX = $.support.touch? event.changedTouches[0].clientX: event.clientX;
                startY = $.support.touch? event.changedTouches[0].clientY: event.clientY;
                startTime = (new Date).getTime();
                endX = null, endY = null, endTime = null;
                deltaX = 0;
                deltaY = 0;
                deltaT = 0;

                if (!!$el) {
                    $el.removeClass('active');
                    clearTimeout(hovertimeout);
                    pressTimeout(presstimeout);
                }
                $el = $(e.currentTarget);

                // Let's bind these after the fact, so we can keep some internal values
                bindEvents($el);

                setTimeout(function() {
                    handlehover(e);
                }, 50);

                setTimeout(function() {
                  handlepress(e);
                }, 1000);

            };

            function handlemove(e) {
                updateChanges();

                if (!inprogress)
                  return;

                var absX = Math.abs(deltaX);
                var absY = Math.abs(deltaY);

                if (absX >= 1 || absY >= 1) {
                    moved = true;
                }
                if (absY <= 5) {
                    if (absX > (3 * absY) && (absX > 10) && deltaT < 1000) {
                        inprogress = false;
                        $el.removeClass('active');
                        unbindEvents($el);

                        swipped = true;
                        $el.trigger('swipe', {direction: (deltaX < 0) ? 'left' : 'right', deltaX: deltaX, deltaY: deltaY });
                    }
                } else {
                    // moved too much, can't swipe anymore
                    inprogress = false;
                    $el.removeClass('active');
                    unbindEvents($el);
                }
            };

            function handleend(e) {
                updateChanges();
                var absX = Math.abs(deltaX);
                var absY = Math.abs(deltaY);

                inprogress = false;
                unbindEvents($el);
                if (!tapped && (absX <= 1 && absY <= 1)) {
                    tapped = true;
                    setTimeout(function() {
                      $el.trigger('tap');
                    }, 10); /* give a chance other touch to end */
                    setTimeout(function() {
                      $el.removeClass('active');
                  }, 1000);
                } else {
                    $el.removeClass('active');
                    e.preventDefault();
                }
            };

            function handlecancel(e) {
                inprogress = false;
                $el.removeClass('active');
                unbindEvents();
            };

            function handlehover(e) {
                timed = true;
                if (tapReady) {
                    if (tapped) {
                        // flash the selection
                        $el.addClass('active');
                        hovertimeout = setTimeout(function() {
                            $el.removeClass('active');
                        }, 1000);
                    } else if (inprogress && !moved) {
                        $el.addClass('active');
                    }
                }
            };

            function handlepress(e) {
              if (inprogress && !tapped && !moved) {
                pressed = true;
                tapped = true;
                $el.trigger('press');
              }
            }

            handlestart(e);

        }; // End touch handler

        // Utility
        var BogoMips = new function() {
          this.benchmark = function() {
              var start = new Date().getTime();
              for (var i=0; i<= 200000; i++) {
                  var a = 1000 / 7 * 11 / 13;
              }
              var end = new Date().getTime();
              var result = (end - start) / 50;
              return result;
          }; /* iPhone 3GS ~1, iPad G1 ~0.4 */
          return this;
        };

        // Get the party started
        init(options);

        // Document ready stuff
        $(document).ready(function() {

            // Store some properties in the jQuery support object
            $.support.WebKitCSSMatrix = (typeof WebKitCSSMatrix != "undefined");
            $.support.touch = (typeof Touch != "undefined");
            $.support.WebKitAnimationEvent = (typeof WebKitTransitionEvent != "undefined");
            $.support.wide = (window.screen.width >= 768);

            // Public jQuery Fns
            $.fn.isExternalLink = function() {
                var $el = $(this);
                return ($el.attr('target') == '_blank' || $el.attr('rel') == 'external' || $el.is('input[type="checkbox"], input[type="radio"], a[href^="http://maps.google.com"], a[href^="mailto:"], a[href^="tel:"], a[href^="javascript:"], a[href*="youtube.com/v"], a[href*="youtube.com/watch"]'));
            };
            $.fn.swipe = function(fn) {
                if ($.isFunction(fn)) {
                    return $(this).live('swipe', fn);
                } else {
                    return $(this).trigger('swipe');
                }
            };
            $.fn.tap = function(fn) {
                if ($.isFunction(fn)) {
                    var tapEvent = 'tap';
                    return $(this).live(tapEvent, fn);
                } else {
                    return $(this).trigger('tap');
                }
            };
            $.fn.unselect = function(obj) {
                if (obj) {
                    obj.removeClass('active');
                } else {
                    $('.active').removeClass('active');
                }
            };

            // Add extensions
            for (var i=0, max=extensions.length; i < max; i++) {
                var fn = extensions[i];
                if ($.isFunction(fn)) {
                    $.extend(publicObj, fn(publicObj));
                }
            }

            // initialize animations
            initAnimations();

            // node type selector
            for (var i in actionNodeTypes) {
              var name = actionNodeTypes[i];
              var selector = jQTSettings[name + 'Selector'];
              if (typeof(selector) == 'string' && selector.length > 0) {
                touchSelectors.push(selector);
              } else {
                console.warn('invalid selector for nodetype: ' + name);
              }
            }
            $(touchSelectors.join(', ')).live('click', liveTap);
            $(touchSelectors.join(', ')).css('-webkit-touch-callout', 'none');
            $(touchSelectors.join(', ')).css('-webkit-user-drag: none', 'none');
            $(document).live('touchmove', function(e) { e.preventDefault(); });

            // listen to touch events
            // performance critical to scroll
            var tapSelectors = [];
            var swipeSel = jQTSettings['swipeable' + 'Selector'];
            if (typeof(swipeSel) == 'string' && swipeSel.length > 0) {
              tapSelectors.push(swipeSel);
            }
            var activableSel = jQTSettings['activable' + 'Selector'];
            if (typeof(activableSel) == 'string' && activableSel.length > 0) {
              tapSelectors.push(activableSel);
            }
            var tapableSel = jQTSettings['tapable' + 'Selector'];
            if (typeof(tapableSel) == 'string' && tapableSel.length > 0) {
              tapSelectors.push(tapableSel);
            }
            $(tapSelectors.join(', ')).live(START_EVENT, touchstart);
            $(tapSelectors.join(', ')).css('-webkit-touch-callout', 'none');

            // other settings
            $body = $('#jqt');
            if ($body.length === 0) {
                console.warn('Could not find an element with the id "jqt", so the body id has been set to "jqt". This might cause problems, so you should prolly wrap your panels in a div with the id "jqt".');
                $body = $('body').attr('id', 'jqt');
            }


            if (jQTSettings.fullScreenClass && window.navigator.standalone == true) {
                $body.addClass(jQTSettings.fullScreenClass + ' ' + jQTSettings.statusBar);
            }

            // Create custom live events
            $body
                .bind('orientationchange', updateOrientation)
                .trigger('orientationchange')
                .submit(submitForm);

            if (jQTSettings.useFastTouch && $.support.touch) {
                $body.click(function(e) {
                    var timeDiff = (new Date()).getTime() - lastAnimationTime;
                    if (timeDiff > tapBuffer) {
                        var $el = $(e.target);

                        if ($el.isExternalLink()) {
                            return true;
                        }
                    }

                    // return false;   // issue 405: http://code.google.com/p/jqtouch/issues/detail?id=405
                });

                // This additionally gets rid of form focusses
                $body.mousedown(function(e) {
                    var timeDiff = (new Date()).getTime() - lastAnimationTime;
                    if (timeDiff < tapBuffer) {
                        return false;
                    }
                });
            }

            // handling split screen for wider device (such as iPad)
            splitscreenmode = $.support.wide & $body.hasClass('splitscreen');
            if (splitscreenmode) {
                var $aside = $('#jqt > [section="aside"]');
                if ($aside.length > 0) {
                    if ($($aside.filter('.current').length != 0)) {
                      currentAside = $($($aside.filter('.current:first')));
                      $aside.removeClass('current');
                    } else {
                      currentAside = $aside.filter(':first');
                    }
                    addPageToHistory(currentAside);
                }
                defaultSection = "main";
                $('#jqt > [section!="aside"]').attr("section", defaultSection);
            } else {
                defaultSection = "full";
                $('#jqt > *').attr("section", defaultSection);
            }

            // Make sure exactly one child of body has "current" class
            if ($('#jqt > .current').length == 0) {
                currentPage = $('#jqt > *:first');
            } else {
                currentPage = $('#jqt > .current:first');
                $('#jqt > .current').removeClass('current');
            }
            if (currentAside.length != 0) {
                currentAside.addClass('current');
            }

            // adjust visibiliy of elements
            $.each(['full', 'main', 'aside'], function(i, section) {
                var $section = $('#jqt > [section="' + section + '"]');
                $section.children().find('[section~="' + section + '"]').removeClass('missection');
                $section.children().find('[section]:not([section~="' + section + '"])').addClass('missection');
            });

            bogomark = Math.max(0.1, Math.min(1, BogoMips.benchmark()));

            // Go to the top of the "current" page
            $(currentPage).addClass('current');
            addPageToHistory(currentPage);
            setTimeout(function(){window.scrollTo(0, 1);}, 1000);
            startHashCheck();
        });

        // Expose public methods and properties
        publicObj = {
            getOrientation: getOrientation,
            goBack: goBack,
            goTo: goTo,
            submitForm: submitForm
        };

        return publicObj;
    };

    // Extensions directly manipulate the jQTouch object, before it's initialized.
    $.jQTouch.prototype.extensions = [];
    $.jQTouch.addExtension = function(extension) {
        $.jQTouch.prototype.extensions.push(extension);
    };

})(jQuery);
