<h4>What is this?</h4>
<p>This is a d3.js plugin that renders flame graphs from hierarchical data.</p>

Flame graphs were invented by Brendan Gregg; you can find the original implementation for drawing them as well as ports to different languages/environments on his website. To quote him:

> Flame graphs are a visualization of profiled software, allowing the most frequent code-paths to be identified quickly and accurately. They can be generated using my open source programs on [github.com/brendangregg/FlameGraph](http://github.com/brendangregg/FlameGraph), which create interactive SVGs. See the Updates section for other implementations.
> 
> -- [Flame Graphs](http://www.brendangregg.com/flamegraphs.html), <cite>Brendan Gregg</cite>

<h4>Currently implemented features:</h4>
<ul>
  <li>Breadcrumbs - the navbar is populated with the names of the classes that were navigated into.</li>
  <li>Tooltip showing the FQDN of the hovered classes, total and percentual time spent.</li>
</ul>

<h4>Roadmap:</h4>
<ul>
  <li>Filtering from the UI (input with autocomplete)</li>
  <li>Parametrizing the DOM element in which breadcrumbs are rendered </li>
  <li>Zoom by increasing the scale of the SVG</li>
  <li>Code refactoring</li>
</ul>

<h4>How was this made?</h4>
<p>This plugin was built using gulp and coffeescript. The build code needs serious refactoring as the demo page needs to be separated from the plugin distributable build.</p>