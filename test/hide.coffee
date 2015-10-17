require('coffee-script/register');
path    = require('path')
exec    = require('child_process').exec
d3      = require('d3')
chai    = require('chai')
expect  = chai.expect
chai.use(require('chai-things'))

# the flame graph plugin does not have an exporter
# as it augments the existing d3 object
require('../src/d3-flame-graph')

describe 'd3.flameGraph.hide', ->
  data = null
  describe 'when hiding nodes', ->
    beforeEach (done) ->
      data = require('../demo/data/profile-test.json')
      data = d3.flameGraphUtils.augment(data)
      d3.flameGraphUtils.partition(data)
      done()

    it 'should reset the target node values to 0', ->
      target = [data.children[1].children[0]]
      d3.flameGraphUtils.hide(target)
      expect(target[0]).to.have.property('value', 0)

    it 'should subtract value from all parents', ->
      d3.flameGraphUtils.hide([data.children[1].children[0]])
      expect(data).to.have.property('value', 60)
      expect(data.children[1]).to.have.property('value', 20)

    it 'should make the value of all children 0', ->

    it 'should preserve the original value of parents', ->

    it 'should preserve the original value of children', ->

    it 'should store the hidden value in a list', ->

  describe 'when unhiding nodes', ->
