# The Dijit CheckBox Tree

<div>
	<img src="https://github.com/pjekel/cbtree/wiki/images/mega-logo-64.png" />
</div>

The dijit CheckBox Tree, github project [cbtree](https://github.com/pjekel/cbtree),
is a dijit widget extending the dijit/Tree. The CheckBox Tree, stores and associated
models are highly configurable providing support for, amongst others:

* Multi state checkboxes (checked/unchecked/mixed).
* Parent-Child checkbox relationship.
* Read-Only checkboxes
* Tree Styling and Custom Icons

All dijit CheckBox Tree, model and store modules are fully AMD compliant, the
CheckBox Tree comes with a set of extensions allowing the user to enhance and
programmatically control every aspect of the tree. All extensions are optional
therefore, if the user does not require the functionality they do not need to be
loaded:

1. [Tree Styling](https://github.com/pjekel/cbtree/wiki/Tree-Styling)
2. [Store Model extension](https://github.com/pjekel/cbtree/wiki/Model-Extension)
4. [Store CORS support](https://github.com/pjekel/cbtree/wiki/Store#wiki-cors-support)
3. [Store Ancestry](https://github.com/pjekel/cbtree/wiki/Ancestry-Extension)

### The CheckBox
The use of checkboxes is configurable and enabled by default. The CheckBox Tree
uses it own so called multi-state checkbox to represent the checked state of a
data item. However, the user can substitute the multi-state checkbox with any
widget capable of representing a 'checked' state. Whether or not multi-state is
allowed, or dual state only, depends on the store model configuration.

If however, you elect to disable the checkbox feature the CheckBox Tree acts
like the default dijit Tree but still offering some of the additional benifits
like the ability to hide branch and/or leaf icons and all other styling features.

### The Stores
Starting with release **_cbtree-v09-3.0_** the CheckBox Tree package includes a
new set of [stores](https://github.com/pjekel/cbtree/wiki/Store) implementing the
`cbtree/store/api/Store` API. The cbtree store API is an enhancement to the
default `dojo/store/api/Store` API. The following stores are included:

* Memory
* Hierarchy
* ObjectStore
* FileStore

All stores can also be used stand-alone, independent of the CheckBox Tree and
models.

### Parent-Child Relationship
The CheckBox Tree comes with three store models, one of the Store Model features
is the ability to maintain a parent-child relationship.
The parent checked state, represented as a tree branch checkbox, is the composite
state of all its child checkboxes. For example, if the child checkboxes are either
all checked or unchecked the parent will get the same checked or unchecked state.
If however, the children checked state is mixed, that is, some are checked while
others are unchecked, the parent will get a so called 'mixed' state.

### CheckBox Tree Styling
The Tree Styling extension allows you to dynamically manage the tree styling 
on a per data item basis. Using the simple to use accessor *set()* you can alter
the icon, label and row styling for the entire tree or just a single data item.
For example: `set("iconClass", "myIcon", item)` changes the css icon class associated
with all tree node instances of a data item, or if you want to change the label
style:

    // As a callback of a CheckBox click event
    function checkBoxClicked (item, nodeWidget, evt) {
      if (nodeWidget.get("checked")) {
        tree.set("labelStyle", {color:"red"}, item);
      }
    }

For a detailed description of [Tree Styling](https://github.com/pjekel/cbtree/wiki/Tree-Styling)
Wiki pages.

<h2 id="checkbox-tree-demos">CheckBox Tree Demos</h2>
The cbtree packages comes with a set of demos each demonstrating the CheckBox
Tree features and capabilities. Two comprehensive demos are available online:

* <a href="http://thejekels.com/cbtree/demos" target="_blank">Live CheckBox Tree demo</a>
* <a href="http://thejekels.com/cbtree/demos/ArcGIS.php" target="_blank">ArcGIS demo with CheckBox Tree</a>

In addition, the CheckBox Tree [wiki](https://github.com/pjekel/cbtree/wiki) has
several tutorials using, for example, the popular ArcGIS API for JavaScript.

<h2 id="basics">CheckBox Tree Documentation</h2>
As of release **_cbtree-v09-3.0_** all documentation is available online at the
[cbtree Wiki](https://github.com/pjekel/cbtree/wiki) section and is no longer
included in the distribution.

<h2 id="checkbox-tree-downloads">Checkbox Tree Downloads</h2>
The github repository **cbtree** represents the current development stage of the
CheckBox Tree project, also known as the incubation stage. It may contain new,
untested and undocumented features that are not included in any stable build. 
No warrenty is provided that such features will be included in future releases. 

To get the latest stable version please visit the [download](http://thejekels.com/download/cbtree)
section:

<table>
	<thead>
	  <tr>
	    <th style="width:15%;">Version</th>
	    <th style="width:15%;">Date</th>
	    <th style="width:10%;">dojo</th>
	    <th>Description</th>
	  </tr>
	</thead>
  <tbody>
    <tr style="vertical-align:top">
      <td>cbtree-v09.3-0</td>
      <td>May-03 2013</td>
      <td>1.8 - 1.9</td>
      <td>
	New stores implementing the <a href="https://github.com/pjekel/cbtree/wiki/Store-API">cbtree/store/api/Store</a> API.<br/>
	New <a href="https://github.com/pjekel/cbtree/wiki/Model">models</a> for the new cbtree stores<br/>
	New demos combining cbtree with the ArcGIS 3.3 API<br/>
	Enhanced Tree Styling<br/>
	and much more...
      </td>
    </tr>
    <tr style="vertical-align:top">
      <td>cbtree-v09.2-0</td>
      <td>Aug-15 2012</td>
      <td>1.8</td>
      <td>
	Updated The CheckBox Tree to work with dojo 1.8.<br/>
	Official release File Store and File Store Model.<br/>
	Per store item read-only checkboxes.<br/>
	New declarative demos added.<br/>
	Updated documentation.<br/>
      </td>
    </tr>
    <tr style="vertical-align:top">
      <td>cbtree-v09.1-0</td>
      <td>Aug-06 2012</td>
      <td>1.7</td>
      <td>
	A new File Store and File Store Model have been added.<br/>
	New and updated demos.<br/>
	Updated documentation.<br/>
	Minor software updates.
      </td>
    </tr>
    <tr style="vertical-align:top">
      <td>cbtree-v09.0-0</td>
      <td>May-20 2012</td>
      <td>1.7</td>
      <td>Initial cbtree-AMD release</td>
    </tr>
  </tbody>
</table>

