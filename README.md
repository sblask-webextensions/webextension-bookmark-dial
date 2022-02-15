[![Build Status](https://travis-ci.org/sblask/webextension-bookmark-dial.svg?branch=master)](https://travis-ci.org/sblask/webextension-bookmark-dial)

Bookmark dial
=============

Displays the contents of a bookmark folder including a thumbnail when you start
the browser and open a new tab (instead of frequently visited sites,
suggestions and sponsored links).

Similar extensions call this speed dial. In many cases there is a third party
web service behind those extensions and your data is stored remotely. Bookmark
Dial on the other hand uses only browser capabilities (meaning you can use the
usual keyboard shortcuts, menu entries and buttons for bookmark handling to
add, edit and delete dial items) and your data only leaves your computer if you
enable browser sync.

Thumbnails
----------

By default, thumbnails are arranged and sized (up to a maximum size) to be as
big as possible while covering as much space as possible. You can drag and drop
them to change the order.

They are generated from a snapshot of the visible area of a bookmarked webpage
and stored in the browser. If there is no thumbnail available yet a snapshot is
taken once the page has been loaded in the currently active tab. There is also
a button in the popup opened from the toolbar icon to create a new snapshot.
That allows you to arrange the visible area of the page by scrolling or
resizing the window to capture exactly what you want.

Getting Started
---------------

Select a bookmark folder and check available settings in the popup opened
from the toolbar icon or from the extension page in your browser's extension
manager. Open a new tab.

Customisation
-------------

You can set a background colour and/or image (including sizing) in the
preferences. There is also a text field to provide custom CSS.

Known Issues
------------

- if a bookmark redirects to another page, no thumbnail will be generated as
  the its URL will not match the page in the currently active tab
- special URLs like about: chrome: file: etc. can cause problems due to
  limitations in the webextension API
- Firefox:
  - color chooser and file chooser close the popup - to change settings using
    them, go to the extension page in your browser's extension manager
  - compatibility issues with [New Tab Override
    extension](https://addons.mozilla.org/en-US/firefox/addon/new-tab-override/)

Privacy Policy
--------------

This extension does not collect or send data of any kind to third parties.

Feedback
--------

You can report bugs or make feature requests on
[Github](https://github.com/sblask/webextension-bookmark-dial)

Patches are welcome.
