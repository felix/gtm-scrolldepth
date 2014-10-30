
var startTime = +new Date;

var cache = [],
documentElement = document.documentElement,
lastPixelDepth = 0,

options = {
    minHeight: window.gtm_scroll_minheight || 0,
    elements: window.gtm_scroll_elements || [],
    percentage: (typeof window.gtm_scroll_percentage !== 'undefined' && window.gtm_scroll_percentage) || true,
    userTiming: (typeof window.gtm_scroll_usertiming !== 'undefined' && window.gtm_scroll_usertiming) || true,
    pixelDepth: (typeof window.gtm_scroll_pixeldepth !== 'undefined' && window.gtm_scroll_pixeldepth) || true,
    nonInteraction: (typeof window.gtm_scroll_noninteraction !== 'undefined' && window.gtm_scroll_noninteraction) || true
};

function calculateMarks(docHeight) {
    return {
        '25%' : parseInt(docHeight * 0.25, 10),
        '50%' : parseInt(docHeight * 0.50, 10),
        '75%' : parseInt(docHeight * 0.75, 10),
        // 1px cushion to trigger 100% event in iOS
        '100%': docHeight - 5
    };
}

function checkMarks(marks, scrollDistance, timing) {
    // Check each active mark
    for ( key in marks ) {
        if (cache.indexOf(key) === -1 && scrollDistance >= marks[key] ) {
            sendEvent('Percentage', key, scrollDistance, timing);
            cache.push(key);
        }
    }
}

function checkElements(elements, scrollDistance, timing) {
    for (index = 0; index < elements.length; ++index) {
        if (cache.indexOf(elements[index]) === -1 && elements[index].length ) {
            if ( scrollDistance >= elements[index].offset().top ) {
                sendEvent('Elements', elements[index], scrollDistance, timing);
                cache.push(elements[index]);
            }
        }
    }
}

function rounded(scrollDistance) {
    // Returns String
    return (Math.floor(scrollDistance/250) * 250).toString();
}

function getDocumentHeight() {
    return Math.max(
        document.body.scrollHeight || 0, documentElement.scrollHeight || 0,
        document.body.offsetHeight || 0, documentElement.offsetHeight || 0,
        document.body.clientHeight || 0, documentElement.clientHeight || 0
    );
}

function getWindowHeight() {
    return window.innerHeight || documentElement.clientHeight ||
        document.body.clientHeight || 0;
}

function getScrollDistance() {
    return window.pageYOffset || document.body.scrollTop ||
        documentElement.scrollTop || 0;
}

/*
* Throttle function borrowed from:
* Underscore.js 1.5.2
* http://underscorejs.org
* (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
* Underscore may be freely distributed under the MIT license.
*/
function throttle(func, wait) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    var later = function() {
        previous = new Date;
        timeout = null;
        result = func.apply(context, args);
    };
    return function() {
        var now = new Date;
        if (!previous) previous = now;
            var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0) {
            clearTimeout(timeout);
            timeout = null;
            previous = now;
            result = func.apply(context, args);
        } else if (!timeout) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };
}

function sendEvent(action, label, scrollDistance, timing) {

    if (typeof dataLayer !== "undefined" && typeof dataLayer.push === "function") {
        dataLayer.push({'event': 'ScrollDistance', 'eventCategory': 'Scroll Depth', 'eventAction': action, 'eventLabel': label, 'eventValue': 1, 'eventNonInteraction': options.nonInteraction});

        if (options.pixelDepth && arguments.length > 2 && scrollDistance > lastPixelDepth) {
            lastPixelDepth = scrollDistance;
            dataLayer.push({'event': 'ScrollDistance', 'eventCategory': 'Scroll Depth', 'eventAction': 'Pixel Depth', 'eventLabel': rounded(scrollDistance), 'eventValue': 1, 'eventNonInteraction': options.nonInteraction});
        }

        if (options.userTiming && arguments.length > 3) {
            dataLayer.push({'event': 'ScrollTiming', 'eventCategory': 'Scroll Depth', 'eventAction': action, 'eventLabel': label, 'eventTiming': timing});
        }

    } else {
        if (typeof ga === "function") {

            ga('send', 'event', 'Scroll Depth', action, label, 1, {'nonInteraction': options.nonInteraction ? 1 : 0});

            if (options.pixelDepth && arguments.length > 2 && scrollDistance > lastPixelDepth) {
                lastPixelDepth = scrollDistance;
                ga('send', 'event', 'Scroll Depth', 'Pixel Depth', rounded(scrollDistance), 1, {'nonInteraction': options.nonInteraction ? 1 : 0});
            }

            if (options.userTiming && arguments.length > 3) {
                ga('send', 'timing', 'Scroll Depth', action, timing, label);
            }

        }

        if (typeof _gaq !== "undefined" && typeof _gaq.push === "function") {

            _gaq.push(['_trackEvent', 'Scroll Depth', action, label, 1, options.nonInteraction]);

            if (options.pixelDepth && arguments.length > 2 && scrollDistance > lastPixelDepth) {
                lastPixelDepth = scrollDistance;
                _gaq.push(['_trackEvent', 'Scroll Depth', 'Pixel Depth', rounded(scrollDistance), 1, options.nonInteraction]);
            }

            if (options.userTiming && arguments.length > 3) {
                _gaq.push(['_trackTiming', 'Scroll Depth', action, timing, label, 100]);
            }
        }
    }
}


window.onload = function () {
    if (options.percentage) {
        // Establish baseline (0% scroll)
        sendEvent('Percentage', 'Baseline');
    } else if (options.elements) {
        sendEvent('Elements', 'Baseline');
    }

    // Return early if document height is too small
    if ( getDocumentHeight() >= options.minHeight ) {
        window.onscroll = throttle(function() {
                var docHeight = getDocumentHeight(),
                winHeight = getWindowHeight(),
                scrollDistance = getScrollDistance() + winHeight,

                // Recalculate percentage marks
                marks = calculateMarks(docHeight),

                // Timing
                timing = +new Date - startTime;

                // If all marks already hit, unbind scroll event
                if (cache.length >= 4 + options.elements.length) {
                    //$window.off('scroll.scrollDepth');
                    return;
                }

                // Check specified DOM elements
                if (options.elements) {
                    checkElements(options.elements, scrollDistance, timing);
                }

                // Check standard marks
                if (options.percentage) {
                    checkMarks(marks, scrollDistance, timing);
                }
            }, 500);
    }
}
