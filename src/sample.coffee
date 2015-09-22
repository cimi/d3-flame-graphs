d3 = window.d3
_ = window._

constants =
  TOOLTIP_BORDER_COLOR_PLUS : '#FFB2B2',
  TOOLTIP_BORDER_COLOR_MINUS : '#99D699',
  TOOLTIP_BORDER_COLOD_DEFAULT : '#DDD',
  TOOLTIP_OFFSET: 3

convert = (rawData) ->
  value = 0
  for state in ['RUNNABLE', 'BLOCKED', 'TIMED_WAITING', 'WAITING']
    value += rawData.c[state] if not isNaN(rawData.c[state])

  timeElapsed = new Date()
  timeElapsed.setSeconds(value)
  node =
    name: rawData.n,
    value: value,
    samples: value
    totalTime: countdown(new Date(), timeElapsed, countdown.DAYS | countdown.HOURS | countdown.MINUTES | countdown.SECONDS)
    children: []

  # the a field is the list of children
  return node if not rawData.a

  childSum = 0
  for child in rawData.a
    subTree = convert(child)
    if subTree
      node.children.push(subTree)
      childSum += subTree.value

  if childSum < node.value
    # not sure why we need to create these transparent fillers?
    # also not sure why we wouldn't have all the data?
    # maybe when filtering?
    fillerNode =
      name: ''
      value: node.value - childSum
      samples: node.value - childSum
      opacity: 0
    node.children.push(fillerNode)

  node

maxDepth = (node) ->
  return 0 if not node
  return 1 if not node.children
  return node.maxDepth if node.maxDepth

  max = 0
  node.children.forEach (child) ->
    depth = maxDepth(child)
    max = depth if depth > max

  node.maxDepth = max + 1
  return node.maxDepth


getClassAndMethodName = (fqdn) ->
  tokens = fqdn.split(".")
  tokens.slice(tokens.length - 2).join(".")

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

    render: () ->
      console.time('render')

      # refresh container
      @container(@containerSelector())
        .attr('width', @width())
        .attr('height', @height())

      @maxCells = Math.floor(@height() / @cellHeight())
      @maxDepth = maxDepth(@data()[0])

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
          @x(d.dx) > 0.1 and @y(d.y) >= 0))
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

d3.json "data/profile-large.json", (err, data) ->
  window.flameGraph = d3.flameGraph()
  flameGraph
    .containerSelector('#d3-flame-graph')
    .width(1200).height(600).cellHeight(10)
    .data(convert(data.profile))
    .colorScheme(["#ffffcc","#ffeda0","#fed976","#feb24c","#fd8d3c","#fc4e2a","#e31a1c","#bd0026"])
    .render()