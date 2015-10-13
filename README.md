## What is this?

This is a d3.js plugin that renders flame graphs from hierarchical data.

> Flame graphs are a visualization of profiled software, allowing the most frequent code-paths to be identified quickly and accurately. They can be generated using my open source programs on [github.com/brendangregg/FlameGraph](http://github.com/brendangregg/FlameGraph), which create interactive SVGs. See the Updates section for other implementations.
>
> -- [Flame Graphs](http://www.brendangregg.com/flamegraphs.html), <cite>Brendan Gregg</cite>

## [See the demo!](http://cimi.github.io/d3-flame-graphs/)

<a href="http://cimi.github.io/d3-flame-graphs/">
![Flame Graph Representation](flame-graph-screenshot.png?raw=true "See the demo!")
</a>

## Build status
[![Circle CI](https://circleci.com/gh/cimi/d3-flame-graphs/tree/master.svg?style=svg)](https://circleci.com/gh/cimi/d3-flame-graphs/tree/master) [![npm version](https://badge.fury.io/js/d3-flame-graphs.svg)](https://badge.fury.io/js/d3-flame-graphs) [![bower version](https://badge.fury.io/bo/d3-flame-graphs.svg)](https://badge.fury.io/bo/d3-flame-graphs)

## Features

* __Efficient rendering of large profiles__ - large profiles may use up a lot of CPU and memory to render if all samples get represented on the DOM. This plugin only draws samples that would be visible to the user. The performance improvement in the case of very large profiles is in the range of 10x-20x.
* __Zooming__ - on click, the container re-renders the subgraph associated with the clicked node. The previous roots are rendered at the bottom of the graph and are clickable - you can revert to a previous state.
* __Tooltips__ - when hovering over nodes a tooltip can be displayed. The tooltip's contents are parametrizable.
* __Filtering__ - nodes can be selected by name using regex. This enables name-based navigation, highlighting or adding other custom behaviour to certain nodes. See the demo for examples.

## How was this made?

This plugin was built using gulp and coffeescript. CircleCI runs tests on every push and manages releasing the demo page and the library to npm and bower. The demo page is hosted on GitHub pages.

## API Reference

The methods on the flame graph plugin follow the [d3.js conventions](http://bost.ocks.org/mike/chart/) on method chaining and accessors.

<a href="#flameGraph">#</a> d3.flameGraph()

Constructs a new flame graph.

<a href="#size">#</a> flameGraph.__size__([_[width, height]_])

If _[width, height]_ are specified, sets the svg rendering width and height to the pixel values provided in the array. If _[width, height]_ is not specified, returns the current width. Defaults to _[1200, 600]_.

<a href="#margin">#</a> flameGraph.__margin__([_{top: , right: , bottom:, left: }]_])

If the values are specified, follows the [d3 conventions on margins](http://bl.ocks.org/mbostock/3019563) when rendering the chart. If the values are not specified, returns the current margins object. Defaults to _{ top: 0, right: 0, bottom: 0, left: 0}_.

<a href="#cellHeight">#</a> flameGraph.__cellHeight__([_cellHeight_])

If _cellHeight_ is specified, sets the height of the rectangles in the flame graph to the provided value. If _cellHeight_ is not specified, returns the current value. Defaults to 10.

<a href="#color">#</a> flameGraph.__color__([_[color(d)]_])

If the _color_ function is specified, it will be used when determining the color for a particular node. The function should expect one parameter, the data element associated with the node. If _color_ is not specified, returns the current function.

The default function uses a hash of the node's short name to generate the color. The letters are weighted (first letters matter more), the hash only uses the first six characters of the name.

<a href="#data">#</a> flameGraph.__data__([_data_])

The data the flame graph is rendered from. It expects a nested data in the form:

```
{
      "value": <number representing the sample count of the node>,
      "time": "<string representing the total time spent, used in the tooltip>",
      "children": [<child object>, <child object>, ...]
}
```

The data is supposed to have 'filler nodes', due to fact that D3 considers the value of a node to be the sum of its children rather than its explicit value. More details in [this issue](https://github.com/mbostock/d3/pull/574).

<a href="#zoomEnabled">#</a> flameGraph.__zoomEnabled__(_enabled_)

If _enabled_ is truthy, zooming will be enabled - clicking a node or calling the zoom method programatically will re-render the graph with that node as root. The default value is _true_.

<a href="#zoom">#</a> flameGraph.__zoom__(_node_)

If the zoom is enabled, re-renders the graph with the given node as root. The previous roots are drawn at the bottom of the graph, by clicking on it them you can revert back to previous states. Prior to zooming, any svg elements present in the given container will be cleared.

[See the demo code](https://github.com/cimi/d3-flame-graphs/blob/master/demo/src/demo.coffee#L69) for an example.

<a href="#tooltip">#</a> flameGraph.__tooltip__(_function_)

If a _function_ is provided, a tooltip will be shown on mouseover for each cell. The ancestor nodes do not get a tooltip. The function receives a data node as its parameter and needs to return an HTML string that will be rendered inside the tooltip. The d3-tip plugin is responsible for rendering the tooltip. If set to false or not called, the tooltip is disabled and nothing is rendered on mouseover.

<a href="#render">#</a> flameGraph.__select__(_regex_, [_isDisplayed_])

Selects the elements from the current dataset which match the given _regex_. If _isDisplayed_ is set to false, it will search all the nodes (the first dataset passed to the instance of the flame graph) and return an array of data nodes. _isDisplayed_ defaults to true, in that case it will only search the currently displayed elements and returns a d3 selection of DOM elements.

[The demo code contains a usage example](https://github.com/cimi/d3-flame-graphs/blob/master/demo/src/demo.coffee#L54).

<a href="#render">#</a> flameGraph.__render__(_selector_)

Triggers a repaint of the flame graph, using the values previously fed in as parameters. This is the only method besides zoom that triggers repaint so you need to call it after changing the other parameters to see the changes take effect.

The selector value is required, it defines the DOM element to which the SVG will be appended. Prior to rendering, any svg elements present in the given container will be cleared.

### Sample invocation:

```
  flameGraph = d3.flameGraph()
    .size([1200, 600])
    .cellHeight(20)
    .data(profile)
    .zoomEnabled(true)
    .tooltipEnabled(true)
    .render('#d3-flame-graph')
```
