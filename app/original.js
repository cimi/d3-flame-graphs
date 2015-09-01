var convertToTimeString = function(seconds) {
    var originalSeconds = seconds;

    var MINUTE = 60;
    var HOUR = 60*MINUTE;
    var DAY = 24*HOUR;
    var YEAR = 365*DAY;

    var years = Math.floor(seconds / YEAR);
    seconds %= YEAR;
    var days = Math.floor(seconds / DAY);
    seconds %= DAY;
    var hours = Math.floor(seconds / HOUR);
    seconds %= HOUR;
    var minutes = Math.floor(seconds / MINUTE);
    seconds %= MINUTE;

    var timeString = seconds + 's';
    if (minutes){
        timeString = minutes + 'm ' + timeString;
        if (hours){
            timeString = hours + 'h ' + timeString;
            if (days){
                timeString = days + 'd ' + timeString;
                if (years){
                    timeString = years + 'y ' + timeString;
                }
            }
        }
    }

    return timeString;
};

/**
 *  Converts our compressed JSON structure to the structure required by d3 library
 *      - Extended to fill out tree with "empty" children in order to support rendering of incomplete partitions in d3
 *
 *  (should be called whenever source, filters, or state filters are changed)
 */
var _toTree = function(jsonNode, location) {
    var value = 0;

    $.each(['RUNNABLE', 'BLOCKED', 'TIMED_WAITING', 'WAITING'], function(i, state) {
        if (!isNaN(jsonNode.c[state])) {
            value += jsonNode.c[state];
        }
    });

    var self = this;
    var node = {
        name : jsonNode.n,
        value : value,
        samples : value,
        location : _.isUndefined(location) ? [] : location
    };

    if (jsonNode.a == null) {
        return node;
    }

    node.children = [];
    var childIdx = 0;
    var childSum = 0;

    $.each(jsonNode.a, function(i, child) {
        var childLocation = node.location.slice();
        childLocation.push(childIdx);

        var childTree = _toTree(child, childLocation);
        if (!_.isNull(childTree)) {
            node.children[childIdx++] = childTree;

            childSum += childTree.value;
        }
    });

    if (childSum < node.value){
        var extra = node.value - childSum;

        var fillerNode = {
            name: '',
            value: extra,
            samples: extra,
            opacity: 0
        };

        node.children.push(fillerNode);
    }

    return node;
}

function FlameGraph(container, width) {
    this.width = width;
    this.height = width * FlameGraph.constants.WIDTH_TO_HEIGHT_RATIO;

    this.onSetRootCallback = null;

    $(container).empty();

    this.container = d3.select(container);
    this.svg = d3.select(container)
        .append("svg")
        .attr("width", this.width)
        .attr("height", this.height);

    this.details = $('<div></div>')
        .attr("class", "methodDetails")
        .css("height", "1.5em")
        .appendTo($(container));

    this.tooltip = d3.select('#svTooltip');

    this.profilerResults = $('#profiler-results');

    this.rangeX = d3.scale.linear().range([ 0, this.width ]);
    this.rangeY = d3.scale.linear().range([ 0, this.height ]);

    this.totalSamples = 0;

    this.diffThreshold = 0.01;
};

FlameGraph.constants = {
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
    RX : 4,
    RY : 4,
    TOOLTIP_OFFSET: 3,
    EM_OF_FLAME_BAR: 0.5,
    EM_OF_LABEL_HEIGHT: ".35em"
}

FlameGraph.prototype = {
    clear : function() {
        this.svg.selectAll("*")
                .remove();
        return this;
    },

    render : function(root, diffing) {
      console.time('rendering');
      root = _toTree(root)
      this.totalSamples = root.samples;

      this.recalculateHeight(root);
      this.resetInfoElements();

        var self = this;
        var nodes = this.getPartition(root);

        var diffNodes;
        if (diffing) {
            var diffNodes = nodes.filter(function(d) {
                return self.shouldDivide(d);
            });
            nodes = nodes.filter(function(d) {
                return !self.shouldDivide(d);
            });
        }

        this.svg.selectAll(".flameGraphNode")
            .data(nodes)
            .enter()
            .append("rect")
            .attr("class", "flameGraphNode")
            .attr("width", function(d) {
                return self.rangeX(d.dx);
            })
            .attr("height", function(d) {
                return self.rangeY(d.dy);
            })
            .attr("x", function(d) {
                return self.rangeX(d.x);
            })
            .attr("y", function(d) {
                return self.inverseY(d.y, d.dy);
            })
            .attr("rx", FlameGraph.constants.RX)
            .attr("ry", FlameGraph.constants.RY)
            .attr("fill", function(d) {
                return _.isUndefined(d.color) ? self.getColor(FlameGraph.constants.FLAME_RGB) : d.color;
            })
            .attr("opacity", function(d) {
                return _.isUndefined(d.opacity) ? 1 : d.opacity;
            })
            .on("mouseover", function(d) {
                self.onMouseover(d);
            })
            .on("mousemove", function(d) {
                self.onMousemove();
            })
            .on("mouseout", function(d) {
                self.onMouseout();
            })
            .on("click", function(d) {
                if (!d3.event.defaultPrevented && d.location){
                    self.onSetRootCallback(d.location);
                }
            });

        this.svg.selectAll(".flameGraphLabel")
            .data(nodes.filter(function(d) {
                return d.name && self.rangeX(d.dx) > FlameGraph.constants.MIN_LABEL_WIDTH;
            }))
            .enter()
            .append("text")
            .attr("class", "flameGraphLabel")
            .attr("dy", FlameGraph.constants.EM_OF_LABEL_HEIGHT)
            .attr("x", function(d) {
                return self.rangeX(d.x) + self.rangeX(d.dx) / 2;
            })
            .attr("y", function(d) {
                return self.inverseY(d.y, d.dy) + self.rangeY(d.dy) / 2;
            })
            .text(function(d) {
                return self.getLabelText(d.name, d.dx);
            })
            .on("mouseover", function(d) {
                self.onMouseover(d);
            })
            .on("mousemove", function(d) {
                self.onMousemove();
            })
            .on("mouseout", function(d) {
                self.onMouseout();
            })
            .on("click", function(d) {
                if (!d3.event.defaultPrevented){
                    self.onSetRootCallback(d.location);
                }
            });

        if (diffing) {
            $.each(diffNodes, function(i, d) {
                self.divide(d);
            });
        }

        // Adding ability to Zoom and Pan
        var zoomed = function(){
            self.svg.selectAll(".flameGraphNode").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            self.svg.selectAll(".flameGraphLabel").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            self.svg.selectAll(".flameGraphInnerNode").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            self.svg.selectAll(".flameGraphInnerLabel").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        }

        this.zoom = d3.behavior.zoom()
            .translate([0,0])
            .scale(1)
            .scaleExtent([1,1000])
            .on("zoom", zoomed);

        console.timeEnd('rendering');
    },

    zoomOn: function() {
        this.svg.call(this.zoom);
    },

    zoomOff: function() {
        this.svg.on('.zoom', null);
    },

    zoomReset: function() {
        this.zoom.translate([0,0]).scale(1);

        this.svg.selectAll(".flameGraphNode").attr("transform", "translate(" + this.zoom.translate() + ")scale(" + this.zoom.scale() + ")");
        this.svg.selectAll(".flameGraphLabel").attr("transform", "translate(" + this.zoom.translate() + ")scale(" + this.zoom.scale() + ")");
        this.svg.selectAll(".flameGraphInnerNode").attr("transform", "translate(" + this.zoom.translate() + ")scale(" + this.zoom.scale() + ")");
        this.svg.selectAll(".flameGraphInnerLabel").attr("transform", "translate(" + this.zoom.translate() + ")scale(" + this.zoom.scale() + ")");
    },

    shouldDivide: function(d) {
        return d.diff && (Math.abs(d.diff) / d.samples > this.diffThreshold) || d.samples < d.value * (1 - this.diffThreshold);
    },

    /**
     *  Called if the frame on top is supposed to be bigger than this frame and/or this frame has a diff
     */
    divide: function(outerBoxData) {
        var self = this;

        var rangeX = d3.scale.linear().range([ 0, self.rangeX(outerBoxData.dx) ]);      //  Set range: [0, width-of-outer-box]

        var data = {value: outerBoxData.value, children:[]};

        var emptySpace = outerBoxData.value - outerBoxData.samples;
        var diff = Math.abs(outerBoxData.diff);
        var base = (diff ? outerBoxData.samples - diff : outerBoxData.samples);

        // Push child nodes as needed
        if (base) {
            var baseColor;
            if (diff) {
                baseColor = self.getColor(FlameGraph.constants.EQ_FLAME_RGB);
            } else {
                baseColor = self.getColor(FlameGraph.constants.FLAME_RGB);
            }
            data.children.push({value: base, samples: base, color: baseColor, sign:'', name: outerBoxData.name});
        }
        if (diff) {
            var diffColor, diffSign;
            if (outerBoxData.diff > 0) {
                diffColor = self.getColor(FlameGraph.constants.POS_FLAME_RGB);
                diffSign = '+';
            } else {
                diffColor = self.getColor(FlameGraph.constants.NEG_FLAME_RGB);
                diffSign = '-';
            }
            data.children.push({value: diff, samples: diff, color: diffColor, sign: diffSign, name: outerBoxData.name});
        }
        if (emptySpace) {
            data.children.push({value: emptySpace, samples: emptySpace});
        }

        // (Note that we turn off sorting here)
        var nodes = d3.layout.partition().sort(null).nodes(data);

        /*
         *  Create a new group element for this division to be put in
         */
        var group = this.svg.append('g')
        group.selectAll(".flameGraphInnerNode")
            .data(nodes.filter(function(d) {
                return d.name;
            }))
            .enter()
            .append("rect")
            .attr("class","flameGraphInnerNode")
            .attr("width", function(d) {
                return rangeX(d.dx);
            })
            .attr("height", function(d){
                return self.rangeY(outerBoxData.dy);
            })
            .attr("x", function(d){
                return self.rangeX(outerBoxData.x) + rangeX(d.x);
            })
            .attr("y", function(d){
                return self.inverseY(outerBoxData.y, outerBoxData.dy);
            })
            .attr("rx", FlameGraph.constants.RX)
            .attr("ry", FlameGraph.constants.RY)
            .attr("fill", function(d){
                return d.color;
            })
            .on("mouseover", function(d) {
                self.onMouseover(d);
            })
            .on("mousemove", function(d) {
                self.onMousemove();
            })
            .on("mouseout", function(d) {
                self.onMouseout();
            })
            .on("click", function(d) {
                if (!d3.event.defaultPrevented){
                    self.onSetRootCallback(outerBoxData.location);
                }
            });

        group.selectAll(".flameGraphInnerLabel")
            .data(nodes.filter(function(d) {
                return d.name && rangeX(d.dx) > FlameGraph.constants.MIN_LABEL_WIDTH;
            }))
            .enter()
            .append("text")
            .attr("class", "flameGraphInnerLabel")
            .attr("dy", FlameGraph.constants.EM_OF_LABEL_HEIGHT)
            .attr("x", function(d) {
                return self.rangeX(outerBoxData.x) + rangeX(d.x) + rangeX(d.dx) / 2;
            })
            .attr("y", function(d) {
                return self.inverseY(outerBoxData.y, outerBoxData.dy) + self.rangeY(outerBoxData.dy) / 2;
            })
            .text(function(d) {
                return self.getLabelText(outerBoxData.name, outerBoxData.dx * d.dx);
            })
            .on("mouseover", function(d) {
                self.onMouseover(d);
            })
            .on("mousemove", function(d) {
                self.onMousemove();
            })
            .on("mouseout", function(d) {
                self.onMouseout();
            })
            .on("click", function(d) {
                if (!d3.event.defaultPrevented){
                    self.onSetRootCallback(outerBoxData.location);
                }
            });
    },

    onMouseover: function(d) {
        var numSamples = d.samples;
        var time = convertToTimeString(numSamples);

        var percentOfTotalSamples = (numSamples/(this.totalSamples || 1)*100).toFixed(2);

        this.showDetails(d.name);

        this.tooltip.text(d.name);
        var text = this.tooltip.html();
        text = '<strong>' + text + '</strong><br/>';
        text += '<i>Time: </i>' + (d.sign ? d.sign : '') + time + ' (' + percentOfTotalSamples + '% of graph)';
        this.tooltip.html(text);

        this.updateTooltipPosition();

        this.tooltip.style('opacity', 0.9);

        var tooltipBorderColor;
        switch (d.sign) {
            case '+':
                tooltipBorderColor = FlameGraph.constants.TOOLTIP_BORDER_COLOR_PLUS;
                break;
            case '-':
                tooltipBorderColor = FlameGraph.constants.TOOLTIP_BORDER_COLOR_MINUS;
                break;
            default:
                tooltipBorderColor = FlameGraph.constants.TOOLTIP_BORDER_COLOR_DEFAULT;
        }
        this.tooltip.style('border-color', tooltipBorderColor);
    },

    onMousemove: function() {
        this.updateTooltipPosition();
    },

    onMouseout: function() {
        this.tooltip.text('').style('opacity',null);
    },

    updateTooltipPosition : function() {
        var self = this;

        var x = d3.event.pageX - this.profilerResults.offset().left + FlameGraph.constants.TOOLTIP_OFFSET;
        var y = d3.event.pageY - this.profilerResults.offset().top - parseInt(this.tooltip.style('height'),10) - FlameGraph.constants.TOOLTIP_OFFSET;

      // If the tooltip overflows x-axis, display to the left of pointer instead
        var tooltipWidth = parseInt(this.tooltip.style('width'),10);
        if (x + tooltipWidth > this.profilerResults.width()){
            x = x - tooltipWidth - FlameGraph.constants.TOOLTIP_OFFSET*2;
        }

        if (x < 0) x = 0;
        if (y < 0) y = 0;

        this.tooltip.style('left', x + 'px');
        this.tooltip.style('top', y + 'px');
    },

    showMatches : function(query) {},

    getPartition : function(root) {
        var partition = d3.layout.partition();

        // Sort alphabetically (rather than the default: high to low value)
        partition.sort(function comparator(a,b){ return a.name.localeCompare(b.name); });

        return partition.nodes(root);
    },

    getColor : function(rgb) {
        // generates a random integer between -FLAME_DIFF / 2 and FLAME_DIFF / 2
        var r = Math.round((Math.random() * FlameGraph.constants.FLAME_DIFFERENTIAL) - (FlameGraph.constants.FLAME_DIFFERENTIAL * 0.5));
        var g = Math.round((Math.random() * FlameGraph.constants.FLAME_DIFFERENTIAL) - (FlameGraph.constants.FLAME_DIFFERENTIAL * 0.5));
        var b = Math.round((Math.random() * FlameGraph.constants.FLAME_DIFFERENTIAL) - (FlameGraph.constants.FLAME_DIFFERENTIAL * 0.5));

        return "rgb(" + (rgb[0] + r) + "," + (rgb[1] + g)  + "," + (rgb[2] + b) + ")";
    },

    getLabelText : function(label, dx) {
        if (!label) return "";
        var shortLabel = label;

        if (shortLabel.indexOf(".") != -1) {
            var delimiter = ".";
            var tokens = label.split(delimiter);
            var length = tokens.length;
            shortLabel = [tokens[length - 2], tokens[length - 1]].join(delimiter);
        }

        var ratio = 4;
        var maxLength = Math.round(this.rangeX(dx) / ratio);
        return shortLabel.substr(0, maxLength);
    },

    inverseY : function(y, dy) {
        return this.height - this.rangeY(y) - this.rangeY(dy);
    },

    showDetails : function(name) {
        this.details.text(name);
    },

    resetInfoElements : function() {
        this.details.empty();
        this.tooltip.style('left', this.profilerResults.offset().left + 'px');
        this.tooltip.style('top', this.profilerResults.offset().top + 'px');
    },

    recalculateHeight : function(root) {
        var depth = this.findMaxDepth(root);

        var emSize = parseFloat($("body").css("font-size"));

        this.height = Math.max(Math.round(this.width * FlameGraph.constants.WIDTH_TO_HEIGHT_RATIO),
                                Math.round(depth * FlameGraph.constants.EM_OF_FLAME_BAR * emSize));
        this.svg.attr("height", this.height);
        this.rangeY = d3.scale.linear().range([ 0, this.height ]);
    },

    findMaxDepth : function(node) {
        if (!node){
            return 0;
        }
        if (!node.children){
            return 1;
        }

        var self = this, max = 0;
        $.each(node.children, function(i, child) {
            var depth = self.findMaxDepth(child);
            if (depth > max){
                max = depth;
            }
        });

        return 1 + max;
    }
};
