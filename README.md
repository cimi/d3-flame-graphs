## What is this?

This is a d3.js plugin that renders flame graphs from hierarchical data.

> Flame graphs are a visualization of profiled software, allowing the most frequent code-paths to be identified quickly and accurately. They can be generated using my open source programs on [github.com/brendangregg/FlameGraph](http://github.com/brendangregg/FlameGraph), which create interactive SVGs. See the Updates section for other implementations.
>
> -- [Flame Graphs](http://www.brendangregg.com/flamegraphs.html), <cite>Brendan Gregg</cite>

## [See the demo!](http://cimi.github.io/d3-flame-graphs/)

[![Flame Graph Representation](flame-graph-screenshot.png?raw=true "See the demo!")](http://cimi.github.io/d3-flame-graphs/)

## Build status
[![Circle CI](https://circleci.com/gh/cimi/d3-flame-graphs/tree/master.svg?style=svg)](https://circleci.com/gh/cimi/d3-flame-graphs/tree/master) [![npm version](https://badge.fury.io/js/d3-flame-graphs.svg)](https://badge.fury.io/js/d3-flame-graphs) [![bower version](https://badge.fury.io/bo/d3-flame-graphs.svg)](https://badge.fury.io/bo/d3-flame-graphs)

## Features

* __Efficient rendering of large profiles__ - large profiles may use up a lot of CPU and memory to render if all samples get represented on the DOM. This plugin only draws samples that would be visible to the user. The performance improvement in the case of very large profiles is in the range of 10x-20x.
* __Zooming__ - on click, the container re-renders the subgraph associated with the clicked node. The previous roots are rendered at the bottom of the graph and are clickable - you can revert to a previous state. An optional callback can be provided if you want to trigger other changes when zooming.
* __Tooltips__ - when hovering over nodes a tooltip can be displayed. The tooltip's contents are parametrizable.
* __Filtering__ - nodes can be selected by name using regex. This enables name-based navigation, highlighting or adding other custom behaviour to certain nodes. See the demo for examples.
* __Hiding across the stack__ - some call paterns only add noise to a graph (like `Object.wait` or `Unsafe.park`, for example). The plugin offers the capability to hide node selections across the stack (their value is subtracted from the parent nodes and their children are hidden). This leads to clearer views of the state of the world. 

## How was this made?

This plugin was built using gulp and coffeescript. CircleCI runs tests on every push and manages releasing the demo page and the library to npm and bower. The demo page is hosted on GitHub pages.

## API Reference

The methods on the flame graph plugin follow the [d3.js conventions](http://bost.ocks.org/mike/chart/) on method chaining and accessors.

<a href="#flameGraph">#</a> d3.flameGraph(_selector_, _data_)

Constructs a new flame graph.

The selector value is required, it defines the DOM element to which the SVG will be appended. Prior to rendering, any svg elements present in the given container will be cleared.

The data value is also required, it should be the root of the profile under analysis. There is no need to partition the data prior to feeding in to the plugin as partitioning is done internally. Any operation on the data (zooming, selecting, hiding) will use this value as start of traversal. 

<a href="#size">#</a> flameGraph.__size__([_[width, height]_])

If _[width, height]_ are specified, sets the svg rendering width and height to the pixel values provided in the array. If _[width, height]_ is not specified, returns the current width. Defaults to _[1200, 600]_.

<a href="#margin">#</a> flameGraph.__margin__([_{top: , right: , bottom:, left: }]_])

If the values are specified, follows the [d3 conventions on margins](http://bl.ocks.org/mbostock/3019563) when rendering the chart. If the values are not specified, returns the current margins object. Defaults to _{ top: 0, right: 0, bottom: 0, left: 0}_.

<a href="#cellHeight">#</a> flameGraph.__cellHeight__([_cellHeight_])

If _cellHeight_ is specified, sets the height of the rectangles in the flame graph to the provided value. If _cellHeight_ is not specified, returns the current value. Defaults to 20. The graph height should be divisible by the cell height so the nodes align properly.

<a href="#color">#</a> flameGraph.__color__([_[color(d)]_])

If the _color_ function is specified, it will be used when determining the color for a particular node. The function should expect one parameter, the data element associated with the node. If _color_ is not specified, returns the current function.

The default function uses a hash of the node's short name to generate the color. The letters are weighted (first letters matter more), the hash only uses the first six characters of the name.

<a href="#data">#</a> flameGraph.__data__([_data_])

The data the flame graph is rendered from. It expects nested data in the form:

```
{
      "name": "<name from which the label is derived>",
      "value": <number representing the sample count of the node>,
      "children": [<child object>, <child object>, ...]
}
```

The data is augmented with 'filler nodes' by the plugin, due to the fact that D3 considers the value of a node to be the sum of its children rather than its explicit value. More details in [this issue](https://github.com/mbostock/d3/pull/574). This should be transparent to clients as the filler node augmentation is done internally. Because of the filler node augmentation, __the children property needs to be defined, even if the array is empty.__

<a href="#zoomEnabled">#</a> flameGraph.__zoomEnabled__(_enabled_)

If _enabled_ is truthy, zooming will be enabled - clicking a node or calling the zoom method programatically will re-render the graph with that node as root. The default value is _true_.

<a href="#zoomAction">#</a> flameGraph.__zoomAction__(_function_)

If a _function_ is provided, on every zoom - clicking a node or calling the zoom method programatically - the function will be called after the graph is re-rendered. The function receives a data node as its parameter and its return value is ignored.

<a href="#zoom">#</a> flameGraph.__zoom__(_node_)

If zoom is enabled, re-renders the graph with the given node as root. The previous roots are drawn at the bottom of the graph, by clicking on it them you can revert back to previous states. Prior to zooming, any svg elements present in the given container will be cleared.

If zoom is disabled, this method will throw an error.

[See the demo code](https://github.com/cimi/d3-flame-graphs/blob/master/demo/src/demo.coffee#L69) for an example.

<a href="#tooltip">#</a> flameGraph.__tooltip__(_function_)

If a _function_ is provided, a tooltip will be shown on mouseover for each cell. Ancestor nodes do not get a tooltip. The function receives a data node as its parameter and needs to return an HTML string that will be rendered inside the tooltip. The d3-tip plugin is responsible for rendering the tooltip. If set to false or not called, the tooltip is disabled and nothing is rendered on mouseover.

<a href="#select">#</a> flameGraph.__select__(_predicate_, [_isDisplayed_])

Selects the elements from the current dataset which match the given _predicate_ function. If _isDisplayed_ is set to false, it will search all the nodes starting from the root passed to the flame graph constructor and return an array of data nodes. _isDisplayed_ defaults to true, in that case it will only search the currently displayed elements and returns a d3 selection of DOM elements.

[The demo code contains a usage example](https://github.com/cimi/d3-flame-graphs/blob/master/demo/src/demo.coffee).

<a href="#hide">#</a> flameGraph.__hide__(_predicate_, [_unhide_])

Hides elements that match the given _predicate_ function from the current dataset. The targeted elements and their children are hidden. The value of the target is subtracted from its ancestors so that it's effect is removed across the stack.

If _unhide_ is set to true, it will perform the reverse operation and re-add the previously subtracted values. _unhide_ defaults to false.

As this operation needs to traverse the subtree for all matched items, it can potentially be slow on generic queries over large datasets.

[The demo code contains a usage example](https://github.com/cimi/d3-flame-graphs/blob/master/demo/src/demo.coffee).

<a href="#render">#</a> flameGraph.__render__()

Triggers a repaint of the flame graph, using the values previously fed in as parameters. This is the only method besides zoom and hide that triggers repaint so you need to call it after changing other parameters like size or cell-height in order to see the changes take effect.

### Sample usage:

The example below is taken from the demo source. Although it is written in CoffeeScript, the plugin can be used from vanilla JS without any issues.

```
d3.json "data/profile.json", (err, data) ->
  profile = convert(data.profile)
  tooltip = (d) -> "#{d.name} <br /><br />
    #{d.value} samples<br />
    #{((d.value / profile.value) * 100).toFixed(2)}% of total"
    flameGraph = d3.flameGraph('#d3-flame-graph', profile)
      .size([1200, 600])
      .cellHeight(20)
      .zoomEnabled(true)
      .zoomAction((d) -> console.log(d))
      .tooltip(tooltip)
      .render()

  d3.select('#highlight')
    .on 'click', () ->
      nodes = flameGraph.select((d) -> /java\.util.*/.test(d.name))
      nodes.classed("highlight", (d, i) -> not d3.select(@).classed("highlight"))

  d3.select('#zoom')
    .on 'click', () ->
      # jump to the first java.util.concurrent method we can find
      node = flameGraph.select(((d) -> /CountDownLatch\.await$/.test(d.name)), false)[0]
      flameGraph.zoom(node)

  unhide = false
  d3.select('#hide')
    .on 'click', () ->
      flameGraph.hide ((d) -> /Unsafe\.park$/.test(d.name) or /Object\.wait$/.test(d.name)), unhide
      unhide = !unhide
```
