[![Build Status](https://travis-ci.org/sblask/webextension-bookmark-dial.svg?branch=master)](https://travis-ci.org/sblask/webextension-bookmark-dial)

Bookmark dial
=============

Displays the contents of a bookmark folder including a thumbnail when you start
the browser and open a new tab (instead of frequently visited sites,
suggestions and sponsored links). Similar extensions call this speed dial. In
most cases they do not use bookmarks and/or require you to manually tweak
settings to change the layout of the thumbnails.

Bookmark Dial arranges and sizes (up to a maximum size) the thumbnails to be as
big as possible by default. As a bookmark folder is used, sync comes with your
browser and you can use the usual keyboard shortcuts, menu entries and buttons
for bookmark handling to add, edit and delete dial items.

Thumbnails are generated from a snapshot of the visible area of a webpage that
is taken the first time a bookmark from the configured bookmark folder is open
in the currently active tab. There is also a button in the popup opened from
the toolbar icon that allows you to create a new snapshot (disabled for unknown
URLs). The latter allows you to capture the part of a webpage that you want as
you can scroll and resize the window before taking the snapshot.

Getting Started
---------------

Configure the bookmark folder and check available settings in the popup opened
from the toolbar icon or from the extension page in your browser's extension
manager. Open a new tab.

Known Issues
------------

Color chooser and file chooser close the popup. To change settings using them,
go to the extension page in your browser's extension manager.

Feedback
--------

You can report bugs or make feature requests on
[Github](https://github.com/sblask/webextension-bookmark-dial).

Patches are welcome.
