/* globals document */

const WINDOW_WIDTH = 1024;
const THUMBNAIL_WIDTH = 600;

let bodyStyle = document.body.style;
let htmlStyle = document.getElementsByTagName("html")[0].style;

// need to set height explicitly as applying a transform sometimes lead to height 0
htmlStyle.minHeight = "700px";
bodyStyle.minHeight = "700px";

// make sure body is on the left
bodyStyle.margin = 0;
// cut off as much empty space as possible
bodyStyle.maxWidth = WINDOW_WIDTH + 'px';

// scale to fit the thumbnail width
let scale = THUMBNAIL_WIDTH / document.body.clientWidth;
bodyStyle.transform = 'scale(' + scale + ')';
bodyStyle.transformOrigin = '0 0 0';
// set width explicitely as otherwise the scale is off in some cases
bodyStyle.width = document.body.clientWidth + 'px';
