[![Build Status](https://travis-ci.org/sblask/firefox-bookmark-dial.svg?branch=master)](https://travis-ci.org/sblask/firefox-bookmark-dial)

firefox-bookmark-dial
=====================

Replaces the
[default New Tab page](https://support.mozilla.org/en-US/kb/about-tiles-new-tab)
and displays the contents of a bookmark folder including a thumbnail instead of
frequently visited sites, suggestions and sponsored links every time you open a
new tab.  The homepage is also replaced unless you choose not to in the
add-on's preferences.

Features
--------

Thumbnails are arranged and sized(up to a maximum size) to be as big as
possible. They are auto-generated when adding a new bookmark or choosing a
different folder, but can also be refreshed manually.

You can add, edit and remove bookmarks through the context menu(see screenshots
for more information). Use drag and drop to re-order bookmarks.

You can also set a custom css file in the add-on's preferences to
change the style. Note that it will replace, not complement the
[default one](https://github.com/sblask/firefox-bookmark-dial/blob/master/data/dial.css)
so you should use that one as a starting point.

This add-on is developed using the
[Mozilla Add-on SDK](https://developer.mozilla.org/en-US/Add-ons/SDK).

Known Issues
------------

   - Adding or changing bookmarks/folders outside of Bookmark Dial will not be visible unless you `Refresh Bookmarks`(see context menu) or restart Firefox.
   - Thumbnail generation is not "quiet" if you are using Firefox 41 or lower. While generating the thumbnail for a Youtube video page for example you might hear the video playing for a few seconds. From Firefox 42, the thumbnail generation happens in a [mute tab](https://support.mozilla.org/en-US/kb/mute-noisy-tabs-firefox)

Possible Improvements
---------------------

   - Use file storage instead of [simple storage](https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/simple-storage) to allow for higher resolution and more thumbnails(current limit is around 100)
   - Support adding/aditing a bookmark's keyword(requires a [different API](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/Places/Using_the_Places_keywords_API))
   - Thumbnail generation adds entries to the history, maybe this can be avoided?
   - Try [React](https://facebook.github.io/react/) for rendering which might increase performance

Similarities to other add-ons
-----------------------------

This is one of the many "speed dial" extensions. Most of them do not build on
top of Firefox functionality, have their own backends and do not allow for
using Firefox' bookmarks(which has sync already included). The only ones I know
that do are:

   - [Fast Dial](https://addons.mozilla.org/en-US/firefox/addon/fast-dial/)
   - [ViewMarks](https://addons.mozilla.org/en-US/firefox/addon/viewmarks/)

However, they did not work as good as I would have liked(I was particularly
annoyed by having to choose the thumbnail size manually) and did not allow for
easy contribution to their projects. Bookmark Dial is aimed at fixing these
issues.

Feedback
--------

You can report bugs or make feature requests on
[Github](https://github.com/sblask/firefox-bookmark-dial).

Patches are welcome.
