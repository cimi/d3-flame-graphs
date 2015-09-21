someVar = 1
d3 = window.d3
_ = window._

constants =
  WIDTH_TO_HEIGHT_RATIO : 0.4,
  POS_FLAME_RGB : [ 254, 86, 67 ],
  NEG_FLAME_RGB : [ 0, 200, 0 ],
  EQ_FLAME_RGB : [ 198, 198, 143 ],
  FLAME_DIFFERENTIAL : 40.0,
  FLAME_RGB : [ 200, 125, 50 ],
  TOOLTIP_BORDER_COLOR_PLUS : '#FFB2B2',
  TOOLTIP_BORDER_COLOR_MINUS : '#99D699',
  TOOLTIP_BORDER_COLOD_DEFAULT : '#DDD',
  MIN_LABEL_WIDTH : 40,
  RX : 2,
  RY : 2,
  TOOLTIP_OFFSET: 3,
  EM_OF_FLAME_BAR: 0.5,
  EM_OF_LABEL_HEIGHT: ".25em"

convert = (rawData) ->
  value = 0
  for state in ['RUNNABLE', 'BLOCKED', 'TIMED_WAITING', 'WAITING']
    value += rawData.c[state] if not isNaN(rawData.c[state])

  node =
    name: rawData.n,
    value: value,
    samples: value
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

rgbToHex = (red, green, blue) ->
  '#' + ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).substr(1)

randomizeColor = (rgb) ->
    # generates a random integer between -FLAME_DIFF / 2 and FLAME_DIFF / 2
    offset = (color) ->
      color + Math.round((Math.random() * constants.FLAME_DIFFERENTIAL) - (constants.FLAME_DIFFERENTIAL * 0.5))

    "rgb(#{offset(rgb[0])}, #{offset(rgb[1])}, #{offset(rgb[2])})"

maxY = 0
maxDepth = (node) ->
  return 0 if not node
  return 1 if not node.children

  max = 0
  node.children.forEach (child) ->
    depth = maxDepth(child)
    max = depth if depth > max
    maxY = child.y if child.y > maxY

  return max + 1

d3.flameGraph = ->

  class FlameGraph
    constructor: (@containerId) ->
      @_generateAccessors(['width', 'height'])
      @_allData = []

    data: (data) ->
      return @_data if not data
      @_allData.push(data)

      breadcrumbData = @_allData.map((prevData, idx) -> { name: prevData.name, value: idx })
      console.log(breadcrumbData)
      breadcrumbs = d3.select('.breadcrumb')
        .selectAll('li')
        .data(breadcrumbData)

      breadcrumbs.enter()
        .append('li')
          .append('a')
          .text((d) -> "#{d.name}")
          .on 'click', (breadcrumb) =>
            idx = breadcrumb.value
            displayed = @_allData[idx]
            @_allData = @_allData.slice(0, idx)
            @data(displayed)
              .render()
              .interactivity()

      breadcrumbs.exit().remove()


      @_data = d3.layout.partition()
        .sort((a,b) -> a.name.localeCompare(b.name))
        .nodes(data)
      @

    getLabelText: (label, dx) ->
      return "" if not label
      shortLabel = label;

      if (shortLabel.indexOf(".") != -1)
        delimiter = "."
        tokens = label.split(delimiter)
        length = tokens.length
        shortLabel = [tokens[length - 2], tokens[length - 1]].join(delimiter)

        ratio = 4
        maxLength = Math.round(@x(dx) / ratio)
        return shortLabel.substr(0, maxLength)

    render: () ->
      # compute height dynamically so the fixed unit is the height of a cell
      console.time('rendering')

      d3.select(@containerId)
        .select('svg').remove()
      @container = d3.select(@containerId)
        .append('svg')
          .attr('width', @width())
          .attr('height', @height())

      @container.selectAll('.node', '.label').remove()

      @cellHeight  = 10
      @maxCells    = Math.floor(@height() / @cellHeight)

      depth = maxDepth(@data()[0])
      @x = d3.scale.linear()
        .range([0, @width()])
        .domain([0, d3.max(@data(), (d) -> d.x)])
      @quantizedY = d3.scale.quantize()
        .domain([0, maxY])
        .range(d3.range(1, depth + 1))
      @y = (y) -> @height() - @quantizedY(y) * @cellHeight

      @container
        .selectAll('.node')
        .data(@data().filter((d) =>
          @x(d.dx) > 0.1 and @quantizedY(d.y) <= @maxCells))
        .enter()
          .append('rect')
            .attr('class', 'node')
            .attr 'width', (d) => @x(d.dx)
            .attr('height', (d) => @cellHeight - 2)
            .attr('x', (d) => @x(d.x))
            .attr('y', (d) => @y(d.y))
            # .attr('rx', constants.RX)
            # .attr('ry', constants.RY)
            .attr('stroke', (d) -> randomizeColor(constants.FLAME_RGB))
            .attr('fill', (d) -> if d.color then d.color else randomizeColor(constants.FLAME_RGB))
            .attr('fill-opacity', '0.8')

      @container
        .selectAll('.label')
        .data(@data().filter((d) => d.name and @x(d.dx) > constants.MIN_LABEL_WIDTH))
        .enter()
          .append('text')
            .attr('class', 'label')
            .attr('text-anchor', 'middle')
            .attr('dy', constants.EM_OF_LABEL_HEIGHT)
            .attr('x', (d) => @x(d.x) + @x(d.dx) / 2)
            .attr('y', (d) => @y(d.y) + @cellHeight / 2)
            .text((d) => @getLabelText(d.name, d.dx))
          # .on("mouseover", (d) -> @onMouseover(d))
          # .on("mousemove", (d) -> @onMousemove())
          # .on("mouseout", (d) -> @onMouseout())
          # .on("click", (d) -> if (!d3.event.defaultPrevented) then @onSetRootCallback(d.location))

      console.timeEnd('rendering')
      console.log("Rendered #{@container.selectAll('.node')[0].length} elements")
      return @

    interactivity: () ->
      console.time('interactivity')
      clickHandler = (d) =>
          console.log(d.y, @quantizedY(d.y))
          @data(d).render().interactivity()

      @container
        .selectAll('.node')
        .on 'click', clickHandler

      @container
        .selectAll('.label')
        .on 'click', clickHandler

      console.timeEnd('interactivity')
      @

    _generateAccessors: (accessors) ->
      for accessor in accessors
        @[accessor] = do (accessor) ->
          (newValue) ->
            return @["_#{accessor}"] if not arguments.length
            @["_#{accessor}"] = newValue
            return @

  return new FlameGraph('#d3-flame-graph').width(1200).height(800)

d3.json "data/profile-large.json", (err, data) ->
  window.flameGraph = d3.flameGraph()
  flameGraph.data(convert(data.profile))
    .render()
    .interactivity()
