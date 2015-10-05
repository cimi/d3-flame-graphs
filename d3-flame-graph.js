(function() {
  var d3;

  d3 = window.d3;

  if (!d3) {
    throw new Error("d3.js needs to be loaded");
  }

  d3.flameGraph = function() {
    var FlameGraph;
    FlameGraph = (function() {
      var getClassAndMethodName;

      function FlameGraph() {
        this._generateAccessors(['size', 'margin', 'cellHeight', 'breadcrumbs', 'tooltip', 'colors']);
        this._allData = [];
        this._size = [1200, 800];
        this._cellHeight = 10;
        this._margin = {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        };
        this._colors = ['rgb(255,255,178)', 'rgb(254,204,92)', 'rgb(253,141,60)', 'rgb(240,59,32)', 'rgb(189,0,38)'];
      }

      FlameGraph.prototype.data = function(data) {
        if (!data) {
          return this._data;
        }
        this._allData.push(data);
        this.totalSamples = data.samples;
        this._data = d3.layout.partition().sort(function(a, b) {
          return a.name.localeCompare(b.name);
        }).nodes(data);
        return this;
      };

      FlameGraph.prototype.width = function() {
        return this.size()[0] - (this.margin().left + this.margin().right);
      };

      FlameGraph.prototype.height = function() {
        return this.size()[1] - (this.margin().top + this.margin().bottom);
      };

      FlameGraph.prototype.label = function(d) {
        var label;
        if (!(d != null ? d.name : void 0)) {
          return "";
        }
        label = getClassAndMethodName(d.name);
        return label.substr(0, Math.round(this.x(d.dx) / 4));
      };

      FlameGraph.prototype.color = function(d) {
        return this.colors()[Math.floor(Math.random() * this.colors().length)];
      };

      getClassAndMethodName = function(fqdn) {
        var tokens;
        tokens = fqdn.split(".");
        return tokens.slice(tokens.length - 2).join(".");
      };

      FlameGraph.prototype.render = function(selector) {
        console.time('render');
        this._selector = selector;
        d3.select(selector).select('svg').remove();
        this.container = d3.select(selector).append('svg').attr('width', this.size()[0]).attr('height', this.size()[1]).style('border', '1px solid #0e0e0e').append('g').attr('transform', "translate(" + (this.margin().left) + ", " + (this.margin().top) + ")");
        this.maxCells = Math.floor(this.height() / this.cellHeight());
        this.maxDepth = this.data()[0].maxDepth;
        this.x = d3.scale.linear().domain([
          0, d3.max(this.data(), function(d) {
            return d.x + d.dx;
          })
        ]).range([0, this.width()]);
        this.y = d3.scale.quantize().domain([
          d3.max(this.data(), function(d) {
            return d.y;
          }), 0
        ]).range(d3.range(this.maxDepth).map((function(_this) {
          return function(cell) {
            return (cell - _this.maxDepth + _this.maxCells) * _this.cellHeight();
          };
        })(this)));
        this.container.selectAll('.node').data(this.data().filter((function(_this) {
          return function(d) {
            return _this.x(d.dx) > 0.1 && _this.y(d.y) >= 0 && d.type !== 'filler';
          };
        })(this))).enter().append('rect').attr('class', 'node').attr('width', (function(_this) {
          return function(d) {
            return _this.x(d.dx);
          };
        })(this)).attr('height', (function(_this) {
          return function(d) {
            return _this.cellHeight() - 2;
          };
        })(this)).attr('x', (function(_this) {
          return function(d) {
            return _this.x(d.x);
          };
        })(this)).attr('y', (function(_this) {
          return function(d) {
            return _this.y(d.y);
          };
        })(this)).attr('stroke', this.colors()[this.colors().length - 1]).attr('fill', (function(_this) {
          return function(d) {
            return _this.color(d);
          };
        })(this)).attr('fill-opacity', '0.8');
        this.container.selectAll('.label').data(this.data().filter((function(_this) {
          return function(d) {
            return d.name && _this.x(d.dx) > 40;
          };
        })(this))).enter().append('text').attr('class', 'label').attr('text-anchor', 'middle').attr('dy', '.25em').attr('x', (function(_this) {
          return function(d) {
            return _this.x(d.x) + _this.x(d.dx) / 2;
          };
        })(this)).attr('y', (function(_this) {
          return function(d) {
            return _this.y(d.y) + _this.cellHeight() / 2;
          };
        })(this)).text((function(_this) {
          return function(d) {
            return _this.label(d);
          };
        })(this));
        console.timeEnd('render');
        console.log("Rendered " + (this.container.selectAll('.node')[0].length) + " elements");
        if (this.breadcrumbs()) {
          this._enableNavigation()._renderBreadcrumbs();
        }
        if (this.tooltip()) {
          this._renderTooltip();
        }
        return this;
      };

      FlameGraph.prototype._renderTooltip = function() {
        this.tip = d3.tip().attr('class', 'd3-tip').html((function(_this) {
          return function(d) {
            return d.name + " <br /><br />" + d.totalTime + " run time<br />" + (((d.samples / _this.totalSamples) * 100).toFixed(2)) + "% of total";
          };
        })(this)).direction((function(_this) {
          return function(d) {
            if (_this.x(d.x) + _this.x(d.dx) / 2 > _this.width() - 100) {
              return 'w';
            }
            if (_this.x(d.x) + _this.x(d.dx) / 2 < 100) {
              return 'e';
            }
            if (_this.y(d.y) < 100) {
              return 's';
            }
            return 'n';
          };
        })(this)).offset([-this.cellHeight() / 2, 0]);
        this.container.call(this.tip);
        this.container.selectAll('.node').on('mouseover', this.tip.show).on('mouseout', this.tip.hide);
        this.container.selectAll('.label').on('mouseover', this.tip.show).on('mouseout', this.tip.hide);
        return this;
      };

      FlameGraph.prototype._renderBreadcrumbs = function() {
        var breadcrumbData, breadcrumbs;
        breadcrumbData = this._allData.map(function(prevData, idx) {
          return {
            name: prevData.name,
            value: idx
          };
        });
        breadcrumbs = d3.select(this.breadcrumbs()).selectAll('li').data(breadcrumbData);
        breadcrumbs.enter().append('li').append('a').attr('title', function(d) {
          return d.name;
        }).text(function(d) {
          return getClassAndMethodName(d.name);
        }).on('click', (function(_this) {
          return function(breadcrumb) {
            var displayed, idx;
            idx = breadcrumb.value;
            displayed = _this._allData[idx];
            _this._allData = _this._allData.slice(0, idx);
            return _this.data(displayed).render(_this._selector);
          };
        })(this));
        breadcrumbs.exit().remove();
        return this;
      };

      FlameGraph.prototype._enableNavigation = function() {
        this.container.selectAll('.node').on('click', (function(_this) {
          return function(d) {
            return _this.data(d).render(_this._selector);
          };
        })(this));
        this.container.selectAll('.label').on('click', (function(_this) {
          return function(d) {
            return _this.data(d).render(_this._selector);
          };
        })(this));
        return this;
      };

      FlameGraph.prototype._generateAccessors = function(accessors) {
        var accessor, i, len, results;
        results = [];
        for (i = 0, len = accessors.length; i < len; i++) {
          accessor = accessors[i];
          results.push(this[accessor] = (function(accessor) {
            return function(newValue) {
              if (!arguments.length) {
                return this["_" + accessor];
              }
              this["_" + accessor] = newValue;
              return this;
            };
          })(accessor));
        }
        return results;
      };

      return FlameGraph;

    })();
    return new FlameGraph();
  };

}).call(this);
