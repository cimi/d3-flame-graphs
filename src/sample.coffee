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
  RX : 5,
  RY : 5,
  TOOLTIP_OFFSET: 3,
  EM_OF_FLAME_BAR: 0.5,
  EM_OF_LABEL_HEIGHT: ".35em"

convert = (rawData) ->

  value = 0
  for state in ['RUNNABLE', 'BLOCKED', 'TIMED_WAITING', 'WAITING']
    value += rawData.c[state] if not isNaN(rawData.c[state])

  node =
    name: rawData.n,
    value: value,
    samples: value
    children: []
  return node if not rawData.a

  childSum = 0
  for child in rawData.a
    subTree = convert(child)
    if subTree
      node.children.push(subTree)
      childSum += subTree.value

  if childSum < node.value
    fillerNode =
      name: ''
      value: node.value - childSum
      samples: node.value - childSum
      opacity: 0
    node.children.push(fillerNode)

  node

rgbToHex = (red, green, blue) ->
  '#' + ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).substr(1)

d3.flameGraph = ->

  class FlameGraph
    constructor: (@_width, @_height, containerId) ->
      @rangeX = d3.scale.linear().range([ 0, @_width ])
      @rangeY = d3.scale.linear().range([ 0, @_height ])
      @inverseY = (d) -> @_height - @rangeY(d.y) - @rangeY(d.dy);
      @container = d3.select(containerId)
        .append('svg')
        .attr('width', @_width)
        .attr('height', @_height)
      @_generateAccessors(['width', 'height'])


    render: (data) ->
      # compute height dynamically so the fixed unit is the height of a cell
      console.time('rendering')
      data = d3.layout.partition()
        .sort((a,b) -> a.name.localeCompare(b.name))
        .nodes(data)

      @container
        .selectAll('.node')
        .data(data)
        .enter()
          .append('rect')
            .attr('class', 'node')
            .attr('width', (d) => @rangeX(d.dx))
            .attr('height', (d) => if @rangeX(d.dx) > 5 then @rangeY(d.dy) else 0)
            .attr('x', (d) => @rangeX(d.x))
            .attr('y', (d) => @inverseY(d))
            .attr('rx', constants.RX)
            .attr('ry', constants.RY)
            .attr('fill', (d) ->
              rgbToHex.apply(null, constants.FLAME_RGB))
      console.timeEnd('rendering')
      return @

    _generateAccessors: (accessors) ->
      for accessor in accessors
        @[accessor] = (newValue) ->
          return @["_#{accessor}"] if not arguments.length
          @["_#{accessor}"] = newValue
          return @

  return new FlameGraph(1200, 5000, '#d3-flame-graph')

d3.json "data/profile.json", (err, data) ->
  console.time('convert')
  converted = convert(data.profile)
  console.timeEnd('convert')
  d3.flameGraph().render(converted)
