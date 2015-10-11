## [![Circle CI](https://circleci.com/gh/cimi/flame-graph-d3/tree/master.svg?style=svg)](https://circleci.com/gh/cimi/flame-graph-d3/tree/master) [![npm version](https://badge.fury.io/js/flame-graph-d3.svg)](https://badge.fury.io/js/flame-graph-d3) [![bower version](https://badge.fury.io/bo/flame-graph-d3.svg)](https://badge.fury.io/bo/flame-graph-d3)

## What is this?

This is a d3.js plugin that renders flame graphs from hierarchical data.

Flame graphs were invented by Brendan Gregg; you can find the original implementation for drawing them as well as ports to different languages/environments on his website. To quote him:

> Flame graphs are a visualization of profiled software, allowing the most frequent code-paths to be identified quickly and accurately. They can be generated using my open source programs on [github.com/brendangregg/FlameGraph](http://github.com/brendangregg/FlameGraph), which create interactive SVGs. See the Updates section for other implementations.
>
> -- [Flame Graphs](http://www.brendangregg.com/flamegraphs.html), <cite>Brendan Gregg</cite>

## Features

* __Efficient rendering of large profiles__ - large profiles may use up a lot of CPU and memory to render if all samples get represented on the DOM. This plugin only draws samples that would be visible to the user. The performance improvement in the case of very large profiles is in the range of 10x-20x.
* __Navigation__ - on click, the container re-renders the subgraph associated with the clicked node. An optional DOM element can be supplied for breadcrumb navigation, it will be populated with links to the previous states of the graph.
* __Tooltips__ - showing the FQDN of the hovered classes and sample time are shown in a tooltip that triggers on mouseover.
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

<a href="#render">#</a> flameGraph.__render__(_selector_)

Triggers a repaint of the flame graph, using the values previously fed in as parameters. This is the only method that triggers repaint so you need to call it after changing the other parameters to see the changes take effect.

The selector value is required, it defines the DOM element to which the SVG will be appended. Prior to rendering, any svg elements present in the given container will be cleared.

### Extra functionality

<a href="#breadcrumbs">#</a> flameGraph.__breadcrumbs__(_selector_)

If _selector_ is specified, the flame graph will enable clickthrough navigation and will create breadcrumbs in the container referenced by the selector. The breadcrumbs are added as list items, so the container is expected to be an ordered or unordered list. Each breadcrumb reverts the flame graph to a previous state on click. This value needs to be specified for the feature to be enabled, it is disabled by default.

<a href="#tooltip">#</a> flameGraph.__tooltip__(_enabled_)

If _enabled_ is true, a tooltip will be rendered on top of the cells in the graph on mouseover. The d3-tip plugin is responsible for rendering the tooltip. If set to false, the tooltip is disabled and nothing is rendered on mouseover. The default value is _true_.

### Sample invocation:

```
d3.flameGraph()
  .size([1200, 600]).cellHeight(10)
  .colors(["#ffffcc","#ffeda0","#fed976","#feb24c","#fd8d3c","#fc4e2a","#e31a1c","#bd0026"])
  .data(profile)
  .breadcrumbs('.breadcrumb')
  .tooltip(true)
  .render('#d3-flame-graph')
```
