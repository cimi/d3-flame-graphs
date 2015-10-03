## [![Circle CI](https://circleci.com/gh/cimi/d3-flame-graph/tree/master.svg?style=svg)](https://circleci.com/gh/cimi/d3-flame-graph/tree/master)

## What is this?

This is a d3.js plugin that renders flame graphs from hierarchical data.

Flame graphs were invented by Brendan Gregg; you can find the original implementation for drawing them as well as ports to different languages/environments on his website. To quote him:

> Flame graphs are a visualization of profiled software, allowing the most frequent code-paths to be identified quickly and accurately. They can be generated using my open source programs on [github.com/brendangregg/FlameGraph](http://github.com/brendangregg/FlameGraph), which create interactive SVGs. See the Updates section for other implementations.
>
> -- [Flame Graphs](http://www.brendangregg.com/flamegraphs.html), <cite>Brendan Gregg</cite>

## Currently implemented features:

* Breadcrumbs - the navbar is populated with the names of the classes that were navigated into.
* Tooltip showing the FQDN of the hovered classes, total and percentual time spent.

## Roadmap:

* Filtering from the UI (input with autocomplete)
* Parametrizing the DOM element in which breadcrumbs are rendered
* Zoom by increasing the scale of the SVG
* Code refactoring

## How was this made?

This plugin was built using gulp and coffeescript.

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

<a href="#colors">#</a> flameGraph.__colors__([_[colors]_])

If _colors_ are specified, it will set the colors available for rendering to the ones passed in as a parameter. If _colors_ are not specified, returns the current available colors. The parameter is expected to be an array of hex color strings. The last value in the array is used for the rectangles' stroke colour. The default colours are 5-class YlOrRd from [lib/colorbrewer](http://colorbrewer2.org/).

<a href="#data">#</a> flameGraph.__data__([_data_])

The data the flame graph is rendered from.

__TODO__: Provide more details on how the data elements are expected to look like.

<a href="#render">#</a> flameGraph.__render__(_selector_)

Triggers a repaint of the flame graph, using the values previously fed in as parameters. This is the only method that triggers repaint so you need to call it after changing the other parameters to see the changes take effect.

The selector value is required, it defines the DOM element to which the SVG will be appended. Prior to rendering, any svg elements present in the given container will be cleared.

__TODO__: Document the tooltip and breadcrumb functionality.

### Sample invocation:

```
d3.flameGraph()
  .containerSelector('#d3-flame-graph')
  .width(1200).height(600).cellHeight(10)
  .data(profile)
  .colorScheme(["#ffffcc","#ffeda0","#fed976","#feb24c","#fd8d3c","#fc4e2a","#e31a1c","#bd0026"])
  .render()
```
