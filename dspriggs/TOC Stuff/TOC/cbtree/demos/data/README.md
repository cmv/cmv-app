This directory contains a set of demos of the CheckBox Tree (cbTree).
The following are examples of the cbtree with a dojo/data/ItemFile store

* tree00.html - Basic CheckBox Tree using an in memory JSON object to create the store.
* tree00-decl.html - Declarative example of tree00.html
* tree01.html - Demostrate the checkboxes and the tree styling API
* tree01-decl.html - Declarative example of tree01.html
* tree02.html - Custom Icons at different indent level using the tree 'icon' property.
* tree02-decl.html - Declarative example of tree02.html
* tree03.html - Demostrate the Tree Model API features.
* tree04.html - Use third party widget instead of the cbtree Multi State CheckBox
* tree04-decl.html - Declarative example of tree04.html
* tree05.html - Use ToggleButton widget instead of the cbtree Multi State CheckBox

***NOTE:*** The following three examples require PHP support on your server. In addition, tree12.html
requires DOJOX to be installed.

* tree10.html - A CheckBox Tree using the cbtree File Store.
* tree11.html - CheckBox Tree using the cbtree File Store and Fancy Icons.
* tree12.html - Windows style explorer using the cbtree File Store and Fancy Icons.

***IMPORTANT***
The use of the dojo/data/ItemFileReadStore, dojo/data/ItemFileWriteStore and the associated
models in the cbtree/models directory has been <strong>deprecated</strong>.
Support for dojo/data and cbtree/data stores and cbtree/models models will be removed with
the release of dojo 2.0

Going forward use the stores and models in the cbtree/store and cbtree/model directories.