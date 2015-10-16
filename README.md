[![Build Status](https://travis-ci.org/sblask/firefox-bookmark-dial.svg?branch=master)](https://travis-ci.org/sblask/firefox-bookmark-dial)

# firefox-bookmark-dial
Replaces the [default New Tab
page](https://support.mozilla.org/en-US/kb/about-tiles-new-tab) and displays
the contents of a bookmark folder instead of frequently visited sites,
suggestions and sponsored links.

This makes it one of the many "speed dial" extensions. Most of them do not
build on top of Firefox functionality and have their own backends and do not
allow for using Firefox' bookmarks(which has sync already included). The only
ones I know that do are:

   - [Fast Dial](https://addons.mozilla.org/en-US/firefox/addon/fast-dial/)
   - [ViewMarks](https://addons.mozilla.org/en-US/firefox/addon/viewmarks/)

However, they did not work as good as I would have liked and did not allow for
easy contribution to their projects. Bookmark Dial is aimed at fixing these
issues.

The thumbnails are always arranged and sized(up to a maximum size to save
storage space) to fill a maximum of space.

Most options are accessible through the context menu(see screenshots for more
information). You can also set a custom css file in the add-on's preferences to
change the style. Note that it will replace, not complement the [default
one](https://github.com/sblask/firefox-bookmark-dial/blob/master/data/dial.css)
so you should use that one as a starting point.

Adding or changing bookmarks/folders outside of Bookmark Dial will not be
visible unless you `Refresh Bookmarks`(see context menu) or restart Firefox.
