[![Build Status](https://travis-ci.org/sblask/webextension-bookmark-dial.svg?branch=master)](https://travis-ci.org/sblask/webextension-bookmark-dial)

Bookmark dial
=============

Displays the contents of a bookmark folder including a thumbnail when you start
the browser and open a new tab (instead of frequently visited sites,
suggestions and sponsored links). Similar extensions call this speed dial. In
most cases they do not use bookmarks and/or require you to manually tweak
settings to change the layout of the thumbnails.

By default, Bookmark Dial arranges and sizes (up to a maximum size) the
thumbnails to be as big as possible while covering as much space as possible.
As a bookmark folder is used, sync comes with your browser and you can use the
usual keyboard shortcuts, menu entries and buttons for bookmark handling to
add, edit and delete dial items. You can drag and drop thumbnails to change the
order.

Thumbnails are generated from a snapshot of the visible area of a bookmarked
webpage. If a bookmark has no thumbnail yet, a snapshot is taken automatically
when the bookmark is opened in the currently active tab or if it is loaded in a
background tab and the tab becomes active. To ensure the best result, the
generation starts when the page has completed loading. There is also a button
in the popup opened from the toolbar icon that allows you to create a new
snapshot (disabled for URLs that do not belong to bookmarks from the configured
folder). The latter allows you to capture the part of a webpage that you want
as you can scroll and resize the window before taking the snapshot.

Getting Started
---------------

Configure the bookmark folder and check available settings in the popup opened
from the toolbar icon or from the extension page in your browser's extension
manager. Open a new tab.

Customisation
-------------

You can set a background colour and/or image (including sizing) in the
preferences. There is also a text field to provide custom CSS.

Known Issues
------------

 - if a bookmark redirects to another page, thumbnail generation will fail as
   the URL of the bookmark will not match the page in the currently active tab
 - color chooser and file chooser close the popup - to change settings using
   them, go to the extension page in your browser's extension manager
 - Firefox:
    - the location bar is not cleared when a new tab is opened - this should be
      fixed in Firefox 57
      (https://bugzilla.mozilla.org/show_bug.cgi?id=1372996)

Feedback
--------

You can report bugs or make feature requests on
[Github](https://github.com/sblask/webextension-bookmark-dial).

Patches are welcome.
