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

<a href="#containerSelector">#</a> flameGraph.__containerSelector__(<i>selector</i>)

References the element in which the flame graph will be rendered. The selector is passed to d3.select() so it follows the CSS spec. Specifying the selector is mandatory for rendering the graph.

<a href="#width">#</a> flameGraph.__width__([_width_])

If _width_ is specified, sets the svg rendering width to the pixel value provided. If _width_ is not specified, returns the current width. There is no default so this parameter is mandatory.

<a href="#height">#</a> flameGraph.__height__([_height_])

If _height_ is specified, sets the svg rendering height to the provided pixel value. If _height_ is not specified, returns the current width. There is no default so this parameter is mandatory.

<a href="#cellHeight">#</a> flameGraph.__cellHeight__([_cellHeight_])

If _cellHeight_ is specified, sets the height of the rectangles in the flame graph to the provided value. If _cellHeight_ is not specified, returns the current value. There is no default so this parameter is mandatory.

<a href="#data">#</a> flameGraph.__data__([_data_])

The data the flame graph is rendered from.

__TODO__: Provide more details on how the data elements are expected to look like.

<a href="#colorScheme">#</a> flameGraph.__colorScheme__([_colorScheme_])

If _colorScheme_ is specified, it will set the colors available for rendering to the ones passed in as a parameter. If _colorScheme_ is not specified, returns the current available colors. The parameter is expected to be an array of hex values. The last value in the array is used for the rectangles' stroke colour.There is no default so this parameter is mandatory.

<a href="#render">#</a> flameGraph.__render__()

Triggers a repaint of the flame graph, using the values previously fed in as parameters. This is the only method that triggers repaint so you need to call it after changing the other parameters to see the changes take effect.

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