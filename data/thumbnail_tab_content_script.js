/* globals document */

const WINDOW_WIDTH = 1024;
const THUMBNAIL_WIDTH = 600;


// make sure body is on the left
document.body.style.margin = 0;
// cut off as much empty space as possible
document.body.style.maxWidth = WINDOW_WIDTH + 'px';

// scale to fit the thumbnail width
let scale = THUMBNAIL_WIDTH / document.body.clientWidth;
document.body.style.transform = 'scale(' + scale + ')';
document.body.style.transformOrigin = '0 0 0';
// set width explicitely as otherwise the scale is off in some cases
document.body.style.width = document.body.clientWidth + 'px';
