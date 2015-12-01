const WINDOW_WIDTH = 1024;

const bodyStyle = document.body.style;
const bodyComputedStyle = document.defaultView.getComputedStyle(document.body, null);
const htmlStyle = document.getElementsByTagName("html")[0].style;

// need to set height explicitly as applying a transform sometimes lead to height 0
htmlStyle.minHeight = WINDOW_WIDTH + "px";
bodyStyle.minHeight = WINDOW_WIDTH + "px";

// fix bad overflow on some pages
bodyStyle.borderTop = "1px solid transparent";

// make sure body is on the left
bodyStyle.margin = 0;

// base width only on min and max
bodyStyle.width = "auto";

// cut off as much empty space as possible
bodyStyle.maxWidth = WINDOW_WIDTH + "px";

// do not always set min width as a narrow window might give us a mobile optimized view
const minWidth = parseInt(bodyComputedStyle.getPropertyValue("min-width").replace("px", ""));
if (minWidth > 1024) {
    bodyStyle.minWidth = WINDOW_WIDTH + "px";
}

// scale to fit the thumbnail width
const calculatedWidth = parseInt(bodyComputedStyle.getPropertyValue("width").replace("px", ""));
const scale = self.options.THUMBNAIL_WIDTH / calculatedWidth;
bodyStyle.transform = "scale(" + scale + ")";
bodyStyle.transformOrigin = "0 0 0";
