d3 = window.d3
throw new Error("d3.js needs to be loaded") if not d3

d3.flameGraph = ->

  class FlameGraph
    constructor: () ->
      @_generateAccessors([
        'width',
        'height',
        'cellHeight',
        'containerSelector',
        'colorScheme'])
      @_allData = []

    container: (selector) ->
      return @_container if not selector
      outerContainer = d3.select(selector)
      outerContainer.select('svg').remove()
      @_container = outerContainer.append('svg')
      @_container

    data: (data) ->
      return @_data if not data
      @_allData.push(data)
      @totalSamples = data.samples
      @_data = d3.layout.partition()
        .sort((a,b) -> a.name.localeCompare(b.name))
        .nodes(data)
      @

    label: (d) ->
      return "" if not d?.name
      label = getClassAndMethodName(d.name)
      label.substr(0, Math.round(@x(d.dx) / 4))

    color: (d) -> @colorScheme()[Math.floor(Math.random() * @colorScheme().length)]

    getClassAndMethodName = (fqdn) ->
      tokens = fqdn.split(".")
      tokens.slice(tokens.length - 2).join(".")

    render: () ->
      console.time('render')

      # refresh container
      @container(@containerSelector())
        .attr('width', @width())
        .attr('height', @height())

      @maxCells = Math.floor(@height() / @cellHeight())
      @maxDepth = @data()[0].maxDepth

      @x = d3.scale.linear()
        .domain([0, d3.max(@data(), (d) -> d.x + d.dx)])
        .range([0, @width()])
      @y = d3.scale.quantize()
        .domain([d3.max(@data(), (d) -> d.y), 0])
        .range(d3.range(@maxDepth)
          .map((cell) =>  (cell - @maxDepth + @maxCells) * @cellHeight()))

      @container()
        .selectAll('.node')
        .data(@data().filter((d) =>
          @x(d.dx) > 0.1 and @y(d.y) >= 0 and d.type != 'filler'))
        .enter()
          .append('rect')
            .attr('class', 'node')
            .attr 'width', (d) => @x(d.dx)
            .attr('height', (d) => @cellHeight() - 2)
            .attr('x', (d) => @x(d.x))
            .attr('y', (d) => @y(d.y))
            .attr('stroke', @colorScheme()[@colorScheme().length - 1])
            .attr('fill', (d) => @color(d))
            .attr('fill-opacity', '0.8')

      @container()
        .selectAll('.label')
        .data(@data().filter((d) => d.name and @x(d.dx) > 40))
        .enter()
          .append('text')
            .attr('class', 'label')
            .attr('text-anchor', 'middle')
            .attr('dy', '.25em')
            .attr('x', (d) => @x(d.x) + @x(d.dx) / 2)
            .attr('y', (d) => @y(d.y) + @cellHeight() / 2)
            .text((d) => @label(d))

      console.timeEnd('render')
      console.log("Rendered #{@container().selectAll('.node')[0].length} elements")
      return @_breadcrumbs()._tooltip()._interactivity()

    _tooltip: () ->
      @tip = d3.tip()
        .attr('class', 'd3-tip')
        .html((d) => "#{d.name} <br /><br />#{d.totalTime} run time<br />#{((d.samples / @totalSamples) * 100).toFixed(2)}% of total")
        .direction (d) =>
          return 'w' if @x(d.x) + @x(d.dx) / 2 > @width() - 100
          return 'e' if @x(d.x) + @x(d.dx) / 2 < 100
          return 's' if @y(d.y) < 100
          return 'n' # otherwise
        .offset([- @cellHeight() / 2, 0])

      @container().call(@tip)
      @container()
        .selectAll('.node')
          .on 'mouseover', @tip.show
          .on 'mouseout', @tip.hide
      @container()
        .selectAll('.label')
          .on 'mouseover', @tip.show
          .on 'mouseout', @tip.hide
      @

    _breadcrumbs: () ->
      breadcrumbData = @_allData.map((prevData, idx) -> { name: prevData.name, value: idx })
      breadcrumbs = d3.select('.breadcrumb')
        .selectAll('li')
        .data(breadcrumbData)

      breadcrumbs.enter()
        .append('li')
          .append('a')
            .attr('title', (d) -> d.name)
            .text((d) -> getClassAndMethodName(d.name))
            .on 'click', (breadcrumb) =>
              idx = breadcrumb.value
              displayed = @_allData[idx]
              @_allData = @_allData.slice(0, idx)
              @data(displayed).render()

      breadcrumbs.exit().remove()
      @

    _interactivity: () ->
      @container()
        .selectAll('.node')
        .on 'click', (d) => @data(d).render()
      @container()
        .selectAll('.label')
        .on 'click', (d) => @data(d).render()
      @

    _generateAccessors: (accessors) ->
      for accessor in accessors
        @[accessor] = do (accessor) ->
          (newValue) ->
            return @["_#{accessor}"] if not arguments.length
            @["_#{accessor}"] = newValue
            return @

  return new FlameGraph()